import { prisma } from '../index';
import { classifyEvent } from './rules';
import { dispatchNotifications, dispatchCostAlert } from './notifier';
import { setCollectResult } from './collector-state';

// ─── AWS ──────────────────────────────────────────────────────────
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';

async function collectAWS(account: { id: string; credentials: any; region?: string }): Promise<{ events: number }> {
  const creds = typeof account.credentials === 'string' ? JSON.parse(account.credentials) : account.credentials;
  const region = account.region || 'us-east-1';
  let events = 0;
  const createdEvents: { severity: string; type: string; description: string; accountId: string }[] = [];

  try {
    // ── CloudTrail Events ──
    const trail = new CloudTrailClient({
      region,
      credentials: { accessKeyId: creds.accessKeyId || '', secretAccessKey: creds.secretAccessKey || '' },
    });

    const lastEvent = await prisma.event.findFirst({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });

    const startTime = lastEvent ? new Date(lastEvent.createdAt.getTime() - 60000) : new Date(Date.now() - 3600000);
    const endTime = new Date();

    const cmd = new LookupEventsCommand({
      StartTime: startTime,
      EndTime: endTime,
      MaxResults: 50,
    });

    const response = await trail.send(cmd);

    if (response.Events) {
      for (const evt of response.Events) {
        const eventTime = evt.EventTime || new Date();
        const eventName = evt.EventName || 'Unknown';
        const username = evt.Username || 'N/A';
        const resources = evt.Resources?.map((r: any) => r.ResourceName).filter(Boolean).join(', ') || '';

        // Map AWS event names to our severity system
        let severity: string = 'LOW';
        let eventType: string = 'CONFIG_CHANGE';
        const name = eventName.toUpperCase();

        if (name.includes('DELETE') || name.includes('TERMINATE')) {
          severity = 'CRITICAL'; eventType = 'POLICY_VIOLATION';
        } else if (name.includes('CREATE') || name.includes('PUT') || name.includes('UPDATE')) {
          severity = 'HIGH'; eventType = 'PERMISSION_CHANGE';
        } else if (name.includes('MODIFY') || name.includes('CHANGE') || name.includes('ASSOCIATE')) {
          severity = 'MEDIUM'; eventType = 'CONFIG_CHANGE';
        } else if (name.includes('LOGIN') || name.includes('CONSOLE')) {
          severity = 'LOW'; eventType = 'LOGIN_SUCCESS';
        }

        // Check if event already exists (dedup by time + event name)
        const exists = await prisma.event.findFirst({
          where: { accountId: account.id, type: eventType, createdAt: eventTime, description: eventName },
        });

        if (!exists) {
          await prisma.event.create({
            data: {
              accountId: account.id,
              provider: 'AWS',
              type: eventType,
              severity: severity as any,
              description: `${eventName} - ${username} ${resources ? '(' + resources + ')' : ''}`,
              metadata: { source: 'AWS CloudTrail', eventName, username, resources },
              createdAt: eventTime,
            },
          });
          events++;
        }
      }
    }
  } catch (err: any) {
    if (!err.message?.includes('AccessDenied')) {
      console.error(`AWS CloudTrail error for ${account.id}:`, err.message);
    }
  }

  await prisma.account.update({ where: { id: account.id }, data: { health: 'healthy', status: 'connected' } });
  return { events };
}

// ─── AWS Cost Collection (separada del polling de eventos) ──────
async function collectCostsForAccount(account: { id: string; credentials: any; region?: string }): Promise<{ services: number; error?: string }> {
  const creds = typeof account.credentials === 'string' ? JSON.parse(account.credentials) : account.credentials;
  const region = account.region || 'us-east-1';
  let services = 0;

  try {
    const ce = new CostExplorerClient({
      region,
      credentials: { accessKeyId: creds.accessKeyId || '', secretAccessKey: creds.secretAccessKey || '' },
    });

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const costCmd = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate.toISOString().slice(0, 10),
        End: endDate.toISOString().slice(0, 10),
      },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    });

    const costResp = await ce.send(costCmd);

    if (costResp.ResultsByTime) {
      for (const period of costResp.ResultsByTime) {
        for (const group of period.Groups || []) {
          const service = group.Keys?.[0] || 'Unknown';
          const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
          if (amount > 0) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO costs (id, account_id, service, amount, currency, period, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3::numeric, 'USD', $4, NOW())
               ON CONFLICT (account_id, service, period)
               DO UPDATE SET amount = EXCLUDED.amount, created_at = NOW()`,
              account.id, service, parseFloat(amount.toFixed(2)), period.TimePeriod?.Start?.slice(0, 7) || ''
            );
            services++;
          }
        }
      }
    }
  } catch (err: any) {
    if (!err.message?.includes('AccessDenied')) {
      console.error(`AWS Cost Explorer error for ${account.id}:`, err.message);
      return { services, error: err.message };
    }
  }

  return { services };
}

export async function collectAllCosts(): Promise<{ accounts: number; categories: number }> {
  const accounts = await prisma.account.findMany({ where: { status: 'active', provider: 'AWS' } });
  let totalCategories = 0;

  for (const account of accounts) {
    try {
      const result = await collectCostsForAccount(account);
      totalCategories += result.services;
      if (result.error) {
        console.error(`[CostCollector] Error for ${account.id}:`, result.error);
      }
    } catch (err: any) {
      console.error(`[CostCollector] Fatal for ${account.id}:`, err.message);
    }
  }

  console.log(`[CostCollector] Collected costs from ${accounts.length} AWS accounts, ${totalCategories} service categories`);
  return { accounts: accounts.length, categories: totalCategories };
}

// ─── Azure ──────────────────────────────────────────────────────────
async function collectAzure(account: { id: string; credentials: any }): Promise<{ events: number }> {
  let events = 0;
  const createdEvents: { severity: string; type: string; description: string; accountId: string }[] = [];
  try {
    const creds = typeof account.credentials === 'string' ? JSON.parse(account.credentials) : account.credentials;
    const { tenantId, clientId, clientSecret, subscriptionId } = creds;

    if (!tenantId || !clientId || !clientSecret || !subscriptionId) return { events: 0 };

    // Azure REST API for Activity Logs
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://management.azure.com/.default',
        grant_type: 'client_credentials',
      }),
    });
    const tokenData: any = await tokenResp.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return { events: 0 };

    const lastEvent = await prisma.event.findFirst({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });

    const filter = lastEvent
      ? `eventTimestamp ge ${lastEvent.createdAt.toISOString()}`
      : `eventTimestamp ge ${new Date(Date.now() - 7*86400000).toISOString()}`;

    const activityUrl = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Insights/eventtypes/management/values?api-version=2015-04-01&$filter=${encodeURIComponent(filter)}&$top=50`;
    const activityResp = await fetch(activityUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (activityResp.ok) {
      const activityData: any = await activityResp.json();
      for (const evt of activityData.value || []) {
        const eventTime = new Date(evt.eventTimestamp);
        const opName = evt.operationName?.value || evt.operationName?.localizedValue || 'Unknown';
        const status = evt.status?.value || 'Unknown';
        const caller = evt.caller || 'N/A';

        let severity = 'LOW';
        let eventType = 'CONFIG_CHANGE';
        const op = opName.toUpperCase();
        if (op.includes('DELETE') || status === 'Failed') {
          severity = 'CRITICAL'; eventType = 'POLICY_VIOLATION';
        } else if (op.includes('CREATE') || op.includes('WRITE')) {
          severity = 'HIGH'; eventType = 'PERMISSION_CHANGE';
        } else if (op.includes('ACTION')) {
          severity = 'MEDIUM'; eventType = 'CONFIG_CHANGE';
        }

        const exists = await prisma.event.findFirst({
          where: { accountId: account.id, createdAt: eventTime, description: opName },
        });

        if (!exists) {
          await prisma.event.create({
            data: {
              accountId: account.id,
              provider: 'AZURE',
              type: eventType,
              severity: severity as any,
              description: `${opName} - ${caller} [${status}]`,
              metadata: { source: 'Azure Activity Log', operation: opName, caller, status },
              createdAt: eventTime,
            },
          });
          events++;
        }
      }
    }
  } catch (err: any) {
    console.error(`Azure collect error for ${account.id}:`, err.message);
  }

  await prisma.account.update({ where: { id: account.id }, data: { health: 'healthy' } });
  return { events };
}

// ─── M365 ──────────────────────────────────────────────────────────
async function collectM365(account: { id: string; credentials: any }): Promise<{ events: number }> {
  let events = 0;
  const createdEvents: { severity: string; type: string; description: string; accountId: string }[] = [];
  try {
    const creds = typeof account.credentials === 'string' ? JSON.parse(account.credentials) : account.credentials;
    const { tenantId, clientId, clientSecret } = creds;
    if (!tenantId || !clientId || !clientSecret) return { events: 0 };

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });
    const tokenData: any = await tokenResp.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return { events: 0 };

    const auditUrl = 'https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?$top=50&$orderby=activityDateTime desc';
    const auditResp = await fetch(auditUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (auditResp.ok) {
      const auditData: any = await auditResp.json();
      for (const entry of auditData.value || []) {
        const eventTime = new Date(entry.activityDateTime);
        const activity = entry.activityDisplayName || 'Unknown';
        const user = entry.initiatedBy?.user?.userPrincipalName || 'N/A';
        const result = entry.result || 'success';

        let severity = 'LOW';
        let eventType = 'CONFIG_CHANGE';
        const act = activity.toUpperCase();
        if (act.includes('DELETE') || result === 'fail') {
          severity = 'CRITICAL'; eventType = 'POLICY_VIOLATION';
        } else if (act.includes('ADD') || act.includes('CREATE') || act.includes('ASSIGN')) {
          severity = 'HIGH'; eventType = 'PERMISSION_CHANGE';
        } else if (act.includes('UPDATE') || act.includes('CHANGE')) {
          severity = 'MEDIUM'; eventType = 'CONFIG_CHANGE';
        }

        const exists = await prisma.event.findFirst({
          where: { accountId: account.id, createdAt: eventTime, description: activity },
        });

        if (!exists) {
          await prisma.event.create({
            data: {
              accountId: account.id,
              provider: 'M365',
              type: eventType,
              severity: severity as any,
              description: `${activity} - ${user}`,
              metadata: { source: 'M365 Audit Log', activity, user, result },
              createdAt: eventTime,
            },
          });
          events++;
        }
      }
    }
  } catch (err: any) {
    console.error(`M365 collect error for ${account.id}:`, err.message);
  }

  await prisma.account.update({ where: { id: account.id }, data: { health: 'healthy' } });
  return { events };
}

// ─── Main Collector ──────────────────────────────────────────────
export async function collectAllAccounts(): Promise<{ accounts: number; totalEvents: number }> {
  const allEvents: { severity: string; type: string; description: string; accountId: string }[] = [];
  const accounts = await prisma.account.findMany({ where: { status: 'active' } });
  let totalEvents = 0;

  for (const account of accounts) {
    try {
      if (account.provider === 'AWS') {
        const result = await collectAWS(account);
        totalEvents += result.events;
      } else if (account.provider === 'AZURE') {
        const result = await collectAzure(account);
        totalEvents += result.events;
      } else if (account.provider === 'M365') {
        const result = await collectM365(account);
        totalEvents += result.events;
      }
    } catch (err: any) {
      console.error(`Collect error for ${account.id}:`, err.message);
      await prisma.account.update({
        where: { id: account.id },
        data: { health: 'critical' },
      });
    }
  }

  return { accounts: accounts.length, totalEvents };
}

// ─── Start Background Polling ──────────────────────────────────
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startPolling(intervalMinutes: number = 20) {
  if (pollInterval) clearInterval(pollInterval);
  
  // Run immediately on start
  collectAllAccounts().then(r => {
      setCollectResult(r);
    console.log(`[Collector] Initial run: ${r.accounts} accounts, ${r.totalEvents} new events`);
  });

  pollInterval = setInterval(async () => {
    try {
      const result = await collectAllAccounts();
      if (result.totalEvents > 0) {
        console.log(`[Collector] Poll: ${result.totalEvents} new events from ${result.accounts} accounts`);
      }
    } catch (err: any) {
      console.error('[Collector] Poll error:', err.message);
    }
  }, intervalMinutes * 60 * 1000);

  console.log(`[Collector] Started polling every ${intervalMinutes} minutes`);
}

export function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

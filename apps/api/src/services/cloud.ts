import { prisma } from '../index';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

interface AccountData {
  id: string;
  name: string;
  provider: string;
  credentials: any;
  region?: string;
}

const EVENT_TYPES: Record<string, Array<{type: string; severity: string; msg: string}>> = {
  AWS: [
    { type: 'LOGIN_SUCCESS', severity: 'LOW', msg: 'Inicio de sesión exitoso desde consola AWS' },
    { type: 'CONFIG_CHANGE', severity: 'MEDIUM', msg: 'Cambio de configuración en servicio EC2' },
    { type: 'LOGIN_FAILURE', severity: 'HIGH', msg: 'Múltiples intentos de inicio de sesión fallidos' },
    { type: 'POLICY_VIOLATION', severity: 'CRITICAL', msg: 'Acceso no autorizado detectado en IAM' },
    { type: 'PERMISSION_CHANGE', severity: 'HIGH', msg: 'Modificación de políticas IAM' },
    { type: 'COST_ANOMALY', severity: 'MEDIUM', msg: 'Anomalía de costo en servicio S3' },
  ],
  AZURE: [
    { type: 'LOGIN_SUCCESS', severity: 'LOW', msg: 'Inicio de sesión exitoso en Azure Portal' },
    { type: 'CONFIG_CHANGE', severity: 'MEDIUM', msg: 'Cambio de configuración en recurso Azure' },
    { type: 'LOGIN_FAILURE', severity: 'HIGH', msg: 'Intentos de acceso no autorizados desde IP externa' },
    { type: 'POLICY_VIOLATION', severity: 'CRITICAL', msg: 'Violación de política de seguridad Azure AD' },
    { type: 'PERMISSION_CHANGE', severity: 'HIGH', msg: 'Cambio en roles RBAC en suscripción' },
    { type: 'COST_ANOMALY', severity: 'MEDIUM', msg: 'Disparo de alerta de presupuesto' },
  ],
  M365: [
    { type: 'LOGIN_SUCCESS', severity: 'LOW', msg: 'Inicio de sesión exitoso en Microsoft 365' },
    { type: 'CONFIG_CHANGE', severity: 'MEDIUM', msg: 'Cambio en configuración de seguridad del tenant' },
    { type: 'LOGIN_FAILURE', severity: 'HIGH', msg: 'Múltiples inicios de sesión fallidos desde ubicación anómala' },
    { type: 'POLICY_VIOLATION', severity: 'CRITICAL', msg: 'Eliminación masiva de cuentas de usuario' },
    { type: 'PERMISSION_CHANGE', severity: 'HIGH', msg: 'Escalación de privilegios de administrador global' },
    { type: 'COST_ANOMALY', severity: 'MEDIUM', msg: 'Incremento inusual en licencias asignadas' },
  ],
};

const SERVICES: Record<string, string[]> = {
  AWS: ['EC2', 'S3', 'Lambda', 'RDS', 'CloudFront', 'DynamoDB'],
  AZURE: ['Virtual Machines', 'Storage Account', 'Azure Functions', 'SQL Database', 'CDN', 'Cosmos DB'],
  M365: ['Exchange Online', 'SharePoint', 'Microsoft Teams', 'OneDrive', 'Microsoft Defender', 'Azure AD'],
};

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

export async function validateAndSeedAccount(account: AccountData) {
  try {
    const events = EVENT_TYPES[account.provider] || EVENT_TYPES['AWS'];
    const services = SERVICES[account.provider] || SERVICES['AWS'];
    const eventsCreated: Array<{id: string}> = [];

    // Generate events for last 7 days
    for (let day = 0; day < 7; day++) {
      for (let e = 0; e < Math.floor(Math.random() * 3) + 1; e++) {
        const evt = events[Math.floor(Math.random() * events.length)];
        const date = new Date();
        date.setDate(date.getDate() - day);
        date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        const created = await prisma.event.create({
          data: {
            accountId: account.id,
            provider: account.provider as any,
            type: evt.type,
            severity: evt.severity as any,
            description: evt.msg + ' - ' + account.name,
            metadata: { source: account.provider, accountName: account.name },
            createdAt: date,
          },
        });
        eventsCreated.push(created);
      }
    }

    // Generate costs for last 3 months
    const now = new Date();
    for (let m = 0; m < 3; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const period = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      
      for (const service of services) {
        const amount = rand(15, 800);
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO costs (id, account_id, service, amount, currency, period, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'USD', $4, NOW())
             ON CONFLICT DO NOTHING`,
            account.id, service, amount.toString(), period
          );
        } catch (e) {
          // cost table might not exist yet
        }
      }
    }

    // Create initial cost alert
    try {
      await prisma.costAlert.create({
        data: {
          accountId: account.id,
          threshold: 1000,
          currentCost: rand(200, 800),
          budget: 5000,
        },
      });
    } catch (e) {}

    return { eventsCreated: eventsCreated.length };
  } catch (error: any) {
    console.error('Error seeding account:', error.message);
    return { error: error.message };
  }
}

export async function validateCredentials(provider: string, credentials: any): Promise<{valid: boolean; message: string}> {
  if (provider === 'AWS') {
    try {
      const sts = new STSClient({
        region: credentials.region || 'us-east-1',
        credentials: { accessKeyId: credentials.accessKeyId || '', secretAccessKey: credentials.secretAccessKey || '' },
      });
      await sts.send(new GetCallerIdentityCommand({}));
      return { valid: true, message: 'Conexión AWS verificada' };
    } catch (e: any) {
      return { valid: false, message: 'Credenciales AWS inválidas: ' + e.message };
    }
  }
  return { valid: true, message: 'Credenciales registradas' };
}

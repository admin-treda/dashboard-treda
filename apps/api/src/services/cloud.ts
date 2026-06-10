/**
 * Cloud service — credential validation only.
 * 
 * NOTE: validateAndSeedAccount() has been removed.
 * It generated RANDOM fake events and costs which violates
 * the primary rule: NEVER invent data for a security dashboard.
 * 
 * Real data should come from the collector service (collector.ts)
 * which polls AWS CloudTrail, Azure Activity Logs, and M365 Audit Logs.
 */

import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

export async function validateCredentials(provider: string, credentials: any): Promise<{ valid: boolean; message: string }> {
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
  // Azure and M365 validated at collection time
  return { valid: true, message: 'Credenciales registradas' };
}

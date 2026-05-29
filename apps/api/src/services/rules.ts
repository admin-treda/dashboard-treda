// Reglas de clasificación inteligente de eventos
// Convierte eventos genéricos de CloudTrail/Activity Log en severidades reales

type Rule = {
  pattern: RegExp;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  label: string;
};

const rules: Rule[] = [
  // ─── CRÍTICO ───────────────────────────────────────────
  { pattern: /root.*login|login.*root|root.*access/i, severity: 'CRITICAL', label: 'Acceso root detectado' },
  { pattern: /password.*change|change.*password|credential.*modify/i, severity: 'CRITICAL', label: 'Cambio de contraseña' },
  { pattern: /delete.*user|delete.*role|delete.*policy/i, severity: 'CRITICAL', label: 'Eliminación de recurso IAM' },
  { pattern: /mfa.*disable|disable.*mfa/i, severity: 'CRITICAL', label: 'MFA deshabilitado' },
  { pattern: /CreateUser|CreateAccessKey/i, severity: 'CRITICAL', label: 'Creación de usuario IAM' },
  { pattern: /PutRolePolicy|AttachRolePolicy|AttachUserPolicy/i, severity: 'CRITICAL', label: 'Cambio en políticas IAM' },
  { pattern: /DeleteDBInstance|DeleteCluster/i, severity: 'CRITICAL', label: 'Eliminación de base de datos' },
  { pattern: /authorization.*fail|unauthorized|access.*denied|AuthenticationFailed/i, severity: 'CRITICAL', label: 'Intento de acceso no autorizado' },

  // ─── ALTO ──────────────────────────────────────────────
  { pattern: /CreateSecurityGroup|AuthorizeSecurityGroup|RevokeSecurityGroup/i, severity: 'HIGH', label: 'Cambio en firewall' },
  { pattern: /ModifyInstance|RunInstances|TerminateInstances/i, severity: 'HIGH', label: 'Cambio en instancias EC2' },
  { pattern: /Create.*Bucket|Delete.*Bucket|PutBucketPolicy/i, severity: 'HIGH', label: 'Cambio en S3' },
  { pattern: /CreateKey|DisableKey|ScheduleKeyDeletion/i, severity: 'HIGH', label: 'Cambio en claves KMS' },
  { pattern: /UpdateRole|CreateRole|DeleteRole/i, severity: 'HIGH', label: 'Cambio en roles IAM' },
  { pattern: /PutBucketPublicAccessBlock|UpdateAccountPasswordPolicy/i, severity: 'HIGH', label: 'Cambio en seguridad' },
  { pattern: /MicrosoftAuthenticationLogger|UserLoggedIn|Sign-in/i, severity: 'HIGH', label: 'Inicio de sesión' },
  { pattern: /AssignRole|RemoveRole|Assigned to|Unassigned/i, severity: 'HIGH', label: 'Asignación de roles' },

  // ─── MEDIO ─────────────────────────────────────────────
  { pattern: /Update.*Config|Put.*Config|Modify.*Config/i, severity: 'MEDIUM', label: 'Cambio de configuración' },
  { pattern: /Create.*Function|UpdateFunction|DeleteFunction/i, severity: 'MEDIUM', label: 'Cambio en funciones' },
  { pattern: /Create.*Table|UpdateTable|DeleteTable/i, severity: 'MEDIUM', label: 'Cambio en tablas' },
  { pattern: /TagResource|UntagResource/i, severity: 'MEDIUM', label: 'Cambio en etiquetas' },
  { pattern: /Create.*Snapshot|Restore.*Snapshot/i, severity: 'MEDIUM', label: 'Snapshot creado/restaurado' },
  { pattern: /GetSecretValue|PutSecretValue/i, severity: 'MEDIUM', label: 'Acceso a secrets manager' },
];

export function classifyEvent(type: string, description: string): { severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; label: string } {
  const combined = `${type} ${description}`;

  for (const rule of rules) {
    if (rule.pattern.test(combined)) {
      return { severity: rule.severity, label: rule.label };
    }
  }

  // Default classification
  if (type.includes('DELETE') || type.includes('TERMINATE')) {
    return { severity: 'HIGH', label: 'Eliminación de recurso' };
  }
  if (type.includes('CREATE') || type.includes('WRITE') || type.includes('PUT')) {
    return { severity: 'MEDIUM', label: 'Creación/modificación' };
  }
  if (type === 'AssumeRole' || type === 'CONFIG_CHANGE') {
    return { severity: 'LOW', label: type === 'AssumeRole' ? 'Rol asumido' : 'Cambio de configuración' };
  }

  return { severity: 'LOW', label: 'Evento informativo' };
}

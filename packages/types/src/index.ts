export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  name: string;
  provider: AccountProvider;
  tenantId: string;
  credentials?: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  accountId: string;
  type: EventType;
  severity: Severity;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: NotificationChannelType;
  config: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostAlert {
  id: string;
  accountId: string;
  threshold: number;
  currentSpend: number;
  currency: string;
  severity: Severity;
  triggeredAt: Date;
  resolvedAt?: Date;
}

export interface Report {
  id: string;
  accountId: string;
  name: string;
  type: 'COST' | 'USAGE' | 'SECURITY' | 'AUDIT';
  periodStart: Date;
  periodEnd: Date;
  data: Record<string, unknown>;
  createdAt: Date;
}

export type AccountProvider = 'AWS' | 'AZURE' | 'M365';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EventType =
  | 'LOGIN_FAILURE'
  | 'LOGIN_SUCCESS'
  | 'PASSWORD_CHANGE'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'POLICY_VIOLATION'
  | 'COST_ANOMALY'
  | 'PERMISSION_CHANGE'
  | 'SUSPICIOUS_ACTIVITY'
  | 'DATA_EXFILTRATION'
  | 'CONFIG_CHANGE';

export type NotificationChannelType = 'SMTP' | 'TELEGRAM';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: Date;
  durationMs: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

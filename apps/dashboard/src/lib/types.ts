// ── Shared TypeScript interfaces for Dashboard Treda ─────────

export interface User {
  id: string
  name: string
  email: string
  username: string
  role: 'admin' | 'analyst' | 'viewer'
  mfaEnabled: boolean
  createdAt?: string
}

export interface Account {
  id: string
  name: string
  provider: 'AWS' | 'AZURE' | 'M365'
  status: 'active' | 'inactive' | 'suspended'
  health: 'healthy' | 'warning' | 'critical'
  region?: string
  createdAt: string
}

export interface SecurityEvent {
  id: string
  accountId: string
  account?: Account
  provider: 'AWS' | 'AZURE' | 'M365'
  type: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  metadata: Record<string, any>
  username?: string
  createdAt: string
}

export interface Cost {
  id: string
  accountId: string
  account?: Account
  service: string
  amount: number
  currency: string
  period: string
  createdAt: string
}

export interface CostAlert {
  id: string
  accountId: string
  threshold: number
  currentCost: number
  budget: number
  notified: boolean
}

export interface CostSummary {
  total: number
  byAccount: Record<string, number>
  byService: Record<string, number>
  byAccountService: Record<string, Record<string, number>>
  totalByMonth: Record<string, number>
}

export interface PentestScan {
  id: string
  url: string
  userId?: string
  username?: string
  status: 'pending' | 'queued' | 'running' | 'completed' | 'error' | 'cancelled'
  profile: string
  phase: string
  phaseLabel: string
  progress: number
  startedAt: string
  finishedAt?: string
  error?: string
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    info: number
    tools: Record<string, number>
  }
  results?: PentestResult[]
  technologies?: any[]
  discoveredUrls?: string[]
  phases?: any[]
}

export interface PentestResult {
  id: string
  scanId: string
  template: string
  name: string
  severity: string
  tool: string
  type: string
  host: string
  matchedAt: string
  description: string
  reference: string[]
  tags: string[]
  curl: string
  request: string
  response: string
  status: 'open' | 'remediated' | 'accepted' | 'false-positive'
  createdAt: string
}

export interface PentestTarget {
  id: string
  name: string
  url: string
  tags: string[]
  authType?: string
  authValue?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Report {
  id: string
  type: 'DAILY' | 'WEEKLY'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  data: Record<string, any>
  periodStart?: string
  periodEnd?: string
  generatedAt: string
  createdAt: string
}

export interface NewsArticle {
  id: string
  title: string
  description: string
  url: string
  source: string
  category: string
  publishedAt: string
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  userId?: string
  username: string
  action: string
  resource: string
  detail?: Record<string, any>
  ip?: string
  userAgent?: string
  createdAt: string
}

export interface NotificationChannel {
  id: string
  type: 'SMTP' | 'TELEGRAM'
  name: string
  config: Record<string, any>
  enabled: boolean
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

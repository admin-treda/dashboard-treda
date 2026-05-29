import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function getSeverityColor(severity: 'critical' | 'high' | 'medium' | 'low') {
  const colors = {
    critical: 'text-critical bg-critical/10 border-critical/20',
    high: 'text-high bg-high/10 border-high/20',
    medium: 'text-medium bg-medium/10 border-medium/20',
    low: 'text-low bg-low/10 border-low/20',
  }
  return colors[severity] || colors.low
}

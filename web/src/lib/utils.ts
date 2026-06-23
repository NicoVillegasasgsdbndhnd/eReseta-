import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a peso amount with thousands grouping and exactly 2 decimals (money is always shown to
 * the centavo, e.g. 1500 → "₱1,500.00", 1500.5 → "₱1,500.50"). Returns null for empty/invalid
 * input so callers can fall back to a placeholder.
 */
export function formatPeso(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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

/** Human-readable file size: B under 1 KB, whole KB under 1 MB, else MB with one decimal. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

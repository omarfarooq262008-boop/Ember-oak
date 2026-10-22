/**
 * Build-time portfolio / demo flags (VITE_* only — never secrets).
 */

export function isDemoMode(): boolean {
  return (import.meta.env.VITE_DEMO_MODE as string | undefined)?.trim() === 'true'
}

/** When true, every page gets robots noindex (optional; default off). */
export function isDemoNoindex(): boolean {
  return (
    (import.meta.env.VITE_DEMO_NOINDEX as string | undefined)?.trim() === 'true'
  )
}

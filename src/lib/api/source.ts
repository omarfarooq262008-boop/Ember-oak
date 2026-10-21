/**
 * Catalog data source flag.
 * Local seed (`src/data/catalog.ts`) is ONLY used in development when
 * VITE_SUPABASE_URL is missing. Production builds never fall back silently.
 */
export function shouldUseLocalCatalogFallback(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (url && url.length > 0) return false
  if (import.meta.env.PROD) return false
  return true
}

export function requireSupabaseOrFallback(): 'supabase' | 'local' {
  if (shouldUseLocalCatalogFallback()) return 'local'
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
  return 'supabase'
}

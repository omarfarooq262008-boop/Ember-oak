/**
 * @deprecated Prefer `@/lib/api/catalog` + `@/hooks/useCatalog`.
 * Kept as thin re-exports for stock/price helpers used by presentational components.
 */
export {
  getMinVariantPrice,
  getMaxVariantPrice,
  productHasStock,
  getStockState,
} from '@/lib/api/stock'
export type { StockState } from '@/lib/api/stock'
export type {
  ProductSort,
  ProductListFilters as ProductFilters,
} from '@/lib/api/queryBuilders'
export { DEFAULT_PAGE_SIZE as SHOP_PAGE_SIZE } from '@/lib/api/queryBuilders'

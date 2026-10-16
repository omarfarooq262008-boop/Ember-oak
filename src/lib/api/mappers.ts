import type {
  Category,
  Collection,
  Product,
  ProductImage,
  ProductVariant,
  Review,
} from '@/types'

export function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
  }
}

export function mapCollection(row: Record<string, unknown>): Collection {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    featured: Boolean(row.featured),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
  }
}

export function mapVariant(row: Record<string, unknown>): ProductVariant {
  const options =
    typeof row.options === 'object' && row.options !== null
      ? (row.options as ProductVariant['options'])
      : {}
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    sku: String(row.sku),
    options,
    price: Number(row.price),
    compare_at_price:
      row.compare_at_price == null ? null : Number(row.compare_at_price),
    stock: Number(row.stock ?? 0),
    is_active: Boolean(row.is_active),
  }
}

export function mapImage(row: Record<string, unknown>): ProductImage {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    url: String(row.url),
    alt: String(row.alt ?? ''),
    sort_order: Number(row.sort_order ?? 0),
    is_primary: Boolean(row.is_primary),
  }
}

export function mapReview(row: Record<string, unknown>): Review {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    customer_name: String(row.customer_name),
    rating: Number(row.rating),
    title: (row.title as string | null) ?? null,
    body: String(row.body),
    is_verified: Boolean(row.is_verified),
    is_approved: Boolean(row.is_approved),
    created_at: String(row.created_at),
  }
}

type ProductRow = Record<string, unknown> & {
  categories?: Record<string, unknown> | Record<string, unknown>[] | null
  product_variants?: Record<string, unknown>[] | null
  product_images?: Record<string, unknown>[] | null
  collection_products?: Array<{
    collections?: Record<string, unknown> | null
  }> | null
  reviews?: Array<{ rating: number }> | null
}

export function mapProduct(row: ProductRow): Product {
  const categoryRaw = Array.isArray(row.categories)
    ? row.categories[0]
    : row.categories
  const variants = (row.product_variants ?? [])
    .map(mapVariant)
    .filter((v) => v.is_active)
    .sort((a, b) => a.sku.localeCompare(b.sku))
  const images = (row.product_images ?? [])
    .map(mapImage)
    .sort((a, b) => a.sort_order - b.sort_order)
  const collections = (row.collection_products ?? [])
    .map((cp) => cp.collections)
    .filter(Boolean)
    .map((c) => mapCollection(c as Record<string, unknown>))

  const reviewRatings = (row.reviews ?? []).map((r) => Number(r.rating))
  const review_count = reviewRatings.length
  const avg_rating =
    review_count > 0
      ? reviewRatings.reduce((a, b) => a + b, 0) / review_count
      : null

  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    short_description: String(row.short_description ?? ''),
    description: String(row.description ?? ''),
    category_id: String(row.category_id ?? ''),
    materials: (row.materials as string | null) ?? null,
    dimensions: (row.dimensions as string | null) ?? null,
    care: (row.care as string | null) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    is_active: Boolean(row.is_active),
    is_featured: Boolean(row.is_featured),
    is_bestseller: Boolean(row.is_bestseller),
    created_at: String(row.created_at),
    category: categoryRaw ? mapCategory(categoryRaw) : undefined,
    variants,
    images,
    collections,
    avg_rating,
    review_count,
  }
}

export type ProductAttributeKey = 'size' | 'scent' | 'color'

export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
}

export interface Collection {
  id: string
  slug: string
  name: string
  description: string | null
  image_url: string | null
  featured: boolean
  sort_order: number
  is_active: boolean
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt: string
  sort_order: number
  is_primary: boolean
}

export interface ProductVariant {
  id: string
  product_id: string
  sku: string
  options: Partial<Record<ProductAttributeKey, string>>
  price: number
  compare_at_price: number | null
  stock: number
  is_active: boolean
}

export interface Product {
  id: string
  slug: string
  name: string
  short_description: string
  description: string
  category_id: string
  materials: string | null
  dimensions: string | null
  care: string | null
  tags: string[]
  is_active: boolean
  is_featured: boolean
  is_bestseller: boolean
  created_at: string
  category?: Category
  images?: ProductImage[]
  variants?: ProductVariant[]
  collections?: Collection[]
  avg_rating?: number | null
  review_count?: number
}

export interface Review {
  id: string
  product_id: string
  customer_name: string
  rating: number
  title: string | null
  body: string
  is_verified: boolean
  is_approved: boolean
  created_at: string
}

export interface CartItem {
  variantId: string
  productId: string
  productSlug: string
  productName: string
  variantLabel: string
  sku: string
  price: number
  compareAtPrice: number | null
  quantity: number
  imageUrl: string
  imageAlt: string
  maxStock: number
}

export interface DiscountCode {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_spend: number | null
  max_uses: number | null
  used_count: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
}

export type OrderStatus =
  | 'pending_payment'
  | 'awaiting_payment'
  | 'awaiting_fulfilment'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentMethod = 'cod' | 'bank_transfer' | 'card'

export interface Order {
  id: string
  order_number: string
  email: string
  status: OrderStatus
  payment_method: PaymentMethod
  subtotal: number
  discount: number
  delivery_fee: number
  total: number
  discount_code: string | null
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  shipping_city: string
  shipping_province: string
  shipping_postal: string | null
  created_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  product_name: string
  variant_label: string
  sku: string
  unit_price: number
  quantity: number
  line_total: number
}

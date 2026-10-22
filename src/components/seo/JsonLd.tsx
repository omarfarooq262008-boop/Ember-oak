/**
 * Product structured data without an inline <script> (CSP script-src 'self').
 * Uses schema.org Microdata instead of application/ld+json so product pages
 * do not need 'unsafe-inline', hashes, or nonces for SEO markup.
 */
type ProductJsonLdProps = {
  name: string
  description: string
  imageUrl?: string
  sku?: string
  url: string
  priceCurrency: string
  price: number
  inStock: boolean
}

export function ProductStructuredData({
  name,
  description,
  imageUrl,
  sku,
  url,
  priceCurrency,
  price,
  inStock,
}: ProductJsonLdProps) {
  return (
    <div className="sr-only" itemScope itemType="https://schema.org/Product">
      <meta itemProp="name" content={name} />
      <meta itemProp="description" content={description} />
      {imageUrl ? <link itemProp="image" href={imageUrl} /> : null}
      {sku ? <meta itemProp="sku" content={sku} /> : null}
      <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
        <link itemProp="url" href={url} />
        <meta itemProp="priceCurrency" content={priceCurrency} />
        <meta itemProp="price" content={String(price)} />
        <link
          itemProp="availability"
          href={
            inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock'
          }
        />
      </div>
    </div>
  )
}

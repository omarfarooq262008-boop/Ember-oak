import { useEffect } from 'react'

import { store } from '@/config/store'

type SeoProps = {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'product' | 'article'
  noindex?: boolean
}

function upsertMeta(
  selectorKey: string,
  content: string,
  attribute: 'name' | 'property' = 'name',
) {
  const selector = `meta[${attribute}="${selectorKey}"]`
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, selectorKey)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

function Seo({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
}: SeoProps) {
  useEffect(() => {
    const siteName = store.name
    const documentTitle = title ? `${title} | ${siteName}` : siteName
    document.title = documentTitle

    upsertMeta('og:site_name', siteName, 'property')
    upsertMeta('og:title', documentTitle, 'property')
    upsertMeta('twitter:title', documentTitle)
    upsertMeta('og:type', type, 'property')

    if (description) {
      upsertMeta('description', description)
      upsertMeta('og:description', description, 'property')
      upsertMeta('twitter:description', description)
    }

    const ogImage = image
      ? image.startsWith('http')
        ? image
        : `${store.seo.siteUrl}${image.startsWith('/') ? '' : '/'}${image}`
      : `${store.seo.siteUrl}${store.seo.defaultOgImage}`
    upsertMeta('og:image', ogImage, 'property')
    upsertMeta('twitter:image', ogImage)

    if (url) {
      upsertMeta('og:url', url, 'property')
      let canonical = document.head.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]',
      )
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
      }
      canonical.setAttribute('href', url)
    }

    upsertMeta('twitter:card', 'summary_large_image')

    if (noindex) {
      upsertMeta('robots', 'noindex, nofollow')
    } else {
      document.head.querySelector('meta[name="robots"]')?.remove()
    }

    return () => {
      if (noindex) {
        document.head.querySelector('meta[name="robots"]')?.remove()
      }
      if (url) {
        document.head.querySelector('link[rel="canonical"]')?.remove()
      }
    }
  }, [title, description, image, url, type, noindex])

  return null
}

export { Seo }

import { useEffect } from 'react'

import { store } from '@/config/store'

type SeoProps = {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'product' | 'article'
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
    }

    upsertMeta('twitter:card', 'summary_large_image')
  }, [title, description, image, url, type])

  return null
}

export { Seo }

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'

import { SoftImage } from '@/components/ui/soft-image'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' })
  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
  })

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    if (!emblaApi || !thumbApi) return
    thumbApi.scrollTo(selectedIndex)
  }, [selectedIndex, emblaApi, thumbApi])

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi],
  )

  if (sorted.length === 0) {
    return (
      <div
        className="aspect-gallery w-full rounded-(--radius-card) bg-background"
        aria-label={`${productName} — no image`}
      />
    )
  }

  const active = sorted[selectedIndex] ?? sorted[0]!

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          className="overflow-hidden rounded-(--radius-card) border border-border md:hidden"
          ref={emblaRef}
        >
          <div className="flex touch-pan-y">
            {sorted.map((image, index) => (
              <div key={image.id} className="min-w-0 flex-[0_0_100%]">
                <div className="aspect-gallery bg-background">
                  <SoftImage
                    src={image.url}
                    alt={image.alt || `${productName} image ${index + 1}`}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    width={800}
                    height={1000}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="group relative hidden w-full overflow-hidden rounded-(--radius-card) border border-border bg-background md:block"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Zoom ${productName} image`}
        >
          <div className="aspect-gallery">
            <SoftImage
              src={active.url}
              alt={active.alt || productName}
              className="transition-transform duration-500 group-hover:scale-[1.03]"
              loading="eager"
              decoding="async"
              width={800}
              height={1000}
            />
          </div>
          <span className="absolute bottom-3 right-3 rounded-(--radius-sm) border border-border bg-surface/95 px-2.5 py-1 text-xs text-muted backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
            Click to zoom
          </span>
        </button>

        {sorted.length > 1 ? (
          <p className="mt-2 text-center text-xs text-muted md:hidden" aria-live="polite">
            {selectedIndex + 1} / {sorted.length}
          </p>
        ) : null}
      </div>

      {sorted.length > 1 ? (
        <div className="overflow-hidden" ref={thumbRef}>
          <div className="flex gap-2">
            {sorted.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => {
                  setSelectedIndex(index)
                  scrollTo(index)
                }}
                className={cn(
                  'relative shrink-0 overflow-hidden rounded-(--radius-sm) border-2 transition-all duration-200',
                  index === selectedIndex
                    ? 'border-accent scale-[1.02]'
                    : 'border-transparent opacity-80 hover:opacity-100',
                )}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === selectedIndex}
              >
                <SoftImage
                  src={image.url}
                  alt=""
                  className="aspect-gallery w-16 object-cover sm:w-20"
                  width={80}
                  height={80}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isDesktop ? (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
            <DialogTitle className="sr-only">{productName} — enlarged view</DialogTitle>
            <SoftImage
              src={active.url}
              alt={active.alt || productName}
              className="max-h-[85vh] w-full rounded-(--radius-card) object-contain"
              wrapperClassName="!h-auto max-h-[85vh]"
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}

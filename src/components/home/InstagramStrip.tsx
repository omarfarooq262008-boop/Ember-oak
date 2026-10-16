import { SoftImage } from '@/components/ui/soft-image'
import { store } from '@/config/store'
import { instagramStrip } from '@/config/media'
import { useInViewFade } from '@/hooks/useInViewFade'
import { cn } from '@/lib/utils'

export function InstagramStrip() {
  const { ref, inView } = useInViewFade<HTMLElement>()

  return (
    <section
      ref={ref}
      className="border-y border-border bg-background py-10 md:py-14"
      aria-labelledby="instagram-heading"
    >
      <div className="container-eo mb-6 px-4 md:px-8">
        <p
          className={cn(
            'text-xs font-medium uppercase tracking-[0.2em] text-accent',
            inView && 'fade-in',
          )}
        >
          On Instagram
        </p>
        <h2
          id="instagram-heading"
          className={cn('mt-2 text-lg font-bold md:text-xl', inView && 'fade-in-up')}
        >
          <a
            href={store.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-200 hover:text-accent"
          >
            @emberandoak
          </a>
        </h2>
      </div>
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-2 md:gap-3 md:px-8 snap-x snap-mandatory"
        role="list"
      >
        {instagramStrip.map((item, i) => (
          <a
            key={item.id}
            href={store.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'group relative aspect-square w-[min(42vw,14rem)] shrink-0 snap-start overflow-hidden rounded-(--radius-card) border border-border bg-background',
              inView && 'fade-in-up',
            )}
            style={inView ? { animationDelay: `${i * 60}ms` } : undefined}
            role="listitem"
          >
            <SoftImage
              src={item.url}
              alt={item.alt}
              className="img-zoom"
              loading="lazy"
              decoding="async"
            />
            <span
              className="pointer-events-none absolute inset-0 bg-primary/0 transition-colors duration-300 group-hover:bg-primary/10"
              aria-hidden
            />
          </a>
        ))}
      </div>
    </section>
  )
}

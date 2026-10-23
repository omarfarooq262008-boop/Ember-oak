import { Link } from 'react-router-dom'

import { SoftImage } from '@/components/ui/soft-image'
import { Button } from '@/components/ui/button'
import { store } from '@/config/store'
import { heroImage } from '@/config/media'

const HEADLINE = 'Rooms that hold the evening'
const SUPPORT_MAX = 140

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  return `${(lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim()}…`
}

export function Hero() {
  const supporting = truncate(store.description, SUPPORT_MAX)

  return (
    <section aria-labelledby="hero-heading">
      <div className="relative w-full overflow-hidden bg-background">
        <div className="h-[70vh] w-full overflow-hidden md:h-auto md:aspect-banner [contain:paint]">
          <SoftImage
            src={heroImage.url}
            alt={heroImage.alt}
            className="ken-burns"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1920}
            height={1080}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/40 to-transparent md:h-32"
          aria-hidden
        />
      </div>
      <div className="section-pad bg-surface">
        <div className="container-eo mx-auto max-w-2xl text-center">
          <p
            className="fade-in text-xs font-medium uppercase tracking-[0.22em] text-accent"
            style={{ animationDelay: '60ms' }}
          >
            Home fragrance &amp; homeware
          </p>
          <h1
            id="hero-heading"
            className="fade-in-up mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] md:text-5xl lg:text-6xl"
            style={{ animationDelay: '100ms' }}
          >
            {store.name}
          </h1>
          <p
            className="fade-in-up mt-4 font-display text-xl font-bold tracking-[-0.03em] text-text md:text-2xl"
            style={{ animationDelay: '160ms' }}
          >
            {HEADLINE}
          </p>
          <p
            className="fade-in-up mt-4 text-base leading-relaxed text-muted md:text-lg"
            style={{ animationDelay: '220ms' }}
          >
            {supporting}
          </p>
          <div
            className="fade-in-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: '280ms' }}
          >
            <Button asChild size="lg">
              <Link to="/shop">Shop the collection</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/collections">Browse collections</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

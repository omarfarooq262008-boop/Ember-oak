import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { store } from '@/config/store'
import { heroImage } from '@/data/catalog'

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
        <img
          src={heroImage.url}
          alt={heroImage.alt}
          className="block h-[70vh] w-full object-cover md:h-auto md:aspect-banner"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="section-pad bg-surface">
        <div className="container-eo mx-auto max-w-2xl text-center">
          <h1
            id="hero-heading"
            className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] md:text-5xl lg:text-6xl"
          >
            {store.name}
          </h1>
          <p className="mt-4 font-display text-xl font-bold tracking-[-0.03em] text-text md:text-2xl">
            {HEADLINE}
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
            {supporting}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/shop">Shop the collection</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

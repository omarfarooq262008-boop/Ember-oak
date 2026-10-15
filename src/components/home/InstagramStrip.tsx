import { instagramStrip } from '@/data/catalog'
import { store } from '@/config/store'

export function InstagramStrip() {
  return (
    <section className="py-10 md:py-14" aria-labelledby="instagram-heading">
      <div className="container-eo mb-6 px-4 md:px-8">
        <h2 id="instagram-heading" className="text-lg font-bold md:text-xl">
          <a
            href={store.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent"
          >
            @emberandoak
          </a>
        </h2>
      </div>
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-2 md:gap-3 md:px-8 snap-x snap-mandatory"
        role="list"
      >
        {instagramStrip.map((item) => (
          <a
            key={item.id}
            href={store.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square w-[min(42vw,14rem)] shrink-0 snap-start overflow-hidden rounded-(--radius-sm) bg-background"
            role="listitem"
          >
            <img
              src={item.url}
              alt={item.alt}
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </a>
        ))}
      </div>
    </section>
  )
}

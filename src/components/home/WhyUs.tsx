import { store } from '@/config/store'
import { useInViewFade } from '@/hooks/useInViewFade'
import { cn } from '@/lib/utils'

export function WhyUs() {
  const { ref, inView } = useInViewFade<HTMLElement>()

  return (
    <section
      ref={ref}
      className="section-pad bg-brand-band text-brand-band-text"
      aria-labelledby="why-us-heading"
    >
      <div className="container-eo">
        <h2
          id="why-us-heading"
          className={cn(
            'text-2xl text-brand-band-text md:text-3xl',
            inView && 'fade-in-up',
          )}
        >
          Why {store.name}
        </h2>
        <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {store.whyUs.map((item, i) => (
            <li
              key={item.title}
              className={cn(inView && 'fade-in-up')}
              style={inView ? { animationDelay: `${i * 100}ms` } : undefined}
            >
              <h3 className="text-lg font-bold text-brand-band-text">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-brand-band-text/80">
                {item.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

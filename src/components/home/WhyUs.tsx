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
        <p
          className={cn(
            'text-xs font-medium uppercase tracking-[0.2em] text-accent',
            inView && 'fade-in',
          )}
        >
          The practical details
        </p>
        <h2
          id="why-us-heading"
          className={cn(
            'mt-2 text-2xl text-brand-band-text md:text-3xl',
            inView && 'fade-in-up',
          )}
        >
          Why {store.name}
        </h2>
        <ul className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {store.whyUs.map((item, i) => (
            <li
              key={item.title}
              className={cn(
                'rounded-(--radius-card) border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1',
                inView && 'fade-in-up',
              )}
              style={inView ? { animationDelay: `${120 + i * 100}ms` } : undefined}
            >
              <span
                className="mb-4 block font-display text-3xl font-extrabold text-accent/80"
                aria-hidden
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-lg font-bold text-brand-band-text">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-brand-band-text/75">
                {item.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

import { MessageSquareIcon } from 'lucide-react'

export function ReviewsSection() {
  return (
    <section
      className="section-pad bg-background"
      aria-labelledby="reviews-heading"
    >
      <div className="container-eo">
        <h2 id="reviews-heading" className="text-2xl md:text-3xl">
          Customer reviews
        </h2>
        <div className="mt-10 flex flex-col items-center rounded-(--radius-card) border border-dashed border-border bg-surface px-6 py-16 text-center">
          <MessageSquareIcon
            className="size-10 text-muted/60"
            strokeWidth={1.25}
            aria-hidden
          />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            Customer reviews will appear here once verified purchases are shared.
          </p>
        </div>
      </div>
    </section>
  )
}

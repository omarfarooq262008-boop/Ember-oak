import { BestSellers } from '@/components/home/BestSellers'
import { FeaturedCollections } from '@/components/home/FeaturedCollections'
import { Hero } from '@/components/home/Hero'
import { InstagramStrip } from '@/components/home/InstagramStrip'
import { Newsletter } from '@/components/home/Newsletter'
import { ReviewsSection } from '@/components/home/ReviewsSection'
import { WhyUs } from '@/components/home/WhyUs'
import { Seo } from '@/components/seo/Seo'
import { store } from '@/config/store'

export function HomePage() {
  return (
    <>
      <Seo
        title={store.tagline}
        description={store.description}
        url={store.seo.siteUrl}
        image={store.seo.defaultOgImage}
      />
      <Hero />
      <FeaturedCollections />
      <BestSellers />
      <WhyUs />
      <ReviewsSection />
      <InstagramStrip />
      <Newsletter />
    </>
  )
}

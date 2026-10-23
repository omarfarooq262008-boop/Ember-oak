import { Toaster } from 'sonner'

import { CartDrawer } from '@/components/cart/CartDrawer'
import { AnimatedOutlet } from '@/components/layout/AnimatedOutlet'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { DemoBanner } from '@/components/layout/DemoBanner'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { StorefrontScrollToTop } from '@/components/layout/StorefrontScrollToTop'
import { StoreSettingsHydrator } from '@/components/layout/StoreSettingsHydrator'
import { DemoNoindex } from '@/components/seo/DemoNoindex'
import { SentryRouteTags } from '@/components/sentry/SentryRouteTags'
import { CartProvider } from '@/contexts/CartContext'
import { WishlistProvider } from '@/contexts/WishlistContext'

export function RootLayout() {
  return (
    <CartProvider>
      <WishlistProvider>
        <StorefrontScrollToTop />
        <StoreSettingsHydrator />
        <SentryRouteTags />
        <DemoNoindex />
        <div className="flex min-h-dvh flex-col">
          <DemoBanner />
          <AnnouncementBar />
          <Header />
          <main id="main-content" className="flex-1">
            <AnimatedOutlet />
          </main>
          <Footer />
          <CartDrawer />
          <Toaster position="bottom-center" closeButton richColors />
        </div>
      </WishlistProvider>
    </CartProvider>
  )
}

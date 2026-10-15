import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { RootLayout } from '@/components/layout/RootLayout'
import { AboutPage } from '@/pages/AboutPage'
import { AccountPage } from '@/pages/AccountPage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { CollectionPage } from '@/pages/CollectionPage'
import { CollectionsIndexPage } from '@/pages/CollectionsIndexPage'
import { ContactPage } from '@/pages/ContactPage'
import { FaqPage } from '@/pages/FaqPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage'
import { OrderTrackingPage } from '@/pages/OrderTrackingPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { ProductPage } from '@/pages/ProductPage'
import { ReturnsPage } from '@/pages/ReturnsPage'
import { SearchPage } from '@/pages/SearchPage'
import { ShippingPage } from '@/pages/ShippingPage'
import { ShopPage } from '@/pages/ShopPage'
import { TermsPage } from '@/pages/TermsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'shop/:category', element: <ShopPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'product/:slug', element: <ProductPage /> },
      { path: 'collections', element: <CollectionsIndexPage /> },
      { path: 'collections/:slug', element: <CollectionPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'order-confirmation/:orderNumber', element: <OrderConfirmationPage /> },
      { path: 'order-confirmation', element: <OrderConfirmationPage /> },
      { path: 'track-order', element: <OrderTrackingPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'shipping', element: <ShippingPage /> },
      { path: 'returns', element: <ReturnsPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App

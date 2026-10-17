import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AdminGate } from '@/components/admin/AdminGate'
import { AdminLayout } from '@/components/admin/AdminLayout'
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
import { LoginPage } from '@/pages/LoginPage'
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
import { AdminContactPage } from '@/pages/admin/AdminContactPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminDiscountsPage } from '@/pages/admin/AdminDiscountsPage'
import { AdminEventsPage } from '@/pages/admin/AdminEventsPage'
import { AdminInventoryPage } from '@/pages/admin/AdminInventoryPage'
import { AdminNewsletterPage } from '@/pages/admin/AdminNewsletterPage'
import { AdminOrderDetailPage } from '@/pages/admin/AdminOrderDetailPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { AdminProductFormPage } from '@/pages/admin/AdminProductFormPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { AdminReviewsPage } from '@/pages/admin/AdminReviewsPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'

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
      { path: 'login', element: <LoginPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminGate />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          {
            path: 'products',
            children: [
              { index: true, element: <AdminProductsPage /> },
              { path: 'new', element: <AdminProductFormPage /> },
              { path: ':id', element: <AdminProductFormPage /> },
            ],
          },
          { path: 'inventory', element: <AdminInventoryPage /> },
          {
            path: 'orders',
            children: [
              { index: true, element: <AdminOrdersPage /> },
              { path: ':id', element: <AdminOrderDetailPage /> },
            ],
          },
          { path: 'discounts', element: <AdminDiscountsPage /> },
          { path: 'reviews', element: <AdminReviewsPage /> },
          { path: 'messages', element: <AdminContactPage /> },
          { path: 'newsletter', element: <AdminNewsletterPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
          { path: 'events', element: <AdminEventsPage /> },
        ],
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App

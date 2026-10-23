import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { RootLayout } from '@/components/layout/RootLayout'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const AdminGate = lazy(() =>
  import('@/components/admin/AdminGate').then((m) => ({ default: m.AdminGate })),
)
const AdminLayout = lazy(() =>
  import('@/components/admin/AdminLayout').then((m) => ({
    default: m.AdminLayout,
  })),
)
const CartPage = lazy(() =>
  import('@/pages/CartPage').then((m) => ({ default: m.CartPage })),
)
const CheckoutPage = lazy(() =>
  import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
)
const ProductPage = lazy(() =>
  import('@/pages/ProductPage').then((m) => ({ default: m.ProductPage })),
)
const ShopPage = lazy(() =>
  import('@/pages/ShopPage').then((m) => ({ default: m.ShopPage })),
)

/** Secondary / admin routes — split out of the main storefront chunk. */
const AboutDemoPage = lazy(() =>
  import('@/pages/AboutDemoPage').then((m) => ({ default: m.AboutDemoPage })),
)
const AboutPage = lazy(() =>
  import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })),
)
const AccountPage = lazy(() =>
  import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })),
)
const CollectionPage = lazy(() =>
  import('@/pages/CollectionPage').then((m) => ({ default: m.CollectionPage })),
)
const CollectionsIndexPage = lazy(() =>
  import('@/pages/CollectionsIndexPage').then((m) => ({
    default: m.CollectionsIndexPage,
  })),
)
const ContactPage = lazy(() =>
  import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })),
)
const EmailPreviewPage = lazy(() =>
  import('@/pages/EmailPreviewPage').then((m) => ({
    default: m.EmailPreviewPage,
  })),
)
const FaqPage = lazy(() =>
  import('@/pages/FaqPage').then((m) => ({ default: m.FaqPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const MockCheckoutPage = lazy(() =>
  import('@/pages/MockCheckoutPage').then((m) => ({
    default: m.MockCheckoutPage,
  })),
)
const OrderConfirmationPage = lazy(() =>
  import('@/pages/OrderConfirmationPage').then((m) => ({
    default: m.OrderConfirmationPage,
  })),
)
const OrderTrackingPage = lazy(() =>
  import('@/pages/OrderTrackingPage').then((m) => ({
    default: m.OrderTrackingPage,
  })),
)
const PrivacyPage = lazy(() =>
  import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
)
const ReturnsPage = lazy(() =>
  import('@/pages/ReturnsPage').then((m) => ({ default: m.ReturnsPage })),
)
const SearchPage = lazy(() =>
  import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })),
)
const SentryTestPage = lazy(() =>
  import('@/pages/SentryTestPage').then((m) => ({ default: m.SentryTestPage })),
)
const ShippingPage = lazy(() =>
  import('@/pages/ShippingPage').then((m) => ({ default: m.ShippingPage })),
)
const StatusPage = lazy(() =>
  import('@/pages/StatusPage').then((m) => ({ default: m.StatusPage })),
)
const TermsPage = lazy(() =>
  import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage })),
)
const AdminContactPage = lazy(() =>
  import('@/pages/admin/AdminContactPage').then((m) => ({
    default: m.AdminContactPage,
  })),
)
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  })),
)
const AdminDiscountsPage = lazy(() =>
  import('@/pages/admin/AdminDiscountsPage').then((m) => ({
    default: m.AdminDiscountsPage,
  })),
)
const AdminEventsPage = lazy(() =>
  import('@/pages/admin/AdminEventsPage').then((m) => ({
    default: m.AdminEventsPage,
  })),
)
const AdminInventoryPage = lazy(() =>
  import('@/pages/admin/AdminInventoryPage').then((m) => ({
    default: m.AdminInventoryPage,
  })),
)
const AdminNewsletterPage = lazy(() =>
  import('@/pages/admin/AdminNewsletterPage').then((m) => ({
    default: m.AdminNewsletterPage,
  })),
)
const AdminOrderDetailPage = lazy(() =>
  import('@/pages/admin/AdminOrderDetailPage').then((m) => ({
    default: m.AdminOrderDetailPage,
  })),
)
const AdminOrdersPage = lazy(() =>
  import('@/pages/admin/AdminOrdersPage').then((m) => ({
    default: m.AdminOrdersPage,
  })),
)
const AdminProductFormPage = lazy(() =>
  import('@/pages/admin/AdminProductFormPage').then((m) => ({
    default: m.AdminProductFormPage,
  })),
)
const AdminProductsPage = lazy(() =>
  import('@/pages/admin/AdminProductsPage').then((m) => ({
    default: m.AdminProductsPage,
  })),
)
const AdminReviewsPage = lazy(() =>
  import('@/pages/admin/AdminReviewsPage').then((m) => ({
    default: m.AdminReviewsPage,
  })),
)
const AdminSettingsPage = lazy(() =>
  import('@/pages/admin/AdminSettingsPage').then((m) => ({
    default: m.AdminSettingsPage,
  })),
)

function RouteFallback() {
  return (
    <div className="section-pad container-eo" aria-busy="true">
      <div className="h-8 w-40 animate-pulse rounded-(--radius-sm) bg-border/60" />
      <div className="mt-6 h-48 animate-pulse rounded-(--radius-card) bg-border/40" />
    </div>
  )
}

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
      { path: 'mock-checkout', element: <MockCheckoutPage /> },
      {
        path: 'order-confirmation/:orderNumber',
        element: <OrderConfirmationPage />,
      },
      { path: 'order-confirmation', element: <OrderConfirmationPage /> },
      { path: 'track-order', element: <OrderTrackingPage /> },
      { path: 'email-preview', element: <EmailPreviewPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'about-demo', element: <AboutDemoPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'shipping', element: <ShippingPage /> },
      { path: 'returns', element: <ReturnsPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'status', element: <StatusPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/sentry-test',
    element: <AdminGate />,
    children: [{ index: true, element: <SentryTestPage /> }],
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
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}

export default App

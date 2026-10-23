import { Outlet, useLocation } from 'react-router-dom'

/**
 * Soft fade/slide when the route pathname changes.
 * Query-only updates keep the same key so the shop doesn't flash on filter tweaks.
 */
export function AnimatedOutlet() {
  const { pathname } = useLocation()

  return (
    <div key={pathname} className="page-enter">
      <Outlet />
    </div>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'

import { SoftImage } from '@/components/ui/soft-image'
import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { store } from '@/config/store'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { useProductsByIds } from '@/hooks/useCatalog'
import { formatPKR } from '@/lib/format'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { pakistanProvinces, getCitiesForProvince } from '@/lib/pakistan'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

type Tab = 'profile' | 'addresses' | 'orders' | 'wishlist'

type AddressRow = {
  id: string
  label: string | null
  full_name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  province: string
  postal_code: string | null
  is_default: boolean
}

type OrderRow = {
  id: string
  order_number: string
  status: OrderStatus
  total: number
  created_at: string
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Payment pending',
  awaiting_payment: 'Awaiting payment',
  awaiting_fulfilment: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export function AccountPage() {
  const { user, profile, loading, configured, signOut, updateProfile } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const [addresses, setAddresses] = useState<AddressRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const { ids: wishlistIds, toggle } = useWishlist()
  const { data: wishProducts = [] } = useProductsByIds(wishlistIds)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  useEffect(() => {
    if (!user?.id || !supabase) return
    void supabase
      .from('addresses')
      .select(
        'id, label, full_name, phone, line1, line2, city, province, postal_code, is_default',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAddresses((data as AddressRow[]) ?? []))

    void supabase
      .from('orders')
      .select('id, order_number, status, total, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders((data as OrderRow[]) ?? []))
  }, [user?.id])

  if (loading) {
    return (
      <div className="section-pad container-eo max-w-lg">
        <p className="text-muted">Loading account…</p>
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="section-pad container-eo max-w-lg">
        <Seo title="Account" />
        <h1 className="text-3xl">Account</h1>
        <p className="mt-4 text-sm text-muted">
          Connect Supabase to enable accounts. Guest checkout and{' '}
          <Link to="/track-order" className="underline">
            order tracking
          </Link>{' '}
          still work.
        </p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const result = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim(),
    })
    setSaving(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('Profile updated')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'orders', label: 'Orders' },
    { id: 'wishlist', label: 'Wishlist' },
  ]

  return (
    <>
      <Seo
        title="Account"
        description={`Your ${store.name} account — profile, addresses, orders and wishlist.`}
        url={`${store.seo.siteUrl}/account`}
      />

      <div className="section-pad container-eo max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl">Your account</h1>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void signOut()}>
            Log out
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.id ? 'text-accent' : 'text-muted hover:text-text',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'profile' ? (
            <form onSubmit={saveProfile} className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-name">Full name</Label>
                <Input
                  id="account-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-phone">Phone</Label>
                <Input
                  id="account-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </form>
          ) : null}

          {tab === 'addresses' ? (
            <AddressesPanel
              userId={user.id}
              addresses={addresses}
              onChange={setAddresses}
            />
          ) : null}

          {tab === 'orders' ? (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-sm text-muted">
                  No orders on this account yet. Guest orders can still be tracked with
                  your order number and email.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-(--radius-card) border border-border">
                  {orders.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium tabular-nums">{o.order_number}</p>
                        <p className="text-muted">
                          {STATUS_LABELS[o.status] ?? o.status} ·{' '}
                          {new Date(o.created_at).toLocaleDateString('en-PK')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="tabular-nums">{formatPKR(Number(o.total))}</span>
                        <Link
                          to={`/track-order?order=${encodeURIComponent(o.order_number)}`}
                          className="text-accent underline"
                        >
                          Track
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-muted">
                Placed as guest?{' '}
                <Link to="/track-order" className="underline">
                  Track with order number
                </Link>
              </p>
            </div>
          ) : null}

          {tab === 'wishlist' ? (
            <div>
              {wishlistIds.length === 0 ? (
                <p className="text-sm text-muted">
                  Your wishlist is empty.{' '}
                  <Link to="/shop" className="underline">
                    Browse the shop
                  </Link>
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {wishProducts.map((p) => {
                    const img =
                      p.images?.find((i) => i.is_primary) ?? p.images?.[0]
                    return (
                      <li
                        key={p.id}
                        className="flex gap-3 rounded-(--radius-card) border border-border p-3"
                      >
                        <Link
                          to={`/product/${p.slug}`}
                          className="size-20 shrink-0 overflow-hidden rounded-(--radius-sm)"
                        >
                          {img ? (
                            <SoftImage
                              src={img.url}
                              alt={img.alt || p.name}
                              className="size-20 object-cover"
                            />
                          ) : null}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/product/${p.slug}`}
                            className="font-medium hover:text-accent"
                          >
                            {p.name}
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => toggle(p.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

function AddressesPanel({
  userId,
  addresses,
  onChange,
}: {
  userId: string
  addresses: AddressRow[]
  onChange: (rows: AddressRow[]) => void
}) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [postal, setPostal] = useState('')
  const [saving, setSaving] = useState(false)
  const cities = getCitiesForProvince(province)

  const addAddress = async (e: FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured || !supabase) return
    setSaving(true)
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: userId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        line1: line1.trim(),
        city,
        province,
        postal_code: postal.trim() || null,
        is_default: addresses.length === 0,
      })
      .select(
        'id, label, full_name, phone, line1, line2, city, province, postal_code, is_default',
      )
      .single()
    setSaving(false)
    if (error || !data) {
      toast.error(error?.message || 'Could not save address')
      return
    }
    onChange([data as AddressRow, ...addresses])
    setFullName('')
    setPhone('')
    setLine1('')
    setProvince('')
    setCity('')
    setPostal('')
    toast.success('Address saved')
  }

  const remove = async (id: string) => {
    if (!supabase) return
    const { error } = await supabase.from('addresses').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    onChange(addresses.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-8">
      {addresses.length === 0 ? (
        <p className="text-sm text-muted">No saved addresses yet.</p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex justify-between gap-4 rounded-(--radius-card) border border-border p-4 text-sm"
            >
              <div>
                <p className="font-medium">{a.full_name}</p>
                <p className="text-muted">
                  {a.line1}, {a.city}, {a.province}
                  {a.postal_code ? ` ${a.postal_code}` : ''}
                </p>
                <p className="text-muted">{a.phone}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void remove(a.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addAddress} className="max-w-md space-y-3 border-t border-border pt-6">
        <h2 className="text-lg">Add address</h2>
        <Input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <Input
          placeholder="Street address"
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          required
        />
        <select
          className="flex h-10 w-full rounded-(--radius-sm) border border-border bg-background px-3 text-sm"
          value={province}
          onChange={(e) => {
            setProvince(e.target.value)
            setCity('')
          }}
          required
        >
          <option value="">Province</option>
          {pakistanProvinces.map((p) => (
            <option key={p.slug} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="flex h-10 w-full rounded-(--radius-sm) border border-border bg-background px-3 text-sm"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
          disabled={!province}
        >
          <option value="">City</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Input
          placeholder="Postal code (optional)"
          value={postal}
          onChange={(e) => setPostal(e.target.value)}
        />
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save address'}
        </Button>
      </form>
    </div>
  )
}

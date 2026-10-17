import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { getAdminSettings, isSupabaseConfigured, setSetting } from '@/lib/admin/api'

export function AdminSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: getAdminSettings,
    enabled: isSupabaseConfigured,
  })

  const [delivery, setDelivery] = useState({
    flatFeePKR: 250,
    freeAbovePKR: 8000,
    workingDaysMin: 3,
    workingDaysMax: 5,
  })
  const [contact, setContact] = useState({ email: '', phone: '', whatsapp: '' })
  const [announcement, setAnnouncement] = useState({ text: '', enabled: true })
  const [inventory, setInventory] = useState({ lowStockThreshold: 5 })

  useEffect(() => {
    if (!data) return
    setDelivery(data.delivery)
    setContact(data.contact)
    setAnnouncement(data.announcement)
    setInventory(data.inventory)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await setSetting('delivery', delivery)
      await setSetting('contact', contact)
      await setSetting('announcement', announcement)
      await setSetting('inventory', inventory)
    },
    onSuccess: async () => {
      toast.success('Settings saved')
      await qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'inventory-settings'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full max-w-2xl rounded-(--radius-card)" />
  }

  if (isError) {
    return (
      <Button variant="secondary" onClick={() => void refetch()}>
        Retry
      </Button>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted">Storefront delivery, contact, and announcements.</p>
      </div>

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
      >
        <section className="space-y-4 rounded-(--radius-card) border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Delivery</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fee">Flat fee (PKR)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                value={delivery.flatFeePKR}
                onChange={(e) =>
                  setDelivery((d) => ({ ...d, flatFeePKR: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="free">Free above (PKR)</Label>
              <Input
                id="free"
                type="number"
                min={0}
                value={delivery.freeAbovePKR}
                onChange={(e) =>
                  setDelivery((d) => ({ ...d, freeAbovePKR: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="min-days">Working days (min)</Label>
              <Input
                id="min-days"
                type="number"
                min={1}
                value={delivery.workingDaysMin}
                onChange={(e) =>
                  setDelivery((d) => ({ ...d, workingDaysMin: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max-days">Working days (max)</Label>
              <Input
                id="max-days"
                type="number"
                min={1}
                value={delivery.workingDaysMax}
                onChange={(e) =>
                  setDelivery((d) => ({ ...d, workingDaysMax: Number(e.target.value) }))
                }
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-(--radius-card) border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Contact</h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wa">WhatsApp</Label>
              <Input
                id="wa"
                value={contact.whatsapp}
                onChange={(e) => setContact((c) => ({ ...c, whatsapp: e.target.value }))}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-(--radius-card) border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Announcement bar</h2>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={announcement.enabled}
              onCheckedChange={(c) =>
                setAnnouncement((a) => ({ ...a, enabled: c === true }))
              }
            />
            Show announcement
          </label>
          <div className="space-y-1">
            <Label htmlFor="ann-text">Text</Label>
            <Input
              id="ann-text"
              value={announcement.text}
              onChange={(e) => setAnnouncement((a) => ({ ...a, text: e.target.value }))}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-(--radius-card) border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Inventory</h2>
          <div className="space-y-1">
            <Label htmlFor="low">Low-stock threshold</Label>
            <Input
              id="low"
              type="number"
              min={0}
              value={inventory.lowStockThreshold}
              onChange={(e) =>
                setInventory({ lowStockThreshold: Number(e.target.value) })
              }
            />
          </div>
        </section>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </form>
    </div>
  )
}

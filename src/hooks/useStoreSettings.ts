import { useQuery } from '@tanstack/react-query'

import { store } from '@/config/store'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type DeliverySettings = {
  flatFeePKR: number
  freeAbovePKR: number
  workingDaysMin: number
  workingDaysMax: number
}

export type ContactSettings = {
  email: string
  phone: string
  whatsapp: string
}

export type AnnouncementSettings = {
  text: string
  enabled: boolean
}

export type InventorySettings = {
  lowStockThreshold: number
}

export type StorefrontSettings = {
  delivery: DeliverySettings
  contact: ContactSettings
  announcement: AnnouncementSettings
  inventory: InventorySettings
}

const defaults: StorefrontSettings = {
  delivery: {
    flatFeePKR: store.delivery.flatFeePKR,
    freeAbovePKR: store.delivery.freeAbovePKR,
    workingDaysMin: store.delivery.workingDaysMin,
    workingDaysMax: store.delivery.workingDaysMax,
  },
  contact: {
    email: store.support.email,
    phone: store.support.phone,
    whatsapp: store.support.whatsapp,
  },
  announcement: {
    text: store.announcement.text,
    enabled: true,
  },
  inventory: { lowStockThreshold: 5 },
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function mergeSettings(
  rows: { key: string; value: unknown }[] | null,
): StorefrontSettings {
  const map = new Map((rows ?? []).map((r) => [r.key, r.value]))
  const deliveryRaw = (map.get('delivery') ?? {}) as Record<string, unknown>
  const contactRaw = (map.get('contact') ?? {}) as Record<string, unknown>
  const announcementRaw = (map.get('announcement') ?? {}) as Record<string, unknown>
  const inventoryRaw = (map.get('inventory') ?? {}) as Record<string, unknown>

  return {
    delivery: {
      flatFeePKR: asNumber(deliveryRaw.flatFeePKR, defaults.delivery.flatFeePKR),
      freeAbovePKR: asNumber(
        deliveryRaw.freeAbovePKR,
        defaults.delivery.freeAbovePKR,
      ),
      workingDaysMin: asNumber(
        deliveryRaw.workingDaysMin,
        defaults.delivery.workingDaysMin,
      ),
      workingDaysMax: asNumber(
        deliveryRaw.workingDaysMax,
        defaults.delivery.workingDaysMax,
      ),
    },
    contact: {
      email:
        typeof contactRaw.email === 'string' && contactRaw.email
          ? contactRaw.email
          : defaults.contact.email,
      phone:
        typeof contactRaw.phone === 'string' && contactRaw.phone
          ? contactRaw.phone
          : defaults.contact.phone,
      whatsapp:
        typeof contactRaw.whatsapp === 'string' && contactRaw.whatsapp
          ? contactRaw.whatsapp
          : defaults.contact.whatsapp,
    },
    announcement: {
      text:
        typeof announcementRaw.text === 'string'
          ? announcementRaw.text
          : defaults.announcement.text,
      enabled:
        typeof announcementRaw.enabled === 'boolean'
          ? announcementRaw.enabled
          : defaults.announcement.enabled,
    },
    inventory: {
      lowStockThreshold: asNumber(
        inventoryRaw.lowStockThreshold,
        defaults.inventory.lowStockThreshold,
      ),
    },
  }
}

async function fetchStoreSettings(): Promise<StorefrontSettings> {
  if (!supabase) return defaults
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['delivery', 'contact', 'announcement', 'inventory'])
  if (error) return defaults
  return mergeSettings(data as { key: string; value: unknown }[])
}

export function useStoreSettings() {
  const query = useQuery({
    queryKey: ['storefront', 'settings'],
    queryFn: fetchStoreSettings,
    staleTime: 60_000,
    enabled: isSupabaseConfigured,
  })

  return {
    ...defaults,
    ...query.data,
    delivery: query.data?.delivery ?? defaults.delivery,
    contact: query.data?.contact ?? defaults.contact,
    announcement: query.data?.announcement ?? defaults.announcement,
    inventory: query.data?.inventory ?? defaults.inventory,
    isLoading: query.isLoading && isSupabaseConfigured,
  }
}

export function getDefaultStoreSettings(): StorefrontSettings {
  return defaults
}

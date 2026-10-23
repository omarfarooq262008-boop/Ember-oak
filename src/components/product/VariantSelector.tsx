import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { ProductAttributeKey, ProductVariant } from '@/types'

const ATTRIBUTE_ORDER: ProductAttributeKey[] = ['size', 'scent', 'color']

const ATTRIBUTE_LABELS: Record<ProductAttributeKey, string> = {
  size: 'Size',
  scent: 'Scent',
  color: 'Color',
}

export function getVariantAttributeKeys(variants: ProductVariant[]): ProductAttributeKey[] {
  const keys = new Set<ProductAttributeKey>()
  for (const v of variants) {
    for (const key of ATTRIBUTE_ORDER) {
      if (v.options[key]) keys.add(key)
    }
  }
  return ATTRIBUTE_ORDER.filter((k) => keys.has(k))
}

export function variantMatchesSelection(
  variant: ProductVariant,
  selection: Partial<Record<ProductAttributeKey, string>>,
): boolean {
  return Object.entries(selection).every(
    ([key, value]) =>
      !value || variant.options[key as ProductAttributeKey] === value,
  )
}

export function findVariantBySelection(
  variants: ProductVariant[],
  selection: Partial<Record<ProductAttributeKey, string>>,
  keys: ProductAttributeKey[],
): ProductVariant | undefined {
  const complete = keys.every((k) => Boolean(selection[k]))
  if (!complete) return undefined
  return variants.find(
    (v) => v.is_active && variantMatchesSelection(v, selection),
  )
}

export function isOptionAvailable(
  variants: ProductVariant[],
  attributeKey: ProductAttributeKey,
  value: string,
  selection: Partial<Record<ProductAttributeKey, string>>,
): boolean {
  const testSelection = { ...selection, [attributeKey]: value }
  return variants.some(
    (v) =>
      v.is_active &&
      v.stock > 0 &&
      variantMatchesSelection(v, testSelection),
  )
}

export function getDefaultSelection(
  variants: ProductVariant[],
  keys: ProductAttributeKey[],
): Partial<Record<ProductAttributeKey, string>> {
  const active = variants.filter((v) => v.is_active && v.stock > 0)
  const pick = active[0]
  if (!pick) return {}
  const selection: Partial<Record<ProductAttributeKey, string>> = {}
  for (const key of keys) {
    const val = pick.options[key]
    if (val) selection[key] = val
  }
  return selection
}

export function formatVariantLabel(
  options: Partial<Record<ProductAttributeKey, string>>,
): string {
  return ATTRIBUTE_ORDER.map((k) => options[k])
    .filter(Boolean)
    .join(' · ')
}

interface VariantSelectorProps {
  variants: ProductVariant[]
  attributeKeys: ProductAttributeKey[]
  selection: Partial<Record<ProductAttributeKey, string>>
  selectedVariant: ProductVariant | null
  onSelect: (key: ProductAttributeKey, value: string) => void
}

export function VariantSelector({
  variants,
  attributeKeys,
  selection,
  selectedVariant,
  onSelect,
}: VariantSelectorProps) {
  const cols =
    attributeKeys.length >= 3
      ? 'sm:grid-cols-3'
      : attributeKeys.length === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-1'

  return (
    <div className="space-y-4">
      <div className={cn('grid gap-4', cols)}>
        {attributeKeys.map((key) => {
          const values = [
            ...new Set(
              variants
                .map((v) => v.options[key])
                .filter((v): v is string => Boolean(v)),
            ),
          ]

          return (
            <fieldset key={key} className="min-w-0 space-y-2">
              <Legend>{ATTRIBUTE_LABELS[key]}</Legend>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={ATTRIBUTE_LABELS[key]}
              >
                {values.map((value) => {
                  const available = isOptionAvailable(
                    variants,
                    key,
                    value,
                    selection,
                  )
                  const selected = selection[key] === value
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={!available}
                      aria-pressed={selected}
                      aria-disabled={!available}
                      onClick={() => onSelect(key, value)}
                      className={cn(
                        'min-h-[40px] rounded-(--radius-sm) border px-3.5 py-2 text-sm transition-[border-color,background-color,transform] duration-200',
                        selected
                          ? 'border-accent bg-accent/10 text-text'
                          : 'border-border bg-surface text-text hover:border-accent/60',
                        !available &&
                          'cursor-not-allowed opacity-40 line-through',
                      )}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )
        })}
      </div>

      {!selectedVariant ? (
        <p className="text-sm text-muted">Select options to check availability.</p>
      ) : null}
    </div>
  )
}

function Legend({ children }: { children: ReactNode }) {
  return (
    <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
      {children}
    </legend>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  Loader2Icon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  deleteProductImage,
  getProduct,
  isSlugTaken,
  isSupabaseConfigured,
  listCategoriesForAdmin,
  listCollectionsForAdmin,
  reorderImages,
  setPrimaryImage,
  updateImageAlt,
  uploadProductImage,
  upsertProduct,
  type AdminProductImageRow,
} from '@/lib/admin/api'
import { slugify } from '@/lib/admin/slug'
import { formatPKR } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProductAttributeKey } from '@/types'

type VariantDraft = {
  key: string
  id?: string
  sku: string
  size: string
  scent: string
  color: string
  price: string
  compare_at_price: string
  stock: string
  is_active: boolean
  initialStock?: number
}

function newVariantKey() {
  return `v-${crypto.randomUUID()}`
}

function emptyVariant(): VariantDraft {
  return {
    key: newVariantKey(),
    sku: '',
    size: '',
    scent: '',
    color: '',
    price: '',
    compare_at_price: '',
    stock: '0',
    is_active: true,
  }
}

function optionsFromDraft(v: VariantDraft): Partial<Record<ProductAttributeKey, string>> {
  const o: Partial<Record<ProductAttributeKey, string>> = {}
  if (v.size.trim()) o.size = v.size.trim()
  if (v.scent.trim()) o.scent = v.scent.trim()
  if (v.color.trim()) o.color = v.color.trim()
  return o
}

export function AdminProductFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [collectionIds, setCollectionIds] = useState<string[]>([])
  const [tags, setTags] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isBestseller, setIsBestseller] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()])
  const [images, setImages] = useState<AdminProductImageRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    document.title = isNew ? 'New product | Admin' : 'Edit product | Admin'
  }, [isNew])

  const productQuery = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => getProduct(id!),
    enabled: isSupabaseConfigured && !isNew && Boolean(id),
  })

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: listCategoriesForAdmin,
    enabled: isSupabaseConfigured,
  })

  const collectionsQuery = useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: listCollectionsForAdmin,
    enabled: isSupabaseConfigured,
  })

  useEffect(() => {
    const p = productQuery.data
    if (!p) return
    setName(p.name)
    setSlug(p.slug)
    setSlugTouched(true)
    setShortDescription(p.short_description)
    setDescription(p.description)
    setCategoryId(p.category_id ?? '')
    setCollectionIds(p.collection_ids)
    setTags(p.tags.join(', '))
    setIsFeatured(p.is_featured)
    setIsBestseller(p.is_bestseller)
    setIsActive(p.is_active)
    setSeoTitle(p.seo_title ?? '')
    setSeoDescription(p.seo_description ?? '')
    setImages(p.product_images)
    setVariants(
      p.product_variants.length
        ? p.product_variants.map((v) => ({
            key: v.id,
            id: v.id,
            sku: v.sku,
            size: v.options.size ?? '',
            scent: v.options.scent ?? '',
            color: v.options.color ?? '',
            price: String(v.price),
            compare_at_price: v.compare_at_price != null ? String(v.compare_at_price) : '',
            stock: String(v.stock),
            initialStock: v.stock,
            is_active: v.is_active,
          }))
        : [emptyVariant()],
    )
  }, [productQuery.data])

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(slugify(name))
    }
  }, [name, slugTouched])

  const skuSet = useMemo(() => {
    const s = new Set<string>()
    for (const v of variants) {
      const sku = v.sku.trim().toUpperCase()
      if (sku) s.add(sku)
    }
    return s
  }, [variants])

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null)
      if (!name.trim()) throw new Error('Name is required.')
      if (!slug.trim()) throw new Error('Slug is required.')
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
        throw new Error('Slug must be lowercase letters, numbers, and hyphens.')
      }
      if (await isSlugTaken(slug.trim(), isNew ? undefined : id)) {
        throw new Error('That slug is already used by another product.')
      }
      if (variants.length < 1) throw new Error('Add at least one variant.')

      const parsedVariants = variants.map((v, index) => {
        const price = Number(v.price)
        const stock = Number(v.stock)
        const compare = v.compare_at_price.trim() ? Number(v.compare_at_price) : null
        if (!v.sku.trim()) throw new Error(`Variant ${index + 1}: SKU is required.`)
        if (Number.isNaN(price) || price < 0) {
          throw new Error(`Variant ${index + 1}: price cannot be negative.`)
        }
        if (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
          throw new Error(`Variant ${index + 1}: stock must be a whole number ≥ 0.`)
        }
        if (compare != null && (Number.isNaN(compare) || compare < 0)) {
          throw new Error(`Variant ${index + 1}: compare-at price cannot be negative.`)
        }
        return {
          id: v.id,
          sku: v.sku.trim(),
          options: optionsFromDraft(v),
          price,
          compare_at_price: compare,
          stock,
          is_active: v.is_active,
          stockReason: v.id ? 'Updated from product form' : undefined,
        }
      })

      const skus = parsedVariants.map((v) => v.sku.toUpperCase())
      if (new Set(skus).size !== skus.length) {
        throw new Error('SKUs must be unique across variants.')
      }

      return upsertProduct({
        id: isNew ? undefined : id,
        slug: slug.trim(),
        name: name.trim(),
        short_description: shortDescription,
        description,
        category_id: categoryId || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        is_active: isActive,
        is_featured: isFeatured,
        is_bestseller: isBestseller,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        collection_ids: collectionIds,
        variants: parsedVariants,
      })
    },
    onSuccess: async (productId) => {
      setFormError(null)
      toast.success(isNew ? 'Product created' : 'Product saved')
      await qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      if (isNew) {
        navigate(`/admin/products/${productId}`, { replace: true })
      } else {
        await qc.invalidateQueries({ queryKey: ['admin', 'product', id] })
      }
    },
    onError: (err: Error) => {
      setFormError(err.message)
      toast.error(err.message)
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const toggleCollection = (cid: string) => {
    setCollectionIds((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid],
    )
  }

  const persistImages = async (next: AdminProductImageRow[]) => {
    setImages(next)
    if (!id || isNew) return
    await reorderImages(
      id,
      next.map((im) => im.id),
    )
  }

  const moveImage = async (index: number, dir: -1 | 1) => {
    const next = [...images]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    await persistImages(next)
  }

  const onImageDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = images.findIndex((i) => i.id === dragId)
    const to = images.findIndex((i) => i.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setDragId(null)
    await persistImages(next)
  }

  const onUpload = async (file: File) => {
    const productId = id
    if (!productId || isNew) {
      toast.error('Save the product before uploading images.')
      return
    }
    setUploading(true)
    try {
      const row = await uploadProductImage(productId, file, name)
      setImages((prev) => [...prev, row])
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onDeleteImage = async (image: AdminProductImageRow) => {
    try {
      await deleteProductImage(image)
      setImages((prev) => prev.filter((i) => i.id !== image.id))
      toast.success('Image removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const onSetPrimary = async (imageId: string) => {
    if (!id || isNew) return
    try {
      await setPrimaryImage(id, imageId)
      setImages((prev) =>
        prev.map((im) => ({ ...im, is_primary: im.id === imageId })),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not set primary')
    }
  }

  if (!isSupabaseConfigured) {
    return <p className="text-sm text-muted">Supabase is not configured.</p>
  }

  if (!isNew && productQuery.isLoading) {
    return <Skeleton className="h-96 w-full max-w-4xl rounded-(--radius-card)" />
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {isNew ? 'New product' : 'Edit product'}
          </h1>
          <Button variant="ghost" size="sm" className="mt-1 px-0" asChild>
            <Link to="/admin/products">← Products</Link>
          </Button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-10" noValidate>
        {formError ? (
          <div
            role="alert"
            className="rounded-(--radius-sm) border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
          >
            {formError}
          </div>
        ) : null}

        <section className="space-y-4 rounded-(--radius-card) border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="flex h-11 w-full rounded-(--radius-sm) border border-border bg-surface px-3 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">— None —</option>
                {(categoriesQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="short">Short description</Label>
              <Input
                id="short"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <textarea
                id="desc"
                rows={5}
                className="w-full rounded-(--radius-sm) border border-border bg-surface px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
              Active (visible when published)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isFeatured}
                onCheckedChange={(c) => setIsFeatured(c === true)}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isBestseller}
                onCheckedChange={(c) => setIsBestseller(c === true)}
              />
              Bestseller
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Collections</p>
            <div className="flex flex-wrap gap-3">
              {(collectionsQuery.data ?? []).map((col) => (
                <label key={col.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={collectionIds.includes(col.id)}
                    onCheckedChange={() => toggleCollection(col.id)}
                  />
                  {col.name}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-(--radius-card) border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">SEO</h2>
          <div className="space-y-2">
            <Label htmlFor="seo-title">SEO title</Label>
            <Input id="seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo-desc">SEO description</Label>
            <textarea
              id="seo-desc"
              rows={2}
              className="w-full rounded-(--radius-sm) border border-border bg-surface px-3 py-2 text-sm"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
          </div>
        </section>

        {!isNew ? (
          <section className="space-y-4 rounded-(--radius-card) border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-semibold">Images</h2>
            <p className="text-xs text-muted">Drag to reorder. Images are compressed to WebP on upload.</p>
            <ul className="space-y-3">
              {images.map((im, idx) => (
                <li
                  key={im.id}
                  draggable
                  onDragStart={() => setDragId(im.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void onImageDrop(im.id)}
                  className="flex flex-wrap items-center gap-3 rounded-(--radius-sm) border border-border bg-background p-3"
                >
                  <GripVerticalIcon className="size-4 text-muted" aria-hidden />
                  <img src={im.url} alt={im.alt} className="size-16 rounded object-cover" />
                  <Input
                    className="max-w-xs flex-1"
                    value={im.alt}
                    onChange={(e) =>
                      setImages((prev) =>
                        prev.map((x) => (x.id === im.id ? { ...x, alt: e.target.value } : x)),
                      )
                    }
                    onBlur={() => {
                      void updateImageAlt(im.id, im.alt).catch((err: Error) =>
                        toast.error(err.message),
                      )
                    }}
                    aria-label="Alt text"
                  />
                  {im.is_primary ? (
                    <span className="text-xs font-medium text-accent">Primary</span>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" onClick={() => void onSetPrimary(im.id)}>
                      Set primary
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={() => void moveImage(idx, -1)}>
                    <ArrowUpIcon className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => void moveImage(idx, 1)}>
                    <ArrowDownIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-800"
                    onClick={() => void onDeleteImage(im)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <div>
              <Label htmlFor="upload" className="sr-only">
                Upload image
              </Label>
              <Input
                id="upload"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onUpload(f)
                  e.target.value = ''
                }}
              />
              {uploading ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                  <Loader2Icon className="size-4 animate-spin" /> Compressing…
                </p>
              ) : null}
            </div>
          </section>
        ) : (
          <p className="text-sm text-muted">Save the product once to add images.</p>
        )}

        <section className="space-y-4 rounded-(--radius-card) border border-border bg-surface p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Variants</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setVariants((v) => [...v, emptyVariant()])}
            >
              Add variant
            </Button>
          </div>
          <div className="space-y-6">
            {variants.map((v, idx) => (
              <div
                key={v.key}
                className="grid gap-3 rounded-(--radius-sm) border border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div className="space-y-1 sm:col-span-2 lg:col-span-3 flex justify-between">
                  <span className="text-sm font-medium">Variant {idx + 1}</span>
                  {variants.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVariants((all) => all.filter((x) => x.key !== v.key))}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label>SKU</Label>
                  <Input
                    value={v.sku}
                    onChange={(e) =>
                      setVariants((all) =>
                        all.map((x) => (x.key === v.key ? { ...x, sku: e.target.value } : x)),
                      )
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Price (PKR)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={v.price}
                    onChange={(e) =>
                      setVariants((all) =>
                        all.map((x) => (x.key === v.key ? { ...x, price: e.target.value } : x)),
                      )
                    }
                    required
                  />
                  {v.price ? (
                    <p className="text-xs text-muted">{formatPKR(Number(v.price) || 0)}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label>Compare at</Label>
                  <Input
                    type="number"
                    min={0}
                    value={v.compare_at_price}
                    onChange={(e) =>
                      setVariants((all) =>
                        all.map((x) =>
                          x.key === v.key ? { ...x, compare_at_price: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    min={0}
                    value={v.stock}
                    onChange={(e) =>
                      setVariants((all) =>
                        all.map((x) => (x.key === v.key ? { ...x, stock: e.target.value } : x)),
                      )
                    }
                    required
                  />
                  {v.id ? (
                    <p className="text-xs text-muted">Stock changes use inventory audit on save.</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label>Size</Label>
                  <Input
                    value={v.size}
                    onChange={(e) =>
                      setVariants((all) =>
                        all.map((x) => (x.key === v.key ? { ...x, size: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Scent</Label>
                  <Input
                    value={v.scent}
                    onChange={(e) =>
                      setVariants((all) =>
                        all.map((x) => (x.key === v.key ? { ...x, scent: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Color</Label>
                  <Input
                    value={v.color}
                    onChange={(e) =>
                      setVariants((all) =>
                        all.map((x) => (x.key === v.key ? { ...x, color: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox
                    checked={v.is_active}
                    onCheckedChange={(c) =>
                      setVariants((all) =>
                        all.map((x) =>
                          x.key === v.key ? { ...x, is_active: c === true } : x,
                        ),
                      )
                    }
                  />
                  Variant active
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">{skuSet.size} unique SKU(s) on this form.</p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save product'}
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link to="/admin/products">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

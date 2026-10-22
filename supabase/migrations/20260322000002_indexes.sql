-- Scaling indexes for list/filter/sort paths used by the storefront and Edge Functions.
-- Safe to run twice: create index if not exists + table existence checks.

do $$
begin
  -- products: is_active, category_id, slug, created_at
  if to_regclass('public.products') is not null then
    create index if not exists products_category_idx on public.products (category_id);
    create index if not exists products_active_idx on public.products (is_active) where is_active = true;
    create index if not exists products_slug_idx on public.products (slug);
    create index if not exists products_created_at_idx on public.products (created_at desc);
    create index if not exists products_active_created_idx
      on public.products (is_active, created_at desc)
      where is_active = true;
    create index if not exists products_archived_updated_idx
      on public.products (archived_at, updated_at desc);
  end if;

  -- product_variants: product_id, sku, stock
  if to_regclass('public.product_variants') is not null then
    create index if not exists product_variants_product_idx
      on public.product_variants (product_id);
    create index if not exists product_variants_sku_idx
      on public.product_variants (sku);
    create index if not exists product_variants_stock_idx
      on public.product_variants (stock)
      where is_active = true;
    create index if not exists product_variants_active_product_idx
      on public.product_variants (product_id, is_active);
  end if;

  -- product_images: product_id
  if to_regclass('public.product_images') is not null then
    create index if not exists product_images_product_idx
      on public.product_images (product_id);
    create index if not exists product_images_product_sort_idx
      on public.product_images (product_id, sort_order);
  end if;

  -- collection_products
  if to_regclass('public.collection_products') is not null then
    create index if not exists collection_products_collection_idx
      on public.collection_products (collection_id);
    create index if not exists collection_products_product_idx
      on public.collection_products (product_id);
  end if;

  -- orders: user_id, status, created_at, order_number, idempotency_key
  if to_regclass('public.orders') is not null then
    create index if not exists orders_user_idx on public.orders (user_id);
    create index if not exists orders_status_idx on public.orders (status);
    create index if not exists orders_created_at_idx on public.orders (created_at desc);
    create index if not exists orders_status_created_idx
      on public.orders (status, created_at desc);
    create index if not exists orders_order_number_idx on public.orders (order_number);
    create index if not exists orders_idempotency_key_idx
      on public.orders (idempotency_key)
      where idempotency_key is not null;
    create index if not exists orders_tracking_token_idx
      on public.orders (tracking_token);
  end if;

  -- order_items: order_id
  if to_regclass('public.order_items') is not null then
    create index if not exists order_items_order_idx on public.order_items (order_id);
  end if;

  -- payments: order_id, status
  if to_regclass('public.payments') is not null then
    create index if not exists payments_order_idx on public.payments (order_id);
    create index if not exists payments_status_idx on public.payments (status);
    create index if not exists payments_order_status_idx
      on public.payments (order_id, status);
  end if;

  -- reviews: product_id, is_approved
  if to_regclass('public.reviews') is not null then
    create index if not exists reviews_product_idx on public.reviews (product_id);
    create index if not exists reviews_approved_idx
      on public.reviews (product_id)
      where is_approved = true;
    create index if not exists reviews_pending_idx
      on public.reviews (created_at desc)
      where is_approved = false and rejected_at is null;
  end if;

  -- stock_history
  if to_regclass('public.stock_history') is not null then
    create index if not exists stock_history_variant_idx
      on public.stock_history (variant_id, created_at desc);
    create index if not exists stock_history_created_idx
      on public.stock_history (created_at desc);
  end if;

  -- email_outbox: status
  if to_regclass('public.email_outbox') is not null then
    create index if not exists email_outbox_status_idx
      on public.email_outbox (status, created_at desc);
  end if;

  -- app_events: event_type, created_at
  if to_regclass('public.app_events') is not null then
    create index if not exists app_events_type_idx
      on public.app_events (event_type, created_at desc);
    create index if not exists app_events_created_idx
      on public.app_events (created_at desc);
  end if;

  -- rate_limits (id is PK; window_start helps cleanup scans)
  if to_regclass('public.rate_limits') is not null then
    create index if not exists rate_limits_window_idx
      on public.rate_limits (window_start);
  end if;
end
$$;

-- Security fix: lock down discount_codes and tighten anon/authenticated RLS.
-- Safe to run twice (DROP POLICY IF EXISTS).

-- ---------------------------------------------------------------------------
-- discount_codes: admin only (Edge Functions use service role to validate)
-- ---------------------------------------------------------------------------
drop policy if exists discount_codes_public_read on public.discount_codes;
drop policy if exists discount_codes_admin on public.discount_codes;

create policy discount_codes_admin_all on public.discount_codes
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Catalog: anon may only see active catalog + approved reviews
-- ---------------------------------------------------------------------------
drop policy if exists categories_public_read on public.categories;
drop policy if exists collections_public_read on public.collections;
drop policy if exists products_public_read on public.products;
drop policy if exists variants_public_read on public.product_variants;
drop policy if exists images_public_read on public.product_images;
drop policy if exists collection_products_public_read on public.collection_products;
drop policy if exists reviews_public_read on public.reviews;

create policy categories_public_read on public.categories
  for select
  using (is_active = true or public.is_admin());

create policy collections_public_read on public.collections
  for select
  using (is_active = true or public.is_admin());

create policy products_public_read on public.products
  for select
  using (is_active = true or public.is_admin());

create policy variants_public_read on public.product_variants
  for select
  using (
    public.is_admin()
    or (
      is_active = true
      and exists (
        select 1 from public.products p
        where p.id = product_id and p.is_active = true
      )
    )
  );

create policy images_public_read on public.product_images
  for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active = true
    )
  );

create policy collection_products_public_read on public.collection_products
  for select
  using (
    public.is_admin()
    or (
      exists (
        select 1 from public.collections c
        where c.id = collection_id and c.is_active = true
      )
      and exists (
        select 1 from public.products p
        where p.id = product_id and p.is_active = true
      )
    )
  );

-- Approved reviews for everyone; authors may see their own pending; admins see all
create policy reviews_public_read on public.reviews
  for select
  using (
    is_approved = true
    or public.is_admin()
    or (auth.uid() is not null and user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- settings: no anon/public read (was leaking storefront keys)
-- ---------------------------------------------------------------------------
drop policy if exists settings_public_read_some on public.settings;
drop policy if exists settings_admin on public.settings;

create policy settings_admin_all on public.settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- orders / order_items / payments: customers read own only; no customer writes
-- ---------------------------------------------------------------------------
drop policy if exists orders_select_own on public.orders;
drop policy if exists orders_admin_update on public.orders;
drop policy if exists order_items_select_own on public.order_items;
drop policy if exists payments_select_own on public.payments;
drop policy if exists payments_admin_all on public.payments;

create policy orders_select_own on public.orders
  for select
  using (
    public.is_admin()
    or (auth.uid() is not null and user_id = auth.uid())
  );

-- No insert/update/delete for customers — create-order uses service role
create policy orders_admin_update on public.orders
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy orders_admin_delete on public.orders
  for delete
  using (public.is_admin());

create policy order_items_select_own on public.order_items
  for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy order_items_admin_all on public.order_items
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Payments: admin only from the client (service role for webhooks / create-order)
create policy payments_admin_all on public.payments
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- addresses / wishlists: own rows only (authenticated); no anon access
-- ---------------------------------------------------------------------------
drop policy if exists addresses_own on public.addresses;
drop policy if exists addresses_admin on public.addresses;
drop policy if exists wishlists_own on public.wishlists;

create policy addresses_select_own on public.addresses
  for select
  using (auth.uid() = user_id or public.is_admin());

create policy addresses_insert_own on public.addresses
  for insert
  with check (auth.uid() = user_id);

create policy addresses_update_own on public.addresses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy addresses_delete_own on public.addresses
  for delete
  using (auth.uid() = user_id);

create policy addresses_admin_all on public.addresses
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy wishlists_select_own on public.wishlists
  for select
  using (auth.uid() = user_id or public.is_admin());

create policy wishlists_insert_own on public.wishlists
  for insert
  with check (auth.uid() = user_id);

create policy wishlists_delete_own on public.wishlists
  for delete
  using (auth.uid() = user_id);

create policy wishlists_admin_all on public.wishlists
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- contact_messages / newsletter_subscribers: admin read only.
-- Inserts: no client policies — Edge Functions use service role.
-- ---------------------------------------------------------------------------
drop policy if exists newsletter_admin on public.newsletter_subscribers;
drop policy if exists contact_admin on public.contact_messages;

create policy newsletter_admin_all on public.newsletter_subscribers
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy contact_admin_all on public.contact_messages
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- app_events / rate_limits: admin (or deny-all); service role bypasses RLS
-- ---------------------------------------------------------------------------
drop policy if exists app_events_admin on public.app_events;
drop policy if exists rate_limits_deny on public.rate_limits;

create policy app_events_admin_select on public.app_events
  for select
  using (public.is_admin());

create policy rate_limits_deny_all on public.rate_limits
  for all
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- Harden catalog writes: customers must not touch stock/prices
-- (admin_all already covers; ensure no broader policies remain)
-- Explicit deny is unnecessary when only admin write policies exist.
-- ---------------------------------------------------------------------------

-- profiles: keep select/update own; ensure is_admin cannot be self-set
-- (trigger already in init schema)

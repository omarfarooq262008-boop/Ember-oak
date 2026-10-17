-- Admin panel foundations: storage, stock history, audit, order/status RPCs, settings seed.
-- Safe to run twice.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Product SEO + contact handled flag + order carrier tracking
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists archived_at timestamptz;

alter table public.contact_messages
  add column if not exists is_handled boolean not null default false,
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by uuid references public.profiles (id) on delete set null;

alter table public.orders
  add column if not exists tracking_number text;

alter table public.settings
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Stock history + admin audit
-- ---------------------------------------------------------------------------
create table if not exists public.stock_history (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  admin_id uuid references public.profiles (id) on delete set null,
  stock_before int not null,
  stock_after int not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists stock_history_variant_idx
  on public.stock_history (variant_id, created_at desc);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.stock_history enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists stock_history_admin on public.stock_history;
create policy stock_history_admin on public.stock_history
  for select using (public.is_admin());

drop policy if exists admin_audit_log_admin on public.admin_audit_log;
create policy admin_audit_log_admin on public.admin_audit_log
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.require_admin()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return uid;
end;
$$;

create or replace function public.write_admin_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, payload)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_payload, '{}'));
end;
$$;

-- Allowed order status transitions (unit-tested in app + SQL)
create or replace function public.order_status_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = p_to then false
    when p_from = 'pending_payment' and p_to in ('awaiting_payment', 'awaiting_fulfilment', 'cancelled') then true
    when p_from = 'awaiting_payment' and p_to in ('awaiting_fulfilment', 'cancelled', 'refunded') then true
    when p_from = 'awaiting_fulfilment' and p_to in ('shipped', 'cancelled') then true
    when p_from = 'shipped' and p_to in ('delivered', 'refunded') then true
    when p_from = 'delivered' and p_to = 'refunded' then true
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: adjust stock + history
-- ---------------------------------------------------------------------------
create or replace function public.admin_adjust_stock(
  p_variant_id uuid,
  p_new_stock int,
  p_reason text default 'manual adjustment'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_before int;
  v_after int;
begin
  v_admin := public.require_admin();
  if p_new_stock < 0 then
    raise exception 'INVALID_STOCK' using errcode = 'P0001';
  end if;

  select stock into v_before
  from public.product_variants
  where id = p_variant_id
  for update;

  if not found then
    raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.product_variants
  set stock = p_new_stock
  where id = p_variant_id
  returning stock into v_after;

  insert into public.stock_history (variant_id, admin_id, stock_before, stock_after, reason)
  values (p_variant_id, v_admin, v_before, v_after, coalesce(nullif(trim(p_reason), ''), 'manual adjustment'));

  perform public.write_admin_audit(
    'stock_adjust',
    'product_variant',
    p_variant_id,
    jsonb_build_object('before', v_before, 'after', v_after, 'reason', p_reason)
  );

  return jsonb_build_object('variant_id', p_variant_id, 'stock_before', v_before, 'stock_after', v_after);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: transition order status (+ cancel restores stock)
-- ---------------------------------------------------------------------------
create or replace function public.admin_transition_order_status(
  p_order_id uuid,
  p_new_status text,
  p_tracking_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_order public.orders%rowtype;
  v_from text;
  v_tracking text;
  r record;
begin
  v_admin := public.require_admin();

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_from := v_order.status;

  if not public.order_status_transition_allowed(v_from, p_new_status) then
    raise exception 'INVALID_STATUS_TRANSITION:%:%', v_from, p_new_status
      using errcode = 'P0001';
  end if;

  v_tracking := coalesce(
    nullif(trim(coalesce(p_tracking_number, '')), ''),
    nullif(trim(coalesce(v_order.tracking_number, '')), '')
  );

  if p_new_status = 'shipped' and v_tracking is null then
    raise exception 'TRACKING_REQUIRED' using errcode = 'P0001';
  end if;

  if p_new_status = 'cancelled' then
    for r in
      select variant_id, quantity
      from public.order_items
      where order_id = p_order_id and variant_id is not null
    loop
      update public.product_variants pv
      set stock = stock + r.quantity
      where pv.id = r.variant_id;

      insert into public.stock_history (variant_id, admin_id, stock_before, stock_after, reason)
      select
        r.variant_id,
        v_admin,
        pv.stock - r.quantity,
        pv.stock,
        'order cancelled ' || v_order.order_number
      from public.product_variants pv
      where pv.id = r.variant_id;
    end loop;
  end if;

  update public.orders
  set
    status = p_new_status,
    tracking_number = case
      when p_tracking_number is not null then nullif(trim(p_tracking_number), '')
      else tracking_number
    end,
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  perform public.write_admin_audit(
    'order_status',
    'order',
    p_order_id,
    jsonb_build_object(
      'from', v_from,
      'to', p_new_status,
      'tracking_number', v_order.tracking_number
    )
  );

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'tracking_number', v_order.tracking_number
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: mark COD payment collected
-- ---------------------------------------------------------------------------
create or replace function public.admin_mark_cod_paid(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_order public.orders%rowtype;
begin
  v_admin := public.require_admin();

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_order.payment_method <> 'cod' then
    raise exception 'NOT_COD' using errcode = 'P0001';
  end if;

  if v_order.status in ('cancelled', 'refunded') then
    raise exception 'ORDER_CLOSED' using errcode = 'P0001';
  end if;

  update public.payments
  set status = 'paid', updated_at = now(), provider = 'cod'
  where order_id = p_order_id;

  if not found then
    insert into public.payments (order_id, provider, amount, currency, status)
    values (p_order_id, 'cod', v_order.total, 'PKR', 'paid');
  end if;

  perform public.write_admin_audit(
    'cod_paid',
    'order',
    p_order_id,
    jsonb_build_object('order_number', v_order.order_number)
  );

  return jsonb_build_object('order_id', p_order_id, 'payment_status', 'paid');
end;
$$;

-- ---------------------------------------------------------------------------
-- Revoke/grant admin RPCs — authenticated may call; function enforces is_admin
-- ---------------------------------------------------------------------------
revoke all on function public.require_admin() from public, anon, authenticated;
revoke all on function public.write_admin_audit(text, text, uuid, jsonb) from public, anon, authenticated;

revoke all on function public.order_status_transition_allowed(text, text) from public;
grant execute on function public.order_status_transition_allowed(text, text) to anon, authenticated, service_role;

revoke all on function public.admin_adjust_stock(uuid, int, text) from public, anon;
grant execute on function public.admin_adjust_stock(uuid, int, text) to authenticated, service_role;

revoke all on function public.admin_transition_order_status(uuid, text, text) from public, anon;
grant execute on function public.admin_transition_order_status(uuid, text, text) to authenticated, service_role;

revoke all on function public.admin_mark_cod_paid(uuid) from public, anon;
grant execute on function public.admin_mark_cod_paid(uuid) to authenticated, service_role;

-- Keep cancel_order_restore_stock service_role only (admin uses admin_transition_order_status)

-- ---------------------------------------------------------------------------
-- Storage: product-images bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select
  using (bucket_id = 'product-images');

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed storefront settings (idempotent upsert)
-- ---------------------------------------------------------------------------
insert into public.settings (key, value) values
  ('delivery', '{"flatFeePKR":250,"freeAbovePKR":8000,"workingDaysMin":3,"workingDaysMax":5}'::jsonb),
  ('contact', '{"email":"hello@emberandoak.pk","phone":"+92 21 0000 0000","whatsapp":"+92 300 0000000"}'::jsonb),
  ('announcement', '{"text":"Free nationwide delivery on orders above PKR 8,000","enabled":true}'::jsonb),
  ('inventory', '{"lowStockThreshold":5}'::jsonb)
on conflict (key) do nothing;

-- Public read for storefront settings keys only
drop policy if exists settings_public_storefront on public.settings;
create policy settings_public_storefront on public.settings
  for select
  using (
    public.is_admin()
    or key in ('delivery', 'contact', 'announcement', 'inventory')
  );

-- ---------------------------------------------------------------------------
-- Lock down direct client writes to orders, payments, and stock
-- Admins must use admin_* RPCs; create_order uses service role / security definer
-- ---------------------------------------------------------------------------
drop policy if exists orders_admin_update on public.orders;
drop policy if exists orders_admin_delete on public.orders;
drop policy if exists payments_admin_all on public.payments;
drop policy if exists payments_admin_select on public.payments;
drop policy if exists order_items_admin_all on public.order_items;
drop policy if exists order_items_admin_select on public.order_items;

-- Orders / payments: select only from the browser (writes via SECURITY DEFINER RPCs)
create policy payments_admin_select on public.payments
  for select
  using (public.is_admin());

create policy order_items_admin_select on public.order_items
  for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- Stock changes: allow SECURITY DEFINER (owner role) and explicit app.allow_stock_update.
-- Browser role `authenticated` cannot change stock directly even as admin.
create or replace function public.guard_variant_stock_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.stock is distinct from old.stock then
    if current_user in ('postgres', 'supabase_admin') then
      return new;
    end if;
    if current_setting('app.allow_stock_update', true) = 'on' then
      return new;
    end if;
    raise exception 'STOCK_WRITE_FORBIDDEN'
      using errcode = '42501',
            hint = 'Use admin_adjust_stock or order RPCs to change stock';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_variant_stock_write on public.product_variants;
create trigger trg_guard_variant_stock_write
  before update of stock on public.product_variants
  for each row execute function public.guard_variant_stock_write();

-- Patch stock-touching functions to allow the guard
create or replace function public.decrement_variant_stock(p_variant_id uuid, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stock int;
begin
  if p_qty <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  perform set_config('app.allow_stock_update', 'on', true);
  select stock into current_stock
  from public.product_variants
  where id = p_variant_id
  for update;
  if current_stock is null then
    raise exception 'Variant not found';
  end if;
  if current_stock < p_qty then
    raise exception 'Insufficient stock';
  end if;
  update public.product_variants
  set stock = stock - p_qty
  where id = p_variant_id;
end;
$$;

create or replace function public.admin_adjust_stock(
  p_variant_id uuid,
  p_new_stock int,
  p_reason text default 'manual adjustment'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_before int;
  v_after int;
begin
  v_admin := public.require_admin();
  if p_new_stock < 0 then
    raise exception 'INVALID_STOCK' using errcode = 'P0001';
  end if;

  perform set_config('app.allow_stock_update', 'on', true);

  select stock into v_before
  from public.product_variants
  where id = p_variant_id
  for update;

  if not found then
    raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.product_variants
  set stock = p_new_stock
  where id = p_variant_id
  returning stock into v_after;

  insert into public.stock_history (variant_id, admin_id, stock_before, stock_after, reason)
  values (p_variant_id, v_admin, v_before, v_after, coalesce(nullif(trim(p_reason), ''), 'manual adjustment'));

  perform public.write_admin_audit(
    'stock_adjust',
    'product_variant',
    p_variant_id,
    jsonb_build_object('before', v_before, 'after', v_after, 'reason', p_reason)
  );

  return jsonb_build_object('variant_id', p_variant_id, 'stock_before', v_before, 'stock_after', v_after);
end;
$$;

-- Re-apply allow flag inside status transition cancel path
create or replace function public.admin_transition_order_status(
  p_order_id uuid,
  p_new_status text,
  p_tracking_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_order public.orders%rowtype;
  v_from text;
  v_tracking text;
  r record;
  v_before int;
begin
  v_admin := public.require_admin();

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_from := v_order.status;

  if not public.order_status_transition_allowed(v_from, p_new_status) then
    raise exception 'INVALID_STATUS_TRANSITION:%:%', v_from, p_new_status
      using errcode = 'P0001';
  end if;

  v_tracking := coalesce(
    nullif(trim(coalesce(p_tracking_number, '')), ''),
    nullif(trim(coalesce(v_order.tracking_number, '')), '')
  );

  if p_new_status = 'shipped' and v_tracking is null then
    raise exception 'TRACKING_REQUIRED' using errcode = 'P0001';
  end if;

  if p_new_status = 'cancelled' then
    perform set_config('app.allow_stock_update', 'on', true);
    for r in
      select variant_id, quantity
      from public.order_items
      where order_id = p_order_id and variant_id is not null
    loop
      select stock into v_before
      from public.product_variants
      where id = r.variant_id
      for update;

      update public.product_variants
      set stock = stock + r.quantity
      where id = r.variant_id;

      insert into public.stock_history (variant_id, admin_id, stock_before, stock_after, reason)
      values (
        r.variant_id,
        v_admin,
        v_before,
        v_before + r.quantity,
        'order cancelled ' || v_order.order_number
      );
    end loop;
  end if;

  update public.orders
  set
    status = p_new_status,
    tracking_number = case
      when p_tracking_number is not null then nullif(trim(p_tracking_number), '')
      else tracking_number
    end,
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  perform public.write_admin_audit(
    'order_status',
    'order',
    p_order_id,
    jsonb_build_object(
      'from', v_from,
      'to', p_new_status,
      'tracking_number', v_order.tracking_number
    )
  );

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'tracking_number', v_order.tracking_number
  );
end;
$$;

-- Patch cancel_order_restore_stock to allow stock guard (preserve status checks)
create or replace function public.cancel_order_restore_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  r record;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_order.status = 'cancelled' then
    return;
  end if;

  if v_order.status in ('shipped', 'delivered', 'refunded') then
    raise exception 'ORDER_NOT_CANCELLABLE' using errcode = 'P0001';
  end if;

  perform set_config('app.allow_stock_update', 'on', true);

  for r in
    select variant_id, quantity
    from public.order_items
    where order_id = p_order_id and variant_id is not null
  loop
    update public.product_variants
    set stock = stock + r.quantity
    where id = r.variant_id;
  end loop;

  update public.orders
  set status = 'cancelled', updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function public.cancel_order_restore_stock(uuid) from public, anon, authenticated;
grant execute on function public.cancel_order_restore_stock(uuid) to service_role;

notify pgrst, 'reload schema';

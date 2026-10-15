-- Ember & Oak — initial schema, constraints, indexes, RLS
-- Apply via Supabase SQL editor or: supabase db push

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Roles / profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent users from elevating themselves to admin
create or replace function public.prevent_is_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin then
    if auth.uid() is distinct from old.id or not coalesce(old.is_admin, false) then
      -- Only existing admins (via service role / other admin) should change this;
      -- block non-admins changing their own flag
      if not exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
      ) then
        raise exception 'Cannot modify is_admin';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_is_admin_escalation on public.profiles;
create trigger trg_prevent_is_admin_escalation
  before update on public.profiles
  for each row execute function public.prevent_is_admin_escalation();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  featured boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  description text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  materials text,
  dimensions text,
  care text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_bestseller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active) where is_active = true;
create index if not exists products_tags_gin on public.products using gin (tags);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  options jsonb not null default '{}',
  price numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images (product_id);

create table if not exists public.collection_products (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order int not null default 0,
  primary key (collection_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  province text not null,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses (user_id);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity int not null check (quantity > 0),
  unique (cart_id, variant_id)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Discounts & commerce
-- ---------------------------------------------------------------------------
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(12, 2) not null check (value >= 0),
  min_spend numeric(12, 2) default 0 check (min_spend is null or min_spend >= 0),
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  phone text not null,
  status text not null check (status in (
    'pending_payment',
    'awaiting_payment',
    'awaiting_fulfilment',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
  )),
  payment_method text not null check (payment_method in ('cod', 'bank_transfer', 'card')),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(12, 2) not null check (total >= 0),
  discount_code text,
  shipping_name text not null,
  shipping_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_province text not null,
  shipping_postal text,
  tracking_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  idempotency_key text unique,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_email_idx on public.orders (lower(email));
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  variant_label text not null default '',
  sku text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'mock',
  provider_ref text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'PKR',
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (order_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null,
  is_verified boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists reviews_product_idx on public.reviews (product_id);
create index if not exists reviews_approved_idx on public.reviews (product_id) where is_approved = true;

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'website',
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid,
  payload jsonb not null default '{}',
  ip inet,
  created_at timestamptz not null default now()
);

create index if not exists app_events_type_idx on public.app_events (event_type, created_at desc);

-- Rate limiting helper table
create table if not exists public.rate_limits (
  id text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Atomic stock decrement (used by create-order edge function)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.collection_products enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.discount_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;
alter table public.settings enable row level security;
alter table public.app_events enable row level security;
alter table public.rate_limits enable row level security;

-- Profiles
create policy profiles_select_own on public.profiles for select using (
  auth.uid() = id or public.is_admin()
);
create policy profiles_update_own on public.profiles for update using (
  auth.uid() = id
) with check (auth.uid() = id);

-- Public catalog reads
create policy categories_public_read on public.categories for select using (is_active = true or public.is_admin());
create policy collections_public_read on public.collections for select using (is_active = true or public.is_admin());
create policy products_public_read on public.products for select using (is_active = true or public.is_admin());
create policy variants_public_read on public.product_variants for select using (
  is_active = true and exists (
    select 1 from public.products p where p.id = product_id and p.is_active = true
  ) or public.is_admin()
);
create policy images_public_read on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and p.is_active = true)
  or public.is_admin()
);
create policy collection_products_public_read on public.collection_products for select using (true);

-- Admin write catalog
create policy categories_admin_all on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy collections_admin_all on public.collections for all using (public.is_admin()) with check (public.is_admin());
create policy products_admin_all on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy variants_admin_all on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy images_admin_all on public.product_images for all using (public.is_admin()) with check (public.is_admin());
create policy collection_products_admin_all on public.collection_products for all using (public.is_admin()) with check (public.is_admin());

-- Addresses
create policy addresses_own on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy addresses_admin on public.addresses for select using (public.is_admin());

-- Carts
create policy carts_own on public.carts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy cart_items_own on public.cart_items for all using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
);

-- Wishlists
create policy wishlists_own on public.wishlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Discount codes: public can read active (for UI hints); only admin manages
create policy discount_codes_public_read on public.discount_codes for select using (
  (is_active = true) or public.is_admin()
);
create policy discount_codes_admin on public.discount_codes for all using (public.is_admin()) with check (public.is_admin());

-- Orders: customers see only their own; no public insert (edge function uses service role)
create policy orders_select_own on public.orders for select using (
  (auth.uid() is not null and user_id = auth.uid())
  or public.is_admin()
);
create policy order_items_select_own on public.order_items for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);
create policy payments_select_own on public.payments for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy payments_admin_all on public.payments for all using (public.is_admin()) with check (public.is_admin());

-- Reviews: public reads approved only
create policy reviews_public_read on public.reviews for select using (
  is_approved = true or public.is_admin() or (user_id is not null and user_id = auth.uid())
);
create policy reviews_admin on public.reviews for all using (public.is_admin()) with check (public.is_admin());
-- Inserts go through edge function / moderated path; allow authenticated insert of unapproved
create policy reviews_insert_own on public.reviews for insert to authenticated with check (
  auth.uid() = user_id and is_approved = false
);

-- Newsletter / contact: no public read; inserts via edge functions (service role) preferred
create policy newsletter_admin on public.newsletter_subscribers for all using (public.is_admin()) with check (public.is_admin());
create policy contact_admin on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());

-- Settings / events / rate limits: admin or service role only
create policy settings_admin on public.settings for all using (public.is_admin()) with check (public.is_admin());
create policy settings_public_read_some on public.settings for select using (
  key in ('storefront', 'announcement') or public.is_admin()
);
create policy app_events_admin on public.app_events for select using (public.is_admin());
create policy rate_limits_deny on public.rate_limits for all using (false);

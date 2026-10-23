-- RLS proofs for Ember & Oak security fix.
-- Run in Supabase SQL Editor AFTER migrations 000001 and 000002.
-- Entire script runs in a transaction and ROLLs BACK — no lasting data.

begin;

-- Fake users (JWT claim simulation via request.jwt.claim.sub is not set here;
-- we use set local role + set request.jwt.claim for auth.uid()).
create extension if not exists "pgcrypto";

-- Helpers: set JWT claims so auth.uid() works under authenticated role
create or replace function pg_temp.set_auth_uid(uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

create or replace function pg_temp.clear_auth()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end;
$$;

-- Seed auth users (profiles trigger may auto-create rows)
do $$
declare
  v_user uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_other uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_cat uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_col uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_prod uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_prod_inactive uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  v_var uuid := '11111111-1111-4111-8111-111111111111';
  v_order uuid := '22222222-2222-4222-8222-222222222222';
  v_dc uuid := '33333333-3333-4333-8333-333333333333';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
    (
      '00000000-0000-0000-0000-000000000000', v_user,
      'authenticated', 'authenticated', 'buyer@example.com',
      crypt('test-password', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_other,
      'authenticated', 'authenticated', 'other@example.com',
      crypt('test-password', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now()
    )
  on conflict (id) do nothing;

  insert into public.profiles (id, email, full_name, is_admin)
  values
    (v_user, 'buyer@example.com', 'Buyer', false),
    (v_other, 'other@example.com', 'Other', false)
  on conflict (id) do update set is_admin = excluded.is_admin;

  insert into public.categories (id, slug, name, is_active)
  values (v_cat, 'rls-test-cat', 'RLS Test Cat', true)
  on conflict (id) do nothing;

  insert into public.collections (id, slug, name, is_active)
  values (v_col, 'rls-test-col', 'RLS Test Col', true)
  on conflict (id) do nothing;

  insert into public.products (id, slug, name, category_id, is_active)
  values
    (v_prod, 'rls-test-product', 'RLS Product', v_cat, true),
    (v_prod_inactive, 'rls-test-inactive', 'Inactive', v_cat, false)
  on conflict (id) do nothing;

  insert into public.product_variants (id, product_id, sku, price, stock, is_active)
  values (v_var, v_prod, 'RLS-SKU-1', 1000, 5, true)
  on conflict (id) do nothing;

  insert into public.product_images (product_id, url, alt, is_primary)
  values (v_prod, 'https://example.com/rls.jpg', 'RLS', true);

  insert into public.collection_products (collection_id, product_id)
  values (v_col, v_prod)
  on conflict do nothing;

  insert into public.discount_codes (id, code, type, value, is_active)
  values (v_dc, 'RLSSECRET99', 'percent', 50, true)
  on conflict (id) do nothing;

  insert into public.orders (
    id, order_number, user_id, email, phone, status, payment_method,
    subtotal, discount, delivery_fee, total,
    shipping_name, shipping_phone, shipping_address, shipping_city, shipping_province
  ) values (
    v_order, 'EO-RLS-TEST-1', v_user, 'buyer@example.com', '03001234567',
    'awaiting_fulfilment', 'cod',
    1000, 0, 250, 1250,
    'Buyer', '03001234567', '1 Test St', 'Karachi', 'Sindh'
  ) on conflict (id) do nothing;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label, sku, unit_price, quantity, line_total
  ) values (
    v_order, v_prod, v_var, 'RLS Product', 'Default', 'RLS-SKU-1', 1000, 1, 1000
  );

  insert into public.payments (order_id, provider, amount, status)
  values (v_order, 'cod', 1250, 'pending');

  insert into public.addresses (
    user_id, full_name, phone, line1, city, province
  ) values (
    v_user, 'Buyer', '03001234567', '1 Test St', 'Karachi', 'Sindh'
  );

  insert into public.wishlists (user_id, product_id)
  values (v_user, v_prod)
  on conflict do nothing;

  insert into public.contact_messages (name, email, message)
  values ('Spy', 'spy@example.com', 'Should not be readable by anon');

  insert into public.newsletter_subscribers (email)
  values ('secret-list@example.com')
  on conflict do nothing;

  insert into public.app_events (event_type, payload)
  values ('rls_test', '{"secret": true}'::jsonb);

  insert into public.reviews (
    product_id, user_id, customer_name, rating, body, is_verified, is_approved
  ) values
    (v_prod, v_user, 'Buyer', 5, 'Approved review', true, true),
    (v_prod, v_user, 'Buyer', 4, 'Pending review', true, false);

  insert into public.settings (key, value)
  values ('rls_secret_probe', '{"x":1}'::jsonb)
  on conflict (key) do update set value = excluded.value;
end $$;

-- =========================================================================
-- ANON: must NOT read sensitive tables
-- =========================================================================
set local role anon;
select pg_temp.clear_auth();

do $$
declare
  n int;
begin
  select count(*) into n from public.discount_codes;
  if n <> 0 then
    raise exception 'FAIL: anon can read discount_codes (count=%)', n;
  end if;

  select count(*) into n from public.orders;
  if n <> 0 then
    raise exception 'FAIL: anon can read orders (count=%)', n;
  end if;

  select count(*) into n from public.order_items;
  if n <> 0 then
    raise exception 'FAIL: anon can read order_items (count=%)', n;
  end if;

  select count(*) into n from public.payments;
  if n <> 0 then
    raise exception 'FAIL: anon can read payments (count=%)', n;
  end if;

  select count(*) into n from public.addresses;
  if n <> 0 then
    raise exception 'FAIL: anon can read addresses (count=%)', n;
  end if;

  select count(*) into n from public.wishlists;
  if n <> 0 then
    raise exception 'FAIL: anon can read wishlists (count=%)', n;
  end if;

  select count(*) into n from public.contact_messages;
  if n <> 0 then
    raise exception 'FAIL: anon can read contact_messages (count=%)', n;
  end if;

  select count(*) into n from public.newsletter_subscribers;
  if n <> 0 then
    raise exception 'FAIL: anon can read newsletter_subscribers (count=%)', n;
  end if;

  select count(*) into n from public.app_events;
  if n <> 0 then
    raise exception 'FAIL: anon can read app_events (count=%)', n;
  end if;

  -- Anon may read only allowlisted storefront keys (delivery/contact/announcement/inventory).
  select count(*) into n
  from public.settings
  where key not in ('delivery', 'contact', 'announcement', 'inventory');
  if n <> 0 then
    raise exception 'FAIL: anon can read non-storefront settings (count=%)', n;
  end if;

  select count(*) into n from public.settings where key = 'rls_secret_probe';
  if n <> 0 then
    raise exception 'FAIL: anon can read secret settings key rls_secret_probe';
  end if;

  -- Anon MUST see active catalog
  select count(*) into n from public.products where slug = 'rls-test-product';
  if n < 1 then
    raise exception 'FAIL: anon cannot read active products';
  end if;

  select count(*) into n from public.products where slug = 'rls-test-inactive';
  if n <> 0 then
    raise exception 'FAIL: anon can read inactive products';
  end if;

  select count(*) into n from public.product_variants;
  if n < 1 then
    raise exception 'FAIL: anon cannot read active variants';
  end if;

  select count(*) into n from public.product_images;
  if n < 1 then
    raise exception 'FAIL: anon cannot read product images';
  end if;

  select count(*) into n from public.categories where slug = 'rls-test-cat';
  if n < 1 then
    raise exception 'FAIL: anon cannot read active categories';
  end if;

  select count(*) into n from public.collections where slug = 'rls-test-col';
  if n < 1 then
    raise exception 'FAIL: anon cannot read active collections';
  end if;

  select count(*) into n from public.collection_products;
  if n < 1 then
    raise exception 'FAIL: anon cannot read collection_products';
  end if;

  -- Approved reviews only
  select count(*) into n from public.reviews where is_approved = true;
  if n < 1 then
    raise exception 'FAIL: anon cannot read approved reviews';
  end if;

  select count(*) into n from public.reviews where is_approved = false;
  if n <> 0 then
    raise exception 'FAIL: anon can read unapproved reviews';
  end if;

  -- Anon must not insert contact / newsletter (no policy — should fail)
  begin
    insert into public.contact_messages (name, email, message)
    values ('Anon', 'a@b.com', 'should fail');
    raise exception 'FAIL: anon inserted contact_messages';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise;
      end if;
      -- RLS violation typically raises insufficient_privilege or check failure
      null;
  end;

  begin
    insert into public.newsletter_subscribers (email) values ('anon-sub@example.com');
    raise exception 'FAIL: anon inserted newsletter_subscribers';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise;
      end if;
      null;
  end;

  -- Anon must not update stock or order status
  begin
    update public.product_variants set stock = 0 where sku = 'RLS-SKU-1';
    if found then
      raise exception 'FAIL: anon updated stock';
    end if;
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise;
      end if;
      null;
  end;

  begin
    update public.orders set status = 'delivered' where order_number = 'EO-RLS-TEST-1';
    if found then
      raise exception 'FAIL: anon updated order status';
    end if;
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise;
      end if;
      null;
  end;

  raise notice 'PASS: anon checks';
end $$;

-- =========================================================================
-- AUTHENTICATED (buyer): own rows only; no discount_codes; no status updates
-- =========================================================================
set local role authenticated;
select pg_temp.set_auth_uid('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid);

do $$
declare
  n int;
  v_user uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
begin
  select count(*) into n from public.discount_codes;
  if n <> 0 then
    raise exception 'FAIL: authenticated (non-admin) can read discount_codes';
  end if;

  select count(*) into n from public.orders where user_id = v_user;
  if n < 1 then
    raise exception 'FAIL: buyer cannot read own orders';
  end if;

  select count(*) into n from public.orders where user_id <> v_user;
  if n <> 0 then
    raise exception 'FAIL: buyer can read other customers orders';
  end if;

  select count(*) into n from public.order_items;
  if n < 1 then
    raise exception 'FAIL: buyer cannot read own order_items';
  end if;

  select count(*) into n from public.addresses where user_id = v_user;
  if n < 1 then
    raise exception 'FAIL: buyer cannot read own addresses';
  end if;

  select count(*) into n from public.wishlists where user_id = v_user;
  if n < 1 then
    raise exception 'FAIL: buyer cannot read own wishlists';
  end if;

  select count(*) into n from public.payments;
  if n <> 0 then
    raise exception 'FAIL: buyer can read payments (should be admin-only)';
  end if;

  select count(*) into n from public.contact_messages;
  if n <> 0 then
    raise exception 'FAIL: buyer can read contact_messages';
  end if;

  select count(*) into n from public.newsletter_subscribers;
  if n <> 0 then
    raise exception 'FAIL: buyer can read newsletter_subscribers';
  end if;

  select count(*) into n from public.app_events;
  if n <> 0 then
    raise exception 'FAIL: buyer can read app_events';
  end if;

  -- Cannot update order status / prices / stock
  begin
    update public.orders set status = 'delivered' where user_id = v_user;
    if found then
      raise exception 'FAIL: buyer updated own order status';
    end if;
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise;
      end if;
      null;
  end;

  begin
    update public.product_variants set price = 1 where sku = 'RLS-SKU-1';
    if found then
      raise exception 'FAIL: buyer updated product price';
    end if;
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise;
      end if;
      null;
  end;

  begin
    update public.product_variants set stock = 0 where sku = 'RLS-SKU-1';
    if found then
      raise exception 'FAIL: buyer updated stock';
    end if;
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise;
      end if;
      null;
  end;

  raise notice 'PASS: authenticated buyer checks';
end $$;

-- Other user must not see buyer order
select pg_temp.set_auth_uid('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid);

do $$
declare
  n int;
begin
  select count(*) into n from public.orders;
  if n <> 0 then
    raise exception 'FAIL: other user can read buyer orders';
  end if;

  select count(*) into n from public.addresses;
  if n <> 0 then
    raise exception 'FAIL: other user can read buyer addresses';
  end if;

  select count(*) into n from public.wishlists;
  if n <> 0 then
    raise exception 'FAIL: other user can read buyer wishlists';
  end if;

  raise notice 'PASS: other-user isolation';
end $$;

-- Reset role before rollback
reset role;
select pg_temp.clear_auth();

select 'ALL RLS TESTS PASSED (rolling back)' as result;

rollback;

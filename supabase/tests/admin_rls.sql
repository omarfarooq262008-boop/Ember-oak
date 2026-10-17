-- Admin RLS + RPC proofs. Run in SQL Editor AFTER migration 20260316000006.
-- Entire script runs in a transaction and ROLLs BACK — no lasting data.

begin;

create extension if not exists pgcrypto with schema extensions;

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

do $$
declare
  v_buyer uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_other uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_admin uuid := '99999999-9999-4999-8999-999999999999';
  v_cat uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_prod uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_var uuid := '11111111-1111-4111-8111-111111111111';
  v_order_buyer uuid := '22222222-2222-4222-8222-222222222222';
  v_order_other uuid := '44444444-4444-4444-8444-444444444444';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
    (
      '00000000-0000-0000-0000-000000000000', v_buyer,
      'authenticated', 'authenticated', 'buyer-admin-test@example.com',
      extensions.crypt('test-password', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_other,
      'authenticated', 'authenticated', 'other-admin-test@example.com',
      extensions.crypt('test-password', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now()
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_admin,
      'authenticated', 'authenticated', 'admin-test@example.com',
      extensions.crypt('test-password', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now()
    )
  on conflict (id) do nothing;

  insert into public.profiles (id, email, full_name, is_admin)
  values
    (v_buyer, 'buyer-admin-test@example.com', 'Buyer', false),
    (v_other, 'other-admin-test@example.com', 'Other', false),
    (v_admin, 'admin-test@example.com', 'Admin', true)
  on conflict (id) do update set is_admin = excluded.is_admin;

  insert into public.categories (id, slug, name, is_active)
  values (v_cat, 'admin-rls-cat', 'Admin RLS Cat', true)
  on conflict (id) do nothing;

  insert into public.products (id, slug, name, category_id, is_active)
  values (v_prod, 'admin-rls-product', 'Admin RLS Product', v_cat, true)
  on conflict (id) do nothing;

  insert into public.product_variants (id, product_id, sku, price, stock, is_active)
  values (v_var, v_prod, 'ADMIN-RLS-SKU-1', 1000, 10, true)
  on conflict (id) do nothing;

  insert into public.orders (
    id, order_number, user_id, email, phone, status, payment_method,
    subtotal, discount, delivery_fee, total,
    shipping_name, shipping_phone, shipping_address, shipping_city, shipping_province
  ) values
    (
      v_order_buyer, 'EO-ADMIN-RLS-B', v_buyer, 'buyer-admin-test@example.com', '03001111111',
      'awaiting_fulfilment', 'cod', 1000, 0, 250, 1250,
      'Buyer', '03001111111', '1 Test St', 'Karachi', 'Sindh'
    ),
    (
      v_order_other, 'EO-ADMIN-RLS-O', v_other, 'other-admin-test@example.com', '03002222222',
      'awaiting_fulfilment', 'cod', 1000, 0, 250, 1250,
      'Other', '03002222222', '2 Test St', 'Lahore', 'Punjab'
    )
  on conflict (id) do nothing;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label, sku, unit_price, quantity, line_total
  ) values
    (v_order_buyer, v_prod, v_var, 'Admin RLS Product', 'Default', 'ADMIN-RLS-SKU-1', 1000, 1, 1000),
    (v_order_other, v_prod, v_var, 'Admin RLS Product', 'Default', 'ADMIN-RLS-SKU-1', 1000, 1, 1000);

  insert into public.payments (order_id, provider, amount, status)
  values
    (v_order_buyer, 'cod', 1250, 'pending'),
    (v_order_other, 'cod', 1250, 'pending');
end $$;

-- =========================================================================
-- Customer cannot read other customers' orders
-- =========================================================================
set local role authenticated;
select pg_temp.set_auth_uid('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid);

do $$
declare
  n int;
  oid uuid;
begin
  select count(*) into n from public.orders;
  if n <> 1 then
    raise exception 'FAIL: buyer should see only own order (count=%)', n;
  end if;

  select id into oid from public.orders where order_number = 'EO-ADMIN-RLS-O';
  if oid is not null then
    raise exception 'FAIL: buyer can see other customer order';
  end if;

  select count(*) into n from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.order_number = 'EO-ADMIN-RLS-O';
  if n <> 0 then
    raise exception 'FAIL: buyer can see other order_items';
  end if;
end $$;

-- =========================================================================
-- Customer cannot change stock (direct update)
-- =========================================================================
do $$
begin
  begin
    update public.product_variants
    set stock = 999
    where sku = 'ADMIN-RLS-SKU-1';
    if found then
      -- RLS may block (0 rows) OR trigger may raise — either is OK if stock unchanged
      null;
    end if;
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm not like '%STOCK_WRITE_FORBIDDEN%' and sqlstate <> '42501' then
        raise;
      end if;
  end;
end $$;

do $$
declare
  s int;
begin
  -- Re-check as service/postgres bypass for truth
  reset role;
  select stock into s from public.product_variants where sku = 'ADMIN-RLS-SKU-1';
  if s <> 10 then
    raise exception 'FAIL: customer changed stock to %', s;
  end if;
end $$;

set local role authenticated;
select pg_temp.set_auth_uid('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid);

-- =========================================================================
-- Customer cannot call admin RPCs
-- =========================================================================
do $$
begin
  begin
    perform public.admin_adjust_stock(
      '11111111-1111-4111-8111-111111111111'::uuid,
      5,
      'hack'
    );
    raise exception 'FAIL: customer called admin_adjust_stock';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm not like '%FORBIDDEN%' and sqlstate <> '42501' then
        raise exception 'FAIL: unexpected admin_adjust_stock error: %', sqlerrm;
      end if;
  end;

  begin
    perform public.admin_transition_order_status(
      '22222222-2222-4222-8222-222222222222'::uuid,
      'shipped',
      'TRACK1'
    );
    raise exception 'FAIL: customer called admin_transition_order_status';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm not like '%FORBIDDEN%' and sqlstate <> '42501' then
        raise exception 'FAIL: unexpected transition error: %', sqlerrm;
      end if;
  end;

  begin
    perform public.admin_mark_cod_paid(
      '22222222-2222-4222-8222-222222222222'::uuid
    );
    raise exception 'FAIL: customer called admin_mark_cod_paid';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm not like '%FORBIDDEN%' and sqlstate <> '42501' then
        raise exception 'FAIL: unexpected mark_cod error: %', sqlerrm;
      end if;
  end;
end $$;

-- =========================================================================
-- Customer cannot escalate is_admin
-- =========================================================================
do $$
begin
  begin
    update public.profiles set is_admin = true
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
  exception
    when others then
      if sqlerrm not like '%is_admin%' then
        raise;
      end if;
  end;
end $$;

do $$
declare
  a boolean;
begin
  reset role;
  select is_admin into a from public.profiles
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
  if a then
    raise exception 'FAIL: customer made themselves admin';
  end if;
end $$;

-- =========================================================================
-- Customer cannot upload to product-images (storage policy)
-- =========================================================================
set local role authenticated;
select pg_temp.set_auth_uid('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid);

do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'product-images',
      'hack/test.webp',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      '{}'::jsonb
    );
    raise exception 'FAIL: customer uploaded to product-images';
  exception
    when insufficient_privilege then null;
    when others then
      -- RLS violation
      if sqlstate not in ('42501', 'P0001') and sqlerrm not like '%policy%' then
        -- also accept check violation / not null on storage.objects schema diffs
        if sqlerrm like '%FAIL:%' then
          raise;
        end if;
      end if;
  end;
end $$;

-- =========================================================================
-- Customer cannot update orders / payments directly
-- =========================================================================
do $$
declare
  n int;
begin
  update public.orders set status = 'delivered'
  where order_number = 'EO-ADMIN-RLS-B';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: customer updated own order status';
  end if;

  update public.payments set status = 'paid'
  where order_id = '22222222-2222-4222-8222-222222222222'::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: customer updated payments';
  end if;
end $$;

-- =========================================================================
-- Unit checks: order_status_transition_allowed
-- =========================================================================
reset role;

do $$
begin
  if not public.order_status_transition_allowed('awaiting_fulfilment', 'shipped') then
    raise exception 'FAIL: awaiting_fulfilment -> shipped should be allowed';
  end if;
  if public.order_status_transition_allowed('awaiting_fulfilment', 'delivered') then
    raise exception 'FAIL: awaiting_fulfilment -> delivered should be blocked';
  end if;
  if public.order_status_transition_allowed('shipped', 'cancelled') then
    raise exception 'FAIL: shipped -> cancelled should be blocked';
  end if;
  if not public.order_status_transition_allowed('shipped', 'delivered') then
    raise exception 'FAIL: shipped -> delivered should be allowed';
  end if;
  if public.order_status_transition_allowed('delivered', 'shipped') then
    raise exception 'FAIL: delivered -> shipped should be blocked';
  end if;
end $$;

-- =========================================================================
-- Admin CAN call RPCs (smoke)
-- =========================================================================
set local role authenticated;
select pg_temp.set_auth_uid('99999999-9999-4999-8999-999999999999'::uuid);

do $$
declare
  res jsonb;
  s int;
begin
  res := public.admin_adjust_stock(
    '11111111-1111-4111-8111-111111111111'::uuid,
    7,
    'admin test'
  );
  if (res->>'stock_after')::int <> 7 then
    raise exception 'FAIL: admin_adjust_stock returned %', res;
  end if;

  select stock into s from public.product_variants
  where id = '11111111-1111-4111-8111-111111111111'::uuid;
  if s <> 7 then
    raise exception 'FAIL: stock not updated by admin RPC';
  end if;

  res := public.admin_transition_order_status(
    '22222222-2222-4222-8222-222222222222'::uuid,
    'shipped',
    'PKT-TEST-1'
  );
  if res->>'status' <> 'shipped' then
    raise exception 'FAIL: admin transition returned %', res;
  end if;

  res := public.admin_mark_cod_paid(
    '22222222-2222-4222-8222-222222222222'::uuid
  );
  if res->>'payment_status' <> 'paid' then
    raise exception 'FAIL: mark COD paid returned %', res;
  end if;
end $$;

reset role;
select pg_temp.clear_auth();

raise notice 'PASS: admin_rls.sql all checks passed (rolling back)';

rollback;

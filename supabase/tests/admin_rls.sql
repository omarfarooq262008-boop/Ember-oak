-- Admin RLS + RPC proofs. Paste whole file into Supabase SQL Editor AFTER migrations
-- 20260316000006 and 20260316000007. Runs in one transaction and ROLLs BACK — nothing persists.

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

-- Expect an error from fn(); fail loudly if it succeeds.
create or replace function pg_temp.expect_error(p_label text, p_fn text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_fn;
    raise exception 'FAIL: % succeeded (expected an error)', p_label;
  exception
    when raise_exception then
      if sqlerrm like 'FAIL:%' then
        raise;
      end if;
      -- expected denial (FORBIDDEN / privilege / etc.)
      null;
    when insufficient_privilege then
      null;
    when others then
      if sqlerrm like 'FAIL:%' then
        raise;
      end if;
      null;
  end;
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
  v_review_other uuid := '55555555-5555-4555-8555-555555555555';
  v_review_buyer uuid := '66666666-6666-4666-8666-666666666666';
  v_review_approve uuid := '77777777-7777-4777-8777-777777777777';
  v_review_reject uuid := '88888888-8888-4888-8888-888888888888';
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
  on conflict (id) do update set is_admin = excluded.is_admin, email = excluded.email;

  insert into public.categories (id, slug, name, is_active)
  values (v_cat, 'admin-rls-cat', 'Admin RLS Cat', true)
  on conflict (id) do nothing;

  insert into public.products (id, slug, name, category_id, is_active)
  values (v_prod, 'admin-rls-product', 'Admin RLS Product', v_cat, true)
  on conflict (id) do nothing;

  insert into public.product_variants (id, product_id, sku, price, stock, is_active)
  values (v_var, v_prod, 'ADMIN-RLS-SKU-1', 1000, 10, true)
  on conflict (id) do update set stock = 10, price = 1000, is_active = true;

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
  on conflict (id) do update set
    status = excluded.status,
    user_id = excluded.user_id,
    payment_method = excluded.payment_method;

  delete from public.order_items where order_id in (v_order_buyer, v_order_other);
  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label, sku, unit_price, quantity, line_total
  ) values
    (v_order_buyer, v_prod, v_var, 'Admin RLS Product', 'Default', 'ADMIN-RLS-SKU-1', 1000, 1, 1000),
    (v_order_other, v_prod, v_var, 'Admin RLS Product', 'Default', 'ADMIN-RLS-SKU-1', 1000, 1, 1000);

  delete from public.payments where order_id in (v_order_buyer, v_order_other);
  insert into public.payments (order_id, provider, amount, status)
  values
    (v_order_buyer, 'cod', 1250, 'pending'),
    (v_order_other, 'cod', 1250, 'pending');

  delete from public.reviews
  where id in (v_review_other, v_review_buyer, v_review_approve, v_review_reject);

  insert into public.reviews (
    id, product_id, user_id, customer_name, rating, title, body, is_approved, rejected_at
  ) values
    (
      v_review_other, v_prod, v_other, 'Other', 4, 'Other pending',
      'Should not be readable by buyer', false, null
    ),
    (
      v_review_buyer, v_prod, v_buyer, 'Buyer', 5, 'Buyer pending',
      'Buyer may see own unapproved review', false, null
    ),
    (
      v_review_approve, v_prod, v_other, 'Approvee', 5, 'Approve me',
      'Admin will approve this review', false, null
    ),
    (
      v_review_reject, v_prod, v_other, 'Rejectee', 2, 'Reject me',
      'Admin will reject this review', false, null
    );
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

  select count(*) into n
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.order_number = 'EO-ADMIN-RLS-O';
  if n <> 0 then
    raise exception 'FAIL: buyer can see other order_items (count=%)', n;
  end if;
end $$;

-- =========================================================================
-- Customer cannot UPDATE product_variants.stock directly
-- =========================================================================
do $$
declare
  n int;
  s int;
  blocked boolean := false;
begin
  begin
    update public.product_variants
    set stock = 999
    where sku = 'ADMIN-RLS-SKU-1';
    get diagnostics n = row_count;
    if n > 0 then
      raise exception 'FAIL: customer updated product_variants.stock (% row(s))', n;
    end if;
  exception
    when raise_exception then
      if sqlerrm like 'FAIL:%' then
        raise;
      end if;
      blocked := true;
    when insufficient_privilege then
      blocked := true;
    when others then
      -- trigger STOCK_WRITE_FORBIDDEN / RLS denial
      blocked := true;
  end;

  -- Verify stock unchanged (read as buyer; variant is publicly readable when active)
  select stock into s from public.product_variants where sku = 'ADMIN-RLS-SKU-1';
  if s is distinct from 10 then
    raise exception 'FAIL: customer changed stock to % (expected 10)', s;
  end if;

  if not blocked and n = 0 then
    -- RLS silently filtered the update — still a pass if stock unchanged
    null;
  end if;
end $$;

-- =========================================================================
-- Customer cannot INSERT into product_variants (including stock)
-- =========================================================================
do $$
declare
  blocked boolean := false;
begin
  begin
    insert into public.product_variants (product_id, sku, price, stock, is_active)
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid,
      'ADMIN-RLS-HACK-SKU',
      1,
      50,
      true
    );
    raise exception 'FAIL: customer inserted into product_variants';
  exception
    when raise_exception then
      if sqlerrm like 'FAIL:%' then
        raise;
      end if;
      blocked := true;
    when insufficient_privilege then
      blocked := true;
    when others then
      blocked := true;
  end;

  if not blocked then
    raise exception 'FAIL: customer insert into product_variants was not blocked';
  end if;

  if exists (select 1 from public.product_variants where sku = 'ADMIN-RLS-HACK-SKU') then
    raise exception 'FAIL: hack variant row exists after customer insert attempt';
  end if;
end $$;

-- =========================================================================
-- Customer cannot call admin RPCs
-- =========================================================================
do $$
begin
  perform pg_temp.expect_error(
    'customer admin_adjust_stock',
    $sql$select public.admin_adjust_stock(
      '11111111-1111-4111-8111-111111111111'::uuid, 5, 'hack'
    )$sql$
  );

  perform pg_temp.expect_error(
    'customer admin_transition_order_status',
    $sql$select public.admin_transition_order_status(
      '22222222-2222-4222-8222-222222222222'::uuid, 'shipped', 'TRACK1'
    )$sql$
  );

  perform pg_temp.expect_error(
    'customer admin_mark_cod_paid',
    $sql$select public.admin_mark_cod_paid(
      '22222222-2222-4222-8222-222222222222'::uuid
    )$sql$
  );

  perform pg_temp.expect_error(
    'customer admin_moderate_review approve',
    $sql$select public.admin_moderate_review(
      '77777777-7777-4777-8777-777777777777'::uuid, 'approve'
    )$sql$
  );

  perform pg_temp.expect_error(
    'customer admin_moderate_review reject',
    $sql$select public.admin_moderate_review(
      '88888888-8888-4888-8888-888888888888'::uuid, 'reject'
    )$sql$
  );
end $$;

-- =========================================================================
-- Anon cannot call admin RPCs
-- =========================================================================
set local role anon;
select pg_temp.clear_auth();

do $$
begin
  perform pg_temp.expect_error(
    'anon admin_adjust_stock',
    $sql$select public.admin_adjust_stock(
      '11111111-1111-4111-8111-111111111111'::uuid, 5, 'hack'
    )$sql$
  );

  perform pg_temp.expect_error(
    'anon admin_transition_order_status',
    $sql$select public.admin_transition_order_status(
      '22222222-2222-4222-8222-222222222222'::uuid, 'shipped', 'TRACK1'
    )$sql$
  );

  perform pg_temp.expect_error(
    'anon admin_mark_cod_paid',
    $sql$select public.admin_mark_cod_paid(
      '22222222-2222-4222-8222-222222222222'::uuid
    )$sql$
  );

  perform pg_temp.expect_error(
    'anon admin_moderate_review approve',
    $sql$select public.admin_moderate_review(
      '77777777-7777-4777-8777-777777777777'::uuid, 'approve'
    )$sql$
  );

  perform pg_temp.expect_error(
    'anon admin_moderate_review reject',
    $sql$select public.admin_moderate_review(
      '88888888-8888-4888-8888-888888888888'::uuid, 'reject'
    )$sql$
  );
end $$;

-- =========================================================================
-- Reviews: customer cannot insert approved, update/delete, or read others' pending
-- =========================================================================
set local role authenticated;
select pg_temp.set_auth_uid('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid);

do $$
declare
  n int;
  rid uuid;
  blocked boolean := false;
begin
  -- Cannot read another customer's unapproved review
  select id into rid
  from public.reviews
  where id = '55555555-5555-4555-8555-555555555555'::uuid;
  if rid is not null then
    raise exception 'FAIL: buyer can read other customer unapproved review';
  end if;

  -- Can still see own unapproved review
  select count(*) into n
  from public.reviews
  where id = '66666666-6666-4666-8666-666666666666'::uuid;
  if n <> 1 then
    raise exception 'FAIL: buyer cannot read own unapproved review (count=%)', n;
  end if;

  -- Cannot insert with is_approved = true
  begin
    insert into public.reviews (
      product_id, user_id, customer_name, rating, body, is_approved
    ) values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'Buyer', 5, 'Self-approved hack', true
    );
    raise exception 'FAIL: customer inserted review with is_approved = true';
  exception
    when raise_exception then
      if sqlerrm like 'FAIL:%' then
        raise;
      end if;
      blocked := true;
    when insufficient_privilege then
      blocked := true;
    when others then
      blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: approved review insert was not blocked';
  end if;

  -- Cannot UPDATE any review directly
  update public.reviews
  set is_approved = true
  where id = '66666666-6666-4666-8666-666666666666'::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: customer updated own review (% row(s))', n;
  end if;

  update public.reviews
  set body = 'hacked'
  where id = '55555555-5555-4555-8555-555555555555'::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: customer updated other review (% row(s))', n;
  end if;

  -- Cannot DELETE any review directly
  delete from public.reviews
  where id = '66666666-6666-4666-8666-666666666666'::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: customer deleted own review (% row(s))', n;
  end if;

  delete from public.reviews
  where id = '55555555-5555-4555-8555-555555555555'::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: customer deleted other review (% row(s))', n;
  end if;
end $$;

-- =========================================================================
-- Customer cannot escalate is_admin
-- =========================================================================
set local role authenticated;
select pg_temp.set_auth_uid('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid);

do $$
declare
  a boolean;
  blocked boolean := false;
begin
  begin
    update public.profiles
    set is_admin = true
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
  exception
    when others then
      blocked := true;
  end;

  -- Always verify final state as postgres (bypass RLS for truth)
  execute 'reset role';
  select is_admin into a
  from public.profiles
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;

  if a then
    raise exception 'FAIL: customer made themselves admin';
  end if;

  if not blocked then
    -- trigger may have silently prevented the change by raising, or update ran
    -- with is_admin still false because trigger aborted — either way a=false is required
    null;
  end if;
end $$;

-- =========================================================================
-- Customer cannot upload to product-images
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
    when raise_exception then
      if sqlerrm like 'FAIL:%' then
        raise;
      end if;
      null;
    when insufficient_privilege then
      null;
    when others then
      null;
  end;
end $$;

-- =========================================================================
-- Customer cannot update orders / payments directly
-- =========================================================================
do $$
declare
  n int;
begin
  update public.orders
  set status = 'delivered'
  where order_number = 'EO-ADMIN-RLS-B';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: customer updated own order status (% row(s))', n;
  end if;

  update public.payments
  set status = 'paid'
  where order_id = '22222222-2222-4222-8222-222222222222'::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: customer updated payments (% row(s))', n;
  end if;
end $$;

-- =========================================================================
-- Unit checks: order_status_transition_allowed
-- =========================================================================
reset role;
select pg_temp.clear_auth();

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
  if public.order_status_transition_allowed('awaiting_payment', 'awaiting_payment') then
    raise exception 'FAIL: same-status transition should be blocked';
  end if;
end $$;

-- =========================================================================
-- Admin CAN call RPCs (smoke — proves denials are auth-specific)
-- =========================================================================
set local role authenticated;
select pg_temp.set_auth_uid('99999999-9999-4999-8999-999999999999'::uuid);

do $$
declare
  res jsonb;
  s int;
begin
  if not public.is_admin() then
    raise exception 'FAIL: test admin is_admin() is false';
  end if;

  res := public.admin_adjust_stock(
    '11111111-1111-4111-8111-111111111111'::uuid,
    7,
    'admin test'
  );
  if (res->>'stock_after')::int <> 7 then
    raise exception 'FAIL: admin_adjust_stock returned %', res;
  end if;

  select stock into s
  from public.product_variants
  where id = '11111111-1111-4111-8111-111111111111'::uuid;
  if s <> 7 then
    raise exception 'FAIL: stock not updated by admin RPC (got %)', s;
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

  -- Admin can approve via RPC
  res := public.admin_moderate_review(
    '77777777-7777-4777-8777-777777777777'::uuid,
    'approve'
  );
  if res->>'action' is distinct from 'approve' or (res->>'is_approved')::boolean is not true then
    raise exception 'FAIL: admin approve returned %', res;
  end if;

  if not exists (
    select 1 from public.reviews
    where id = '77777777-7777-4777-8777-777777777777'::uuid
      and is_approved = true
      and rejected_at is null
  ) then
    raise exception 'FAIL: review not approved in table after admin RPC';
  end if;

  -- Admin can reject via RPC
  res := public.admin_moderate_review(
    '88888888-8888-4888-8888-888888888888'::uuid,
    'reject'
  );
  if res->>'action' is distinct from 'reject' or (res->>'is_approved')::boolean is not false then
    raise exception 'FAIL: admin reject returned %', res;
  end if;

  if not exists (
    select 1 from public.reviews
    where id = '88888888-8888-4888-8888-888888888888'::uuid
      and is_approved = false
      and rejected_at is not null
  ) then
    raise exception 'FAIL: review not rejected in table after admin RPC';
  end if;
end $$;

reset role;
select pg_temp.clear_auth();

select 'PASS: admin_rls.sql all checks passed' as result;

rollback;

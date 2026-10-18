-- Payments + email outbox checks (run after 20260316000008 migration)
-- Example: supabase db execute --file supabase/tests/payments_and_emails.sql

do $$
declare
  v1 jsonb;
  v2 jsonb;
  v_count1 int;
  v_order_id uuid;
  v_variant_id uuid;
  v_product_id uuid;
  v_order_number text;
  v_sku text;
  v_stock_before int;
  v_stock_after int;
begin
  perform set_config('app.allow_stock_update', 'on', true);

  v_sku := 'PAY-TEST-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_order_number := 'EO-PAYTEST' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  insert into public.products (slug, name, short_description, description, is_active)
  values (
    'pay-test-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    'Pay Test',
    't',
    't',
    true
  )
  returning id into v_product_id;

  insert into public.product_variants (product_id, sku, price, stock, is_active)
  values (v_product_id, v_sku, 1000, 5, true)
  returning id into v_variant_id;

  insert into public.orders (
    order_number, email, phone, status, payment_method,
    subtotal, discount, delivery_fee, total,
    shipping_name, shipping_phone, shipping_address, shipping_city, shipping_province,
    tracking_token, idempotency_key, payment_due_at
  ) values (
    v_order_number,
    'paytest@example.com', '03001234567', 'pending_payment', 'card',
    1000, 0, 0, 1000,
    'Test', '03001234567', 'Addr', 'Karachi', 'Sindh',
    encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'hex'),
    'idem-pay-' || gen_random_uuid()::text,
    now() - interval '31 minutes'
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label, sku, unit_price, quantity, line_total
  ) values (
    v_order_id, v_product_id, v_variant_id, 'Pay Test', 'Default', v_sku, 1000, 2, 2000
  );

  insert into public.payments (order_id, provider, amount, currency, status)
  values (v_order_id, 'mock', 1000, 'PKR', 'pending');

  update public.product_variants set stock = stock - 2 where id = v_variant_id;

  -- Duplicate webhook ignored
  v1 := public.apply_payment_webhook(
    'mock', 'evt-dup-' || v_order_id::text,
    v_order_number,
    'paid', 'ref-1', '{"ok":true}'::jsonb
  );
  if coalesce((v1->>'idempotent')::boolean, true) then
    raise exception 'FAIL first webhook should not be idempotent';
  end if;

  v2 := public.apply_payment_webhook(
    'mock', 'evt-dup-' || v_order_id::text,
    v_order_number,
    'paid', 'ref-1', '{"ok":true}'::jsonb
  );
  if not coalesce((v2->>'idempotent')::boolean, false) then
    raise exception 'FAIL duplicate webhook must be idempotent';
  end if;

  -- Fresh abandoned order for stock release once
  insert into public.orders (
    order_number, email, phone, status, payment_method,
    subtotal, discount, delivery_fee, total,
    shipping_name, shipping_phone, shipping_address, shipping_city, shipping_province,
    tracking_token, idempotency_key, payment_due_at
  ) values (
    'EO-ABANDON' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
    'abandon@example.com', '03001234567', 'pending_payment', 'card',
    1000, 0, 0, 1000,
    'Test', '03001234567', 'Addr', 'Karachi', 'Sindh',
    encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'hex'),
    'idem-abandon-' || gen_random_uuid()::text,
    now() - interval '31 minutes'
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label, sku, unit_price, quantity, line_total
  ) values (
    v_order_id, v_product_id, v_variant_id, 'Pay Test', 'Default', v_sku, 1000, 1, 1000
  );

  insert into public.payments (order_id, provider, amount, currency, status)
  values (v_order_id, 'mock', 1000, 'PKR', 'pending');

  update public.product_variants set stock = stock - 1 where id = v_variant_id;
  select stock into v_stock_before from public.product_variants where id = v_variant_id;

  v_count1 := public.release_abandoned_pending_payments();
  select stock into v_stock_after from public.product_variants where id = v_variant_id;

  if v_count1 < 1 then
    raise exception 'FAIL expected at least one abandoned release';
  end if;
  if v_stock_after <> v_stock_before + 1 then
    raise exception 'FAIL stock not restored once: before=% after=%', v_stock_before, v_stock_after;
  end if;

  perform public.release_abandoned_pending_payments();
  if (select stock from public.product_variants where id = v_variant_id) <> v_stock_after then
    raise exception 'FAIL stock released more than once';
  end if;

  raise notice 'PASS payments_and_emails checks (dup webhook + stock once)';
end;
$$;

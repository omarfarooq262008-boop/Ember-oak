-- Fix create_order_atomic randomness on Supabase (pgcrypto in schema extensions).
-- Safe to run twice.

create extension if not exists pgcrypto with schema extensions;

-- Column default also used gen_random_bytes without schema qualification
alter table public.orders
  alter column tracking_token set default encode(
    uuid_send(extensions.gen_random_uuid()) || uuid_send(extensions.gen_random_uuid()),
    'hex'
  );

create or replace function public.create_order_atomic(
  p_email text,
  p_phone text,
  p_payment_method text,
  p_shipping_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_province text,
  p_shipping_postal text,
  p_items jsonb,
  p_idempotency_key text,
  p_discount_code text default null,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_above numeric := 8000;
  v_flat_fee numeric := 250;
  v_existing public.orders%rowtype;
  v_item jsonb;
  v_variant_id uuid;
  v_qty int;
  v_stock int;
  v_price numeric;
  v_sku text;
  v_options jsonb;
  v_product_id uuid;
  v_product_name text;
  v_product_active boolean;
  v_variant_active boolean;
  v_variant_label text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_delivery numeric := 0;
  v_total numeric := 0;
  v_code text;
  v_dc public.discount_codes%rowtype;
  v_status text;
  v_order_number text;
  v_tracking_token text;
  v_attempts int := 0;
  v_order public.orders%rowtype;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_seen uuid[] := '{}';
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'INVALID_IDEMPOTENCY' using errcode = 'P0001';
  end if;

  -- Idempotency: same key always returns the same order
  select * into v_existing
  from public.orders
  where idempotency_key = p_idempotency_key
  for update;

  if found then
    return jsonb_build_object(
      'order_id', v_existing.id,
      'order_number', v_existing.order_number,
      'status', v_existing.status,
      'total', v_existing.total,
      'tracking_token', v_existing.tracking_token,
      'idempotent', true
    );
  end if;

  if p_payment_method not in ('cod', 'bank_transfer', 'card') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;

  if p_user_id is not null and not exists (
    select 1 from public.profiles where id = p_user_id
  ) then
    p_user_id := null;
  end if;

  -- Lock variants in stable order to avoid deadlocks; check stock; build lines from DB prices
  for v_item in
    select value
    from jsonb_array_elements(p_items) as t(value)
    order by (value->>'variant_id')
  loop
    begin
      v_variant_id := (v_item->>'variant_id')::uuid;
    exception when others then
      raise exception 'INVALID_VARIANT' using errcode = 'P0001';
    end;

    v_qty := coalesce((v_item->>'quantity')::int, 0);
    if v_qty < 1 or v_qty > 20 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    if v_variant_id = any (v_seen) then
      raise exception 'DUPLICATE_VARIANT' using errcode = 'P0001';
    end if;
    v_seen := array_append(v_seen, v_variant_id);

    select
      pv.stock,
      pv.price,
      pv.sku,
      pv.options,
      pv.is_active,
      pv.product_id,
      p.name,
      p.is_active
    into
      v_stock,
      v_price,
      v_sku,
      v_options,
      v_variant_active,
      v_product_id,
      v_product_name,
      v_product_active
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_variant_id
    for update of pv;

    if not found then
      raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0001';
    end if;

    if not coalesce(v_variant_active, false) or not coalesce(v_product_active, false) then
      raise exception 'ITEM_UNAVAILABLE:%', v_sku using errcode = 'P0001';
    end if;

    if v_stock < v_qty then
      raise exception 'INSUFFICIENT_STOCK:%:%', v_sku, v_stock using errcode = 'P0001';
    end if;

    update public.product_variants
    set stock = stock - v_qty
    where id = v_variant_id;

    select string_agg(val, ' · ' order by key)
    into v_variant_label
    from jsonb_each_text(coalesce(v_options, '{}'::jsonb)) as x(key, val)
    where val is not null and val <> '';

    v_variant_label := coalesce(v_variant_label, '');

    v_line := jsonb_build_object(
      'product_id', v_product_id,
      'variant_id', v_variant_id,
      'product_name', v_product_name,
      'variant_label', v_variant_label,
      'sku', v_sku,
      'unit_price', v_price,
      'quantity', v_qty,
      'line_total', v_price * v_qty
    );
    v_lines := v_lines || jsonb_build_array(v_line);
    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  -- Discount: lock code row, validate, count usage
  v_code := nullif(upper(trim(coalesce(p_discount_code, ''))), '');
  if v_code is not null then
    select * into v_dc
    from public.discount_codes
    where code = v_code
    for update;

    if not found or not v_dc.is_active then
      raise exception 'INVALID_DISCOUNT' using errcode = 'P0001';
    end if;
    if v_dc.starts_at is not null and v_dc.starts_at > now() then
      raise exception 'DISCOUNT_NOT_STARTED' using errcode = 'P0001';
    end if;
    if v_dc.ends_at is not null and v_dc.ends_at < now() then
      raise exception 'DISCOUNT_EXPIRED' using errcode = 'P0001';
    end if;
    if v_dc.max_uses is not null and v_dc.used_count >= v_dc.max_uses then
      raise exception 'DISCOUNT_LIMIT' using errcode = 'P0001';
    end if;
    if v_dc.min_spend is not null and v_subtotal < v_dc.min_spend then
      raise exception 'DISCOUNT_MIN_SPEND:%', v_dc.min_spend using errcode = 'P0001';
    end if;

    if v_dc.type = 'percent' then
      v_discount := floor((v_subtotal * v_dc.value) / 100);
    else
      v_discount := least(v_subtotal, v_dc.value);
    end if;

    update public.discount_codes
    set used_count = used_count + 1
    where id = v_dc.id;
  end if;

  if (v_subtotal - v_discount) >= v_free_above then
    v_delivery := 0;
  else
    v_delivery := v_flat_fee;
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + v_delivery;

  if p_payment_method = 'card' then
    v_status := 'pending_payment';
  elsif p_payment_method = 'bank_transfer' then
    v_status := 'awaiting_payment';
  else
    v_status := 'awaiting_fulfilment';
  end if;

  -- Order number: UUID-derived (not a counter); retry on rare unique collisions.
  -- Tracking token: 256 bits from two UUIDs (avoids extensions.gen_random_bytes / broken search_path).
  loop
    v_attempts := v_attempts + 1;
    v_order_number :=
      'EO-' || upper(replace(extensions.gen_random_uuid()::text, '-', ''));
    v_tracking_token := encode(
      uuid_send(extensions.gen_random_uuid())
        || uuid_send(extensions.gen_random_uuid()),
      'hex'
    );

    begin
      insert into public.orders (
        order_number,
        user_id,
        email,
        phone,
        status,
        payment_method,
        subtotal,
        discount,
        delivery_fee,
        total,
        discount_code,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        shipping_province,
        shipping_postal,
        tracking_token,
        idempotency_key
      ) values (
        v_order_number,
        p_user_id,
        lower(trim(p_email)),
        trim(p_phone),
        v_status,
        p_payment_method,
        v_subtotal,
        v_discount,
        v_delivery,
        v_total,
        v_code,
        trim(p_shipping_name),
        trim(p_shipping_phone),
        trim(p_shipping_address),
        trim(p_shipping_city),
        trim(p_shipping_province),
        nullif(trim(coalesce(p_shipping_postal, '')), ''),
        v_tracking_token,
        p_idempotency_key
      )
      returning * into v_order;
      exit;
    exception
      when unique_violation then
        select * into v_existing
        from public.orders
        where idempotency_key = p_idempotency_key;
        if found then
          return jsonb_build_object(
            'order_id', v_existing.id,
            'order_number', v_existing.order_number,
            'status', v_existing.status,
            'total', v_existing.total,
            'tracking_token', v_existing.tracking_token,
            'idempotent', true
          );
        end if;
        if v_attempts >= 8 then
          raise exception 'ORDER_NUMBER_COLLISION' using errcode = 'P0001';
        end if;
    end;
  end loop;

  insert into public.order_items (
    order_id,
    product_id,
    variant_id,
    product_name,
    variant_label,
    sku,
    unit_price,
    quantity,
    line_total
  )
  select
    v_order.id,
    (line->>'product_id')::uuid,
    (line->>'variant_id')::uuid,
    line->>'product_name',
    coalesce(line->>'variant_label', ''),
    line->>'sku',
    (line->>'unit_price')::numeric,
    (line->>'quantity')::int,
    (line->>'line_total')::numeric
  from jsonb_array_elements(v_lines) as t(line);

  insert into public.payments (
    order_id,
    provider,
    amount,
    currency,
    status
  ) values (
    v_order.id,
    case when p_payment_method = 'card' then 'mock' else p_payment_method end,
    v_total,
    'PKR',
    'pending'
  );

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'total', v_order.total,
    'subtotal', v_order.subtotal,
    'discount', v_order.discount,
    'delivery_fee', v_order.delivery_fee,
    'tracking_token', v_order.tracking_token,
    'idempotent', false
  );
end;
$$;

revoke all on function public.create_order_atomic(
  text, text, text, text, text, text, text, text, text, jsonb, text, text, uuid
) from public, anon, authenticated;

grant execute on function public.create_order_atomic(
  text, text, text, text, text, text, text, text, text, jsonb, text, text, uuid
) to service_role;

notify pgrst, 'reload schema';

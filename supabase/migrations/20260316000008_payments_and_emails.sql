-- Payments (webhook idempotency, abandoned stock release) + email outbox.
-- Safe to run twice.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists payment_reference text,
  add column if not exists stock_released_at timestamptz,
  add column if not exists payment_due_at timestamptz;

create unique index if not exists orders_payment_reference_uidx
  on public.orders (payment_reference)
  where payment_reference is not null;

alter table public.payments
  add column if not exists refunded_at timestamptz;

-- ---------------------------------------------------------------------------
-- Webhook idempotency
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  order_id uuid references public.orders (id) on delete set null,
  payload jsonb not null default '{}',
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists webhook_events_order_idx
  on public.webhook_events (order_id);

alter table public.webhook_events enable row level security;

drop policy if exists webhook_events_admin_select on public.webhook_events;
create policy webhook_events_admin_select on public.webhook_events
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Email outbox (dedupe + retry)
-- ---------------------------------------------------------------------------
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  template text not null,
  to_email text not null,
  subject text not null default '',
  payload jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  last_error text,
  attempt_count int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists email_outbox_status_idx
  on public.email_outbox (status, created_at desc);

alter table public.email_outbox enable row level security;

drop policy if exists email_outbox_admin_select on public.email_outbox;
create policy email_outbox_admin_select on public.email_outbox
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Apply verified payment webhook (service_role / security definer)
-- ---------------------------------------------------------------------------
create or replace function public.apply_payment_webhook(
  p_provider text,
  p_event_id text,
  p_order_number text,
  p_outcome text,
  p_provider_ref text default null,
  p_payload jsonb default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_outcome text := lower(trim(p_outcome));
  v_existing uuid;
begin
  if nullif(trim(p_provider), '') is null or nullif(trim(p_event_id), '') is null then
    raise exception 'INVALID_WEBHOOK' using errcode = 'P0001';
  end if;

  if v_outcome not in ('paid', 'failed', 'cancelled') then
    raise exception 'INVALID_OUTCOME' using errcode = 'P0001';
  end if;

  -- Idempotency: if event already recorded, return current state and change nothing
  select id into v_existing
  from public.webhook_events
  where provider = p_provider and event_id = p_event_id;

  if v_existing is not null then
    select * into v_order from public.orders where order_number = p_order_number;
    return jsonb_build_object(
      'idempotent', true,
      'order_number', coalesce(v_order.order_number, p_order_number),
      'status', v_order.status,
      'payment_status', (
        select status from public.payments where order_id = v_order.id order by created_at desc limit 1
      )
    );
  end if;

  select * into v_order
  from public.orders
  where order_number = p_order_number
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.webhook_events (provider, event_id, order_id, payload)
  values (p_provider, p_event_id, v_order.id, coalesce(p_payload, '{}'));

  if v_outcome = 'paid' then
    update public.payments
    set
      status = 'paid',
      provider = p_provider,
      provider_ref = coalesce(nullif(trim(p_provider_ref), ''), provider_ref),
      raw_payload = coalesce(p_payload, raw_payload),
      updated_at = now()
    where order_id = v_order.id;

    if not found then
      insert into public.payments (order_id, provider, provider_ref, amount, currency, status, raw_payload)
      values (
        v_order.id, p_provider, nullif(trim(p_provider_ref), ''),
        v_order.total, 'PKR', 'paid', coalesce(p_payload, '{}')
      );
    end if;

    if v_order.status in ('pending_payment', 'awaiting_payment') then
      update public.orders
      set status = 'awaiting_fulfilment', updated_at = now()
      where id = v_order.id
      returning * into v_order;
    end if;
  elsif v_outcome in ('failed', 'cancelled') then
    update public.payments
    set
      status = 'failed',
      provider = p_provider,
      provider_ref = coalesce(nullif(trim(p_provider_ref), ''), provider_ref),
      raw_payload = coalesce(p_payload, raw_payload),
      updated_at = now()
    where order_id = v_order.id and status = 'pending';
    -- Stock release is handled by release_abandoned_pending_payments (or immediate cancel below for cancelled)
    if v_outcome = 'cancelled' and v_order.status = 'pending_payment' and v_order.stock_released_at is null then
      perform set_config('app.allow_stock_update', 'on', true);
      update public.product_variants pv
      set stock = stock + oi.quantity
      from public.order_items oi
      where oi.order_id = v_order.id and oi.variant_id = pv.id;

      update public.orders
      set
        status = 'cancelled',
        stock_released_at = now(),
        updated_at = now()
      where id = v_order.id
      returning * into v_order;
    end if;
  end if;

  return jsonb_build_object(
    'idempotent', false,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'outcome', v_outcome
  );
end;
$$;

revoke all on function public.apply_payment_webhook(text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_payment_webhook(text, text, text, text, text, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Release reserved stock for abandoned card payments (once)
-- ---------------------------------------------------------------------------
create or replace function public.release_abandoned_pending_payments()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count int := 0;
begin
  perform set_config('app.allow_stock_update', 'on', true);

  for r in
    select o.id, o.order_number
    from public.orders o
    where o.status = 'pending_payment'
      and o.payment_method = 'card'
      and o.stock_released_at is null
      and coalesce(o.payment_due_at, o.created_at + interval '30 minutes') < now()
    for update of o skip locked
  loop
    update public.product_variants pv
    set stock = stock + oi.quantity
    from public.order_items oi
    where oi.order_id = r.id and oi.variant_id = pv.id;

    update public.orders
    set
      status = 'cancelled',
      stock_released_at = now(),
      updated_at = now()
    where id = r.id
      and stock_released_at is null;

    if found then
      update public.payments
      set status = 'failed', updated_at = now()
      where order_id = r.id and status = 'pending';

      insert into public.app_events (event_type, payload)
      values (
        'payment_abandoned_stock_released',
        jsonb_build_object('order_number', r.order_number)
      );

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.release_abandoned_pending_payments() from public, anon, authenticated;
grant execute on function public.release_abandoned_pending_payments() to service_role;

-- Schedule every 5 minutes when pg_cron is available
do $$
begin
  create extension if not exists pg_cron with schema extensions;
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'release-abandoned-payments';
  perform cron.schedule(
    'release-abandoned-payments',
    '*/5 * * * *',
    $cron$select public.release_abandoned_pending_payments()$cron$
  );
exception
  when others then
    raise notice 'pg_cron not available or schedule skipped: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: mark bank transfer paid
-- ---------------------------------------------------------------------------
create or replace function public.admin_mark_bank_paid(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  perform public.require_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_order.payment_method <> 'bank_transfer' then
    raise exception 'NOT_BANK_TRANSFER' using errcode = 'P0001';
  end if;
  if v_order.status in ('cancelled', 'refunded') then
    raise exception 'ORDER_CLOSED' using errcode = 'P0001';
  end if;

  update public.payments
  set status = 'paid', provider = 'bank_transfer', updated_at = now()
  where order_id = p_order_id;

  if not found then
    insert into public.payments (order_id, provider, amount, currency, status)
    values (p_order_id, 'bank_transfer', v_order.total, 'PKR', 'paid');
  end if;

  if v_order.status = 'awaiting_payment' then
    update public.orders
    set status = 'awaiting_fulfilment', updated_at = now()
    where id = p_order_id
    returning * into v_order;
  end if;

  perform public.write_admin_audit(
    'bank_paid',
    'order',
    p_order_id,
    jsonb_build_object('order_number', v_order.order_number)
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', v_order.status,
    'payment_status', 'paid'
  );
end;
$$;

revoke all on function public.admin_mark_bank_paid(uuid) from public, anon;
grant execute on function public.admin_mark_bank_paid(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Admin: refund (marks payment refunded + order refunded; stock only via cancel)
-- ---------------------------------------------------------------------------
create or replace function public.admin_refund_order(
  p_order_id uuid,
  p_provider_refund_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_from text;
begin
  perform public.require_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_from := v_order.status;
  if v_from = 'refunded' then
    return jsonb_build_object('order_id', p_order_id, 'status', 'refunded', 'idempotent', true);
  end if;

  if not public.order_status_transition_allowed(v_from, 'refunded') then
    raise exception 'INVALID_STATUS_TRANSITION:%:%', v_from, 'refunded' using errcode = 'P0001';
  end if;

  update public.payments
  set
    status = 'refunded',
    provider_ref = coalesce(nullif(trim(p_provider_refund_ref), ''), provider_ref),
    refunded_at = now(),
    updated_at = now()
  where order_id = p_order_id;

  update public.orders
  set status = 'refunded', updated_at = now()
  where id = p_order_id
  returning * into v_order;

  perform public.write_admin_audit(
    'order_refund',
    'order',
    p_order_id,
    jsonb_build_object('from', v_from, 'to', 'refunded')
  );

  -- Stock is restored only when an order is cancelled (admin_transition / abandon job),
  -- not on refund-from-delivered/shipped.
  return jsonb_build_object(
    'order_id', p_order_id,
    'status', v_order.status,
    'payment_status', 'refunded',
    'stock_restored', false
  );
end;
$$;

revoke all on function public.admin_refund_order(uuid, text) from public, anon;
grant execute on function public.admin_refund_order(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Patch create_order_atomic: payment_reference + payment_due_at for card
-- ---------------------------------------------------------------------------
-- We wrap by replacing only the insert path via a helper trigger on orders INSERT
create or replace function public.orders_after_insert_payment_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_method = 'bank_transfer' and new.payment_reference is null then
    new.payment_reference := 'BT-' || replace(new.order_number, 'EO-', '');
  end if;
  if new.payment_method = 'card' and new.payment_due_at is null then
    new.payment_due_at := new.created_at + interval '30 minutes';
  end if;
  return new;
end;
$$;

-- BEFORE insert so we can set columns on NEW
create or replace function public.orders_before_insert_payment_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_method = 'bank_transfer' and nullif(trim(coalesce(new.payment_reference, '')), '') is null then
    new.payment_reference := 'BT-' || upper(substr(replace(coalesce(new.order_number, gen_random_uuid()::text), '-', ''), 1, 16));
  end if;
  if new.payment_method = 'card' and new.payment_due_at is null then
    new.payment_due_at := coalesce(new.created_at, now()) + interval '30 minutes';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_before_insert_payment_meta on public.orders;
create trigger trg_orders_before_insert_payment_meta
  before insert on public.orders
  for each row execute function public.orders_before_insert_payment_meta();

drop function if exists public.orders_after_insert_payment_meta();

-- Email outbox claim helper for edge functions
create or replace function public.claim_email_outbox(
  p_idempotency_key text,
  p_template text,
  p_to_email text,
  p_subject text,
  p_payload jsonb default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.email_outbox%rowtype;
begin
  insert into public.email_outbox (idempotency_key, template, to_email, subject, payload, status)
  values (p_idempotency_key, p_template, p_to_email, p_subject, coalesce(p_payload, '{}'), 'pending')
  on conflict (idempotency_key) do update
    set updated_at = now()
  returning * into v_row;

  -- Re-read for conflict case
  select * into v_row from public.email_outbox where idempotency_key = p_idempotency_key;

  if v_row.status = 'sent' then
    return jsonb_build_object('should_send', false, 'id', v_row.id, 'status', v_row.status);
  end if;

  update public.email_outbox
  set attempt_count = attempt_count + 1, updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object('should_send', true, 'id', v_row.id, 'status', v_row.status);
end;
$$;

create or replace function public.mark_email_outbox_sent(
  p_id uuid,
  p_provider_message_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_outbox
  set
    status = 'sent',
    provider_message_id = p_provider_message_id,
    sent_at = now(),
    last_error = null,
    updated_at = now()
  where id = p_id;
end;
$$;

create or replace function public.mark_email_outbox_failed(
  p_id uuid,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_outbox
  set
    status = 'failed',
    last_error = left(coalesce(p_error, 'unknown'), 2000),
    updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.claim_email_outbox(text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.mark_email_outbox_sent(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_email_outbox_failed(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_email_outbox(text, text, text, text, jsonb) to service_role;
grant execute on function public.mark_email_outbox_sent(uuid, text) to service_role;
grant execute on function public.mark_email_outbox_failed(uuid, text) to service_role;

-- Allow refund from awaiting_fulfilment (paid card/COD before ship)
create or replace function public.order_status_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = 'pending_payment' and p_to in ('awaiting_payment', 'awaiting_fulfilment', 'cancelled') then true
    when p_from = 'awaiting_payment' and p_to in ('awaiting_fulfilment', 'cancelled', 'refunded') then true
    when p_from = 'awaiting_fulfilment' and p_to in ('shipped', 'cancelled', 'refunded') then true
    when p_from = 'shipped' and p_to in ('delivered', 'refunded') then true
    when p_from = 'delivered' and p_to = 'refunded' then true
    else false
  end;
$$;

notify pgrst, 'reload schema';

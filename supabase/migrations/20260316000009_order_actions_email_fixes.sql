-- Cancel reason on admin transition (optional 4th arg).

drop function if exists public.admin_transition_order_status(uuid, text, text);
drop function if exists public.admin_transition_order_status(uuid, text, text, text);

create function public.admin_transition_order_status(
  p_order_id uuid,
  p_new_status text,
  p_tracking_number text default null,
  p_reason text default null
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
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
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

  if p_new_status = 'cancelled' and v_reason is null then
    raise exception 'CANCEL_REASON_REQUIRED' using errcode = 'P0001';
  end if;

  perform set_config('app.allow_stock_update', 'on', true);

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
        'order cancelled ' || v_order.order_number || coalesce(': ' || v_reason, '')
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
    notes = case
      when p_new_status = 'cancelled' and v_reason is not null then
        trim(coalesce(notes || E'\n', '') || 'Cancel reason: ' || v_reason)
      else notes
    end,
    stock_released_at = case
      when p_new_status = 'cancelled' then coalesce(stock_released_at, now())
      else stock_released_at
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
      'tracking_number', v_order.tracking_number,
      'reason', v_reason
    )
  );

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'tracking_number', v_order.tracking_number,
    'reason', v_reason
  );
end;
$$;

revoke all on function public.admin_transition_order_status(uuid, text, text, text)
  from public, anon;
grant execute on function public.admin_transition_order_status(uuid, text, text, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';

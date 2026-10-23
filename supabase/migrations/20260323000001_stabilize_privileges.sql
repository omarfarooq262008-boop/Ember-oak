-- Stabilization: payments must be admin-only from the client (service role for webhooks).
-- A lingering payments_select_own policy let authenticated buyers read payment rows.

drop policy if exists payments_select_own on public.payments;
drop policy if exists payments_admin_all on public.payments;
drop policy if exists payments_admin_select on public.payments;

create policy payments_admin_select on public.payments
  for select
  using (public.is_admin());

-- Ensure sensitive order/stock/payment helpers are not executable by anon.
-- Admin RPCs may remain executable by authenticated (they call require_admin internally).
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'require_admin',
        'create_order_atomic',
        'cancel_order_restore_stock',
        'apply_payment_webhook',
        'handle_new_user',
        'handle_new_user_profile'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;

  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'admin_%'
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;

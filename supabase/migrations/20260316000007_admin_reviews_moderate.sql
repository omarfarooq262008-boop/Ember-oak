-- Admin review moderation via SECURITY DEFINER (no direct client writes to reviews).
-- Safe to run twice.

alter table public.reviews
  add column if not exists rejected_at timestamptz;

-- Pending = not approved and not rejected
create index if not exists reviews_pending_idx
  on public.reviews (created_at desc)
  where is_approved = false and rejected_at is null;

create or replace function public.admin_moderate_review(
  p_review_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_row public.reviews%rowtype;
  v_action text := lower(trim(p_action));
begin
  v_admin := public.require_admin();

  if v_action not in ('approve', 'reject') then
    raise exception 'INVALID_ACTION' using errcode = 'P0001';
  end if;

  select * into v_row
  from public.reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'REVIEW_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_action = 'approve' then
    update public.reviews
    set
      is_approved = true,
      rejected_at = null
    where id = p_review_id
    returning * into v_row;
  else
    update public.reviews
    set
      is_approved = false,
      rejected_at = now()
    where id = p_review_id
    returning * into v_row;
  end if;

  perform public.write_admin_audit(
    'review_' || v_action,
    'review',
    p_review_id,
    jsonb_build_object(
      'product_id', v_row.product_id,
      'rating', v_row.rating,
      'customer_name', v_row.customer_name
    )
  );

  return jsonb_build_object(
    'id', v_row.id,
    'is_approved', v_row.is_approved,
    'rejected_at', v_row.rejected_at,
    'action', v_action
  );
end;
$$;

revoke all on function public.admin_moderate_review(uuid, text) from public, anon;
grant execute on function public.admin_moderate_review(uuid, text) to authenticated, service_role;

-- Remove direct client write access to reviews (admins use admin_moderate_review).
-- Keep select (public read of approved + admin/own) and customer insert of own reviews.
drop policy if exists reviews_admin on public.reviews;
drop policy if exists reviews_admin_all on public.reviews;
drop policy if exists reviews_admin_update on public.reviews;
drop policy if exists reviews_admin_delete on public.reviews;

-- Explicit: no UPDATE/DELETE policies for authenticated on reviews.
-- SELECT remains via reviews_public_read; INSERT via reviews_insert_own.

notify pgrst, 'reload schema';

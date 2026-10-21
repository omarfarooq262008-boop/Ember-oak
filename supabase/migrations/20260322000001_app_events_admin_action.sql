-- Mirror admin audit entries into app_events for the admin Events monitor.

create or replace function public.write_admin_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
begin
  insert into public.admin_audit_log (admin_id, action, entity_type, entity_id, payload)
  values (v_admin, p_action, p_entity_type, p_entity_id, coalesce(p_payload, '{}'));

  insert into public.app_events (event_type, actor_id, payload)
  values (
    'admin_action',
    v_admin,
    jsonb_build_object(
      'action', p_action,
      'entity_type', p_entity_type,
      'entity_id', p_entity_id,
      'detail', coalesce(p_payload, '{}'::jsonb)
    )
  );
end;
$$;

revoke all on function public.write_admin_audit(text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.write_admin_audit(text, text, uuid, jsonb)
  to authenticated, service_role;

notify pgrst, 'reload schema';

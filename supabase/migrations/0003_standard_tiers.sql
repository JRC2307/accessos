-- Update guest defaults to use standard access tiers

create or replace function public.ensure_default_access_tier(
  _event_id uuid
)
returns uuid
language plpgsql
as $$
declare
  _id uuid;
begin
  select id into _id
  from public.access_tiers
  where event_id = _event_id
    and name = 'Cover'
  limit 1;

  if _id is null then
    insert into public.access_tiers (event_id, name)
    values (_event_id, 'Cover')
    returning id into _id;
  end if;

  return _id;
end;
$$;

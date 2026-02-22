-- Guest defaults for AccessOS

create or replace function public.ensure_default_stakeholder_group(
  _event_id uuid,
  _owner_user_id uuid
)
returns uuid
language plpgsql
as $$
declare
  _id uuid;
begin
  select id into _id
  from public.stakeholder_groups
  where event_id = _event_id
    and name = 'DEFAULT_GUEST_LIST'
  limit 1;

  if _id is null then
    insert into public.stakeholder_groups (event_id, name, role_type, owner_user_id)
    values (_event_id, 'DEFAULT_GUEST_LIST', 'VENUE_OPS', _owner_user_id)
    returning id into _id;
  end if;

  return _id;
end;
$$;

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
    and name = 'GA'
  limit 1;

  if _id is null then
    insert into public.access_tiers (event_id, name)
    values (_event_id, 'GA')
    returning id into _id;
  end if;

  return _id;
end;
$$;

create or replace function public.ensure_default_allocation(
  _stakeholder_group_id uuid,
  _access_tier_id uuid
)
returns uuid
language plpgsql
as $$
declare
  _id uuid;
begin
  select id into _id
  from public.allocations
  where stakeholder_group_id = _stakeholder_group_id
    and access_tier_id = _access_tier_id
  limit 1;

  if _id is null then
    insert into public.allocations (stakeholder_group_id, access_tier_id, cap_total)
    values (_stakeholder_group_id, _access_tier_id, 10000)
    returning id into _id;
  end if;

  return _id;
end;
$$;

create or replace function public.ensure_guest_defaults(
  _event_id uuid,
  _owner_user_id uuid
)
returns table (stakeholder_group_id uuid, access_tier_id uuid)
language plpgsql
as $$
declare
  _sg_id uuid;
  _tier_id uuid;
begin
  _sg_id := public.ensure_default_stakeholder_group(_event_id, _owner_user_id);
  _tier_id := public.ensure_default_access_tier(_event_id);
  perform public.ensure_default_allocation(_sg_id, _tier_id);

  stakeholder_group_id := _sg_id;
  access_tier_id := _tier_id;
  return next;
end;
$$;

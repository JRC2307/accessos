-- AccessOS foundations schema (Week 1-2 from skills.md)
-- Target runtime: Supabase Postgres with auth.users available.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type public.membership_role as enum ('SUPER_ADMIN', 'ORG_ADMIN');
  end if;

  if not exists (select 1 from pg_type where typname = 'event_role') then
    create type public.event_role as enum (
      'EVENT_OWNER',
      'VENUE_OPS',
      'BOOKER',
      'TOUR_MANAGER',
      'STAGE_MANAGER',
      'PROMOTER',
      'VIP_HOST',
      'DOOR_SCANNER',
      'SECURITY_VIEW',
      'ANALYTICS_VIEW'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'guest_state') then
    create type public.guest_state as enum (
      'INVITED',
      'ISSUED',
      'CHECKED_IN',
      'DENIED',
      'REVOKED',
      'EXPIRED'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'credential_status') then
    create type public.credential_status as enum ('ACTIVE', 'REVOKED', 'EXPIRED');
  end if;

  if not exists (select 1 from pg_type where typname = 'scan_result') then
    create type public.scan_result as enum (
      'ALLOWED',
      'DENIED_DUPLICATE',
      'DENIED_REVOKED',
      'DENIED_EXPIRED',
      'DENIED_WINDOW',
      'DENIED_UNKNOWN'
    );
  end if;
end
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('VENUE', 'AGENCY', 'ORGANIZER')),
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.membership_role not null default 'ORG_ADMIN',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  timezone text not null default 'UTC',
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete set null,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  door_opens_at timestamptz,
  door_closes_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  created_by_user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create table if not exists public.access_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create table if not exists public.tier_zone_map (
  access_tier_id uuid not null references public.access_tiers (id) on delete cascade,
  zone_id uuid not null references public.zones (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (access_tier_id, zone_id)
);

create table if not exists public.event_roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.event_role not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id, role)
);

create table if not exists public.stakeholder_groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  role_type public.event_role not null check (
    role_type in ('BOOKER', 'TOUR_MANAGER', 'PROMOTER', 'VENUE_OPS', 'STAGE_MANAGER')
  ),
  owner_user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  stakeholder_group_id uuid not null references public.stakeholder_groups (id) on delete cascade,
  access_tier_id uuid not null references public.access_tiers (id) on delete cascade,
  cap_total integer not null check (cap_total >= 0),
  cap_used integer not null default 0 check (cap_used >= 0 and cap_used <= cap_total),
  created_at timestamptz not null default now(),
  unique (stakeholder_group_id, access_tier_id)
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  stakeholder_group_id uuid not null references public.stakeholder_groups (id) on delete restrict,
  access_tier_id uuid not null references public.access_tiers (id) on delete restrict,
  added_by_user_id uuid not null references public.users (id) on delete restrict,
  full_name text not null,
  phone text,
  notes text,
  priority smallint not null default 0 check (priority between 0 and 10),
  state public.guest_state not null default 'INVITED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  token text not null unique,
  status public.credential_status not null default 'ACTIVE',
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  issued_by_user_id uuid references public.users (id) on delete set null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.scan_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guest_id uuid references public.guests (id) on delete set null,
  credential_id uuid references public.credentials (id) on delete set null,
  scanned_by_user_id uuid references public.users (id) on delete set null,
  scanner_device_id text,
  result public.scan_result not null,
  reason text,
  is_offline boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  min_priority smallint not null default 8 check (min_priority between 0 and 10),
  recipient_roles public.event_role[] not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guest_id uuid references public.guests (id) on delete set null,
  scan_log_id uuid references public.scan_logs (id) on delete set null,
  recipient_user_id uuid references public.users (id) on delete set null,
  channel text not null check (channel in ('IN_APP', 'PUSH', 'EMAIL')),
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_memberships_user_id on public.memberships (user_id);
create index if not exists idx_events_org_id on public.events (org_id);
create index if not exists idx_event_roles_event_id on public.event_roles (event_id);
create index if not exists idx_stakeholder_groups_event_id on public.stakeholder_groups (event_id);
create index if not exists idx_allocations_group_tier on public.allocations (stakeholder_group_id, access_tier_id);
create index if not exists idx_guests_event_id on public.guests (event_id);
create index if not exists idx_credentials_guest_id on public.credentials (guest_id);
create index if not exists idx_scan_logs_event_time on public.scan_logs (event_id, created_at desc);
create index if not exists idx_notifications_event_id on public.notifications (event_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_touch_updated_at on public.users;
create trigger trg_users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

drop trigger if exists trg_events_touch_updated_at on public.events;
create trigger trg_events_touch_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

drop trigger if exists trg_guests_touch_updated_at on public.guests;
create trigger trg_guests_touch_updated_at
before update on public.guests
for each row execute function public.touch_updated_at();

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, new.phone, 'guest'), '@', 1)
    ),
    new.phone
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

create or replace function public.is_org_member(
  _org_id uuid,
  _roles public.membership_role[] default null
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = _org_id
      and m.user_id = auth.uid()
      and (_roles is null or m.role = any (_roles))
  );
$$;

create or replace function public.is_event_member(_event_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.events e
    join public.memberships m on m.org_id = e.org_id
    where e.id = _event_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_event(_event_id uuid)
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1
      from public.events e
      where e.id = _event_id
        and public.is_org_member(e.org_id, array['SUPER_ADMIN', 'ORG_ADMIN']::public.membership_role[])
    )
    or exists (
      select 1
      from public.event_roles er
      where er.event_id = _event_id
        and er.user_id = auth.uid()
        and er.role in ('EVENT_OWNER', 'VENUE_OPS')
    );
$$;

create or replace function public.recompute_allocation_cap_used(
  _stakeholder_group_id uuid,
  _access_tier_id uuid
)
returns void
language plpgsql
as $$
begin
  update public.allocations a
  set cap_used = (
    select count(*)
    from public.guests g
    where g.stakeholder_group_id = _stakeholder_group_id
      and g.access_tier_id = _access_tier_id
      and g.state <> 'REVOKED'
  )
  where a.stakeholder_group_id = _stakeholder_group_id
    and a.access_tier_id = _access_tier_id;
end;
$$;

create or replace function public.sync_allocation_caps()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recompute_allocation_cap_used(new.stakeholder_group_id, new.access_tier_id);
  elsif tg_op = 'UPDATE' then
    perform public.recompute_allocation_cap_used(old.stakeholder_group_id, old.access_tier_id);
    perform public.recompute_allocation_cap_used(new.stakeholder_group_id, new.access_tier_id);
  elsif tg_op = 'DELETE' then
    perform public.recompute_allocation_cap_used(old.stakeholder_group_id, old.access_tier_id);
  end if;

  return null;
end;
$$;

drop trigger if exists trg_guests_sync_allocations on public.guests;
create trigger trg_guests_sync_allocations
after insert or update or delete on public.guests
for each row execute function public.sync_allocation_caps();

create or replace function public.within_allocation_cap(
  _stakeholder_group_id uuid,
  _access_tier_id uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.allocations a
    where a.stakeholder_group_id = _stakeholder_group_id
      and a.access_tier_id = _access_tier_id
      and a.cap_used < a.cap_total
  );
$$;

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.memberships enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.zones enable row level security;
alter table public.access_tiers enable row level security;
alter table public.tier_zone_map enable row level security;
alter table public.event_roles enable row level security;
alter table public.stakeholder_groups enable row level security;
alter table public.allocations enable row level security;
alter table public.guests enable row level security;
alter table public.credentials enable row level security;
alter table public.scan_logs enable row level security;
alter table public.notification_rules enable row level security;
alter table public.notifications enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select
on public.organizations
for select
using (public.is_org_member(id));

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert
on public.organizations
for insert
with check (auth.uid() is not null);

drop policy if exists organizations_update on public.organizations;
create policy organizations_update
on public.organizations
for update
using (public.is_org_member(id, array['SUPER_ADMIN', 'ORG_ADMIN']::public.membership_role[]))
with check (public.is_org_member(id, array['SUPER_ADMIN', 'ORG_ADMIN']::public.membership_role[]));

drop policy if exists users_select on public.users;
create policy users_select
on public.users
for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.memberships me
    join public.memberships peer on peer.org_id = me.org_id
    where me.user_id = auth.uid()
      and peer.user_id = users.id
  )
);

drop policy if exists users_insert on public.users;
create policy users_insert
on public.users
for insert
with check (id = auth.uid());

drop policy if exists users_update on public.users;
create policy users_update
on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists memberships_select on public.memberships;
create policy memberships_select
on public.memberships
for select
using (
  user_id = auth.uid()
  or public.is_org_member(org_id, array['SUPER_ADMIN', 'ORG_ADMIN']::public.membership_role[])
);

drop policy if exists memberships_manage on public.memberships;
create policy memberships_manage
on public.memberships
for all
using (public.is_org_member(org_id, array['SUPER_ADMIN', 'ORG_ADMIN']::public.membership_role[]))
with check (public.is_org_member(org_id, array['SUPER_ADMIN', 'ORG_ADMIN']::public.membership_role[]));

drop policy if exists venues_access on public.venues;
drop policy if exists venues_select on public.venues;
drop policy if exists venues_manage on public.venues;
create policy venues_select
on public.venues
for select
using (public.is_org_member(org_id));
create policy venues_manage
on public.venues
for all
using (public.is_org_member(org_id, array['SUPER_ADMIN', 'ORG_ADMIN']::public.membership_role[]))
with check (public.is_org_member(org_id, array['SUPER_ADMIN', 'ORG_ADMIN']::public.membership_role[]));

drop policy if exists events_select on public.events;
create policy events_select
on public.events
for select
using (public.is_org_member(org_id));

drop policy if exists events_manage on public.events;
create policy events_manage
on public.events
for all
using (public.can_manage_event(id))
with check (public.is_org_member(org_id));

drop policy if exists zones_access on public.zones;
drop policy if exists zones_select on public.zones;
drop policy if exists zones_manage on public.zones;
create policy zones_select
on public.zones
for select
using (public.is_event_member(event_id));
create policy zones_manage
on public.zones
for all
using (public.can_manage_event(event_id))
with check (public.can_manage_event(event_id));

drop policy if exists access_tiers_access on public.access_tiers;
drop policy if exists access_tiers_select on public.access_tiers;
drop policy if exists access_tiers_manage on public.access_tiers;
create policy access_tiers_select
on public.access_tiers
for select
using (public.is_event_member(event_id));
create policy access_tiers_manage
on public.access_tiers
for all
using (public.can_manage_event(event_id))
with check (public.can_manage_event(event_id));

drop policy if exists tier_zone_map_access on public.tier_zone_map;
drop policy if exists tier_zone_map_select on public.tier_zone_map;
drop policy if exists tier_zone_map_manage on public.tier_zone_map;
create policy tier_zone_map_select
on public.tier_zone_map
for select
using (
  exists (
    select 1
    from public.access_tiers t
    where t.id = tier_zone_map.access_tier_id
      and public.is_event_member(t.event_id)
  )
);
create policy tier_zone_map_manage
on public.tier_zone_map
for all
using (
  exists (
    select 1
    from public.access_tiers t
    where t.id = tier_zone_map.access_tier_id
      and public.can_manage_event(t.event_id)
  )
)
with check (
  exists (
    select 1
    from public.access_tiers t
    where t.id = tier_zone_map.access_tier_id
      and public.can_manage_event(t.event_id)
  )
);

drop policy if exists event_roles_access on public.event_roles;
drop policy if exists event_roles_select on public.event_roles;
drop policy if exists event_roles_manage on public.event_roles;
create policy event_roles_select
on public.event_roles
for select
using (public.is_event_member(event_id));
create policy event_roles_manage
on public.event_roles
for all
using (public.can_manage_event(event_id))
with check (public.can_manage_event(event_id));

drop policy if exists stakeholder_groups_access on public.stakeholder_groups;
drop policy if exists stakeholder_groups_select on public.stakeholder_groups;
drop policy if exists stakeholder_groups_manage on public.stakeholder_groups;
create policy stakeholder_groups_select
on public.stakeholder_groups
for select
using (public.is_event_member(event_id));
create policy stakeholder_groups_manage
on public.stakeholder_groups
for all
using (public.can_manage_event(event_id))
with check (public.can_manage_event(event_id));

drop policy if exists allocations_access on public.allocations;
drop policy if exists allocations_select on public.allocations;
drop policy if exists allocations_manage on public.allocations;
create policy allocations_select
on public.allocations
for select
using (
  exists (
    select 1
    from public.stakeholder_groups sg
    where sg.id = allocations.stakeholder_group_id
      and public.is_event_member(sg.event_id)
  )
);
create policy allocations_manage
on public.allocations
for all
using (
  exists (
    select 1
    from public.stakeholder_groups sg
    where sg.id = allocations.stakeholder_group_id
      and public.can_manage_event(sg.event_id)
  )
)
with check (
  exists (
    select 1
    from public.stakeholder_groups sg
    where sg.id = allocations.stakeholder_group_id
      and public.can_manage_event(sg.event_id)
  )
);

drop policy if exists guests_select on public.guests;
create policy guests_select
on public.guests
for select
using (public.is_event_member(event_id));

drop policy if exists guests_insert on public.guests;
create policy guests_insert
on public.guests
for insert
with check (
  public.is_event_member(event_id)
  and (
    public.can_manage_event(event_id)
    or exists (
      select 1
      from public.stakeholder_groups sg
      where sg.id = guests.stakeholder_group_id
        and sg.owner_user_id = auth.uid()
    )
  )
  and public.within_allocation_cap(stakeholder_group_id, access_tier_id)
);

drop policy if exists guests_update on public.guests;
create policy guests_update
on public.guests
for update
using (
  public.can_manage_event(event_id)
  or added_by_user_id = auth.uid()
)
with check (
  public.can_manage_event(event_id)
  or added_by_user_id = auth.uid()
);

drop policy if exists credentials_select on public.credentials;
create policy credentials_select
on public.credentials
for select
using (
  exists (
    select 1
    from public.guests g
    where g.id = credentials.guest_id
      and public.is_event_member(g.event_id)
  )
);

drop policy if exists credentials_manage on public.credentials;
create policy credentials_manage
on public.credentials
for all
using (
  exists (
    select 1
    from public.guests g
    where g.id = credentials.guest_id
      and public.is_event_member(g.event_id)
      and (public.can_manage_event(g.event_id) or g.added_by_user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.guests g
    where g.id = credentials.guest_id
      and public.is_event_member(g.event_id)
      and (public.can_manage_event(g.event_id) or g.added_by_user_id = auth.uid())
  )
);

drop policy if exists scan_logs_select on public.scan_logs;
create policy scan_logs_select
on public.scan_logs
for select
using (public.is_event_member(event_id));

drop policy if exists scan_logs_insert on public.scan_logs;
create policy scan_logs_insert
on public.scan_logs
for insert
with check (
  public.is_event_member(event_id)
  and (
    public.can_manage_event(event_id)
    or exists (
      select 1
      from public.event_roles er
      where er.event_id = scan_logs.event_id
        and er.user_id = auth.uid()
        and er.role in ('DOOR_SCANNER', 'VENUE_OPS', 'EVENT_OWNER')
    )
  )
);

drop policy if exists notification_rules_access on public.notification_rules;
drop policy if exists notification_rules_select on public.notification_rules;
drop policy if exists notification_rules_manage on public.notification_rules;
create policy notification_rules_select
on public.notification_rules
for select
using (public.is_event_member(event_id));
create policy notification_rules_manage
on public.notification_rules
for all
using (public.can_manage_event(event_id))
with check (public.can_manage_event(event_id));

drop policy if exists notifications_access on public.notifications;
create policy notifications_access
on public.notifications
for select
using (public.is_event_member(event_id));

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert
on public.notifications
for insert
with check (public.can_manage_event(event_id));

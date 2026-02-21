# AccessOS

Digital guest list and access control platform for club/party operations.

## Current implementation

- Bilingual UI (Spanish/English toggle).
- Light/Dark theme toggle with persistence.
- Foundation dashboard for zones, tiers, roles, and allocations.
- Supabase auth scaffold (email OTP) and event CRUD scaffold.
- Initial Postgres schema + RLS + allocation cap sync trigger.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` values into `.env.local` with real keys.
3. Run SQL migration from `supabase/migrations/0001_foundations.sql` in Supabase SQL Editor.
4. Create one organization row and membership for your auth user so RLS allows event CRUD.

## Database foundations

- Migration file: `supabase/migrations/0001_foundations.sql`
- Core tables (`organizations`, `events`, `zones`, `access_tiers`, `guests`, `credentials`, `scan_logs`, `notifications`)
- Role mappings (`memberships`, `event_roles`, `stakeholder_groups`)
- Allocation controls (`allocations` + `sync_allocation_caps` trigger)
- RLS helper functions and access policies by org/event role
- Auth bridge trigger (`auth.users` -> `public.users`)

## Next implementation targets

1. Event setup CRUD for `zones`, `access_tiers`, `tier_zone_map`, `allocations`.
2. Guest CRUD with allocation-cap validation in UI.
3. QR credential issuance and scan logging flow.

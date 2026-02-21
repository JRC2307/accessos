# skills.md — AccessOS (Digital Guest List + Access Control)

## 0) What this project is
AccessOS is a **digital guest list + access permissions** platform for clubs/parties (festival support later). It replaces WhatsApp screenshots and spreadsheets with a **single source of truth** for:
- Guest lists per stakeholder (booker, tour manager, promoter, venue)
- Tiered permissions (GA/VIP/Backstage/etc.)
- Door scanning + real-time counts
- **VIP arrival alerts** so hosts can receive key guests

Primary users: **Bookers / Tour Managers / Stage Managers**
Secondary users: **Venue Ops / Door staff (cadenero) / VIP Host**

---

## 1) Product principles (non-negotiables)
1. **Single source of truth**: no parallel lists; everything is inside the system.
2. **Quota & accountability**: "who added who" + hard caps per stakeholder allocation.
3. **Door-first UX**: scanning must be instant, low cognitive load, offline-tolerant.
4. **Real-time ops**: counts, arrivals, and status must update live.
5. **Permissioned access**: roles and zones are explicit; least-privilege by default.
6. **Fast to adopt**: PWA-first, minimal training, WhatsApp-like sharing flows.

---

## 2) MVP scope (clubs/parties only)
### Must-have
- Multi-tenant: venues + organizers
- Create event
- Define access tiers (GA/VIP/Backstage/Artist/Press/etc.)
- Define zones (Main floor, VIP, Backstage, etc.)
- Stakeholder allocations (Booker/TM/Promoter/Venue) with caps
- Add guests (name, phone optional, notes, priority flag)
- Credential issuance (QR token)
- Door scan (validate + check-in)
- Live counters (total + per zone)
- VIP arrival alerts (push/in-app)

### Nice-to-have (post-MVP)
- +1 management / guest transfers
- ID verification/photo capture
- Fraud controls (rate limits, device trust)
- Analytics export (CSV)
- Integrations (ticketing/CRM)

Not in scope now: wristbands/NFC, multi-gate festival ops.

---

## 3) Domain model (conceptual)
### Entities
- **Organization**: Venue org or Agency org (multi-tenant boundary)
- **User**: account with phone/email auth
- **Event**: party/night
- **Zone**: physical area inside venue (VIP, Backstage)
- **AccessTier**: semantic tier (GA, VIP, Backstage) mapping to zones allowed
- **StakeholderGroup**: Booker, Tour Manager, Promoter, Venue Ops (per event)
- **Allocation**: caps and permissions granted to a stakeholder group
- **Guest**: person entry record for an event
- **Credential**: QR token tied to a guest (rotatable/revocable)
- **ScanLog**: check-in attempts (success/failure, timestamp, device)
- **NotificationRule**: triggers for VIP arrival + ops alerts

### Core states (Guest lifecycle)
- INVITED -> ISSUED -> CHECKED_IN (or DENIED / REVOKED / EXPIRED)
- Important: a credential can be revoked even after issuance.

---

## 4) Roles & permissions (RBAC + event-scoped)
### Global roles
- SUPER_ADMIN (platform)
- ORG_ADMIN (venue/agency admin)

### Event roles
- EVENT_OWNER (organizer)
- VENUE_OPS
- BOOKER
- TOUR_MANAGER
- STAGE_MANAGER
- PROMOTER
- VIP_HOST
- DOOR_SCANNER (cadenero)
- SECURITY_VIEW (read-only zones)
- ANALYTICS_VIEW (read-only reports)

### Permission categories
- Manage Event (create/edit)
- Manage Zones/Tiers
- Manage Allocations (caps per stakeholder)
- Add/Edit Guests
- Issue/Revoke Credentials
- Scan Check-ins
- View Live Counts
- Configure Notifications
- Export Data

### Default policy (MVP)
- Booker/TM/Promoter: can **add guests only within their allocation cap**
- Door scanner: can **scan** and view minimal guest info + tier
- VIP host: sees **VIP arrivals** + notes
- Venue ops: sees full counts and can override (optional, behind feature flag)

---

## 5) Key workflows
### 5.1 Event setup (Organizer/Venue Ops)
1. Create event (date/time, venue, capacity, door open/close) can be a single event
2. Create zones + tiers
3. Create stakeholder allocations (caps by tier/zone)

### 5.2 Guest list building (Booker/TM/Promoter)
1. Add guest (name, optional phone, notes, priority)
2. Select tier (must be allowed by allocation)
3. Issue credential (QR) — share via link/QR image

### 5.3 Door operations (Door Scanner)
1. Open scanner (offline-tolerant)
2. Scan QR -> validate token -> check tier/zone
3. Mark check-in, show result:
   - allowed (tier, zones)
   - denied (reason: revoked/duplicate/outside hours/cap reached)

### 5.4 VIP arrival alert (VIP Host + relevant roles)
Trigger: first successful check-in for guest where priority >= VIP
Actions:
- push/in-app notification to configured recipients (VIP host, promoter, venue ops)
- include: guest name, tier, timestamp, notes, "added by"

---

## 6) Non-functional requirements
- **Latency**: scan validation < 500ms online; instant feedback offline (with sync)
- **Reliability**: scanning must work in bad network conditions
- **Security**: signed/opaque QR tokens; rate-limit scanning attempts; device binding optional
- **Privacy**: minimize PII; phone optional; role-based data visibility
- **Auditability**: immutable scan logs; track who added/edited/revoked

---

## 7) Suggested tech stack (Codex-friendly)
- Frontend: Next.js (App Router) + TypeScript + Tailwind
- Mobile-first PWA: camera scanning (zxing / html5-qrcode equivalent)
- Backend: Supabase (Postgres + RLS + Realtime)
- Auth: Supabase Auth (phone OTP preferred for MX)
- Notifications (MVP): in-app + web push (optional), fallback to email
- Observability: basic event logging + Sentry (later)

---

## 8) Data model (initial tables)
Minimum set for MVP:
- organizations
- users
- memberships (user ↔ org roles)
- venues (optional if org can own venues)
- events
- zones
- access_tiers
- tier_zone_map
- event_roles (user ↔ event role)
- stakeholder_groups
- allocations (group caps by tier)
- guests
- credentials
- scan_logs
- notification_rules
- notifications (delivered events)

RLS approach:
- org boundary: users see only org events
- event role boundary: users can only edit guests in their stakeholder group allocation
- door scanners: read-only guest minimal fields + write scan_logs

---

## 9) QR token strategy (anti-fraud MVP)
- QR encodes an **opaque random token** referencing credentials.id
- Credential has:
  - status (active/revoked/expired)
  - max_uses (default 1)
  - used_count
  - optional rotating_nonce (v2)
- On scan:
  - if used_count >= max_uses -> deny duplicate
  - log attempt regardless of outcome

Offline mode (v1):
- Cache active credentials list for the event on device (time-limited)
- Allow scan validation against cache
- Sync scan logs when connection returns
- Conflict resolution: server is source of truth; if double-use occurs, flag alert

---

## 10) Metrics (what “good” looks like)
- Door throughput (scans/min)
- Guest no-show rate by stakeholder
- VIP arrival times distribution
- Deny rate (fraud/duplicate/cap)
- Time to build list (booker efficiency)

---

## 11) Milestones (execution plan)
### Week 1–2: Foundations
- DB schema + RLS
- Auth + org/event scaffolding
- Roles + allocations

### Week 3–4: Guest + Credential
- Guest CRUD within caps
- QR issuance & share links

### Week 5: Door scanning
- Scanner UI + scan logs + live counts

### Week 6: VIP alerts + polish
- Notification rules + VIP host view
- Audit log surfaces
- Pilot in 1–2 clubs

---

## 12) Naming & positioning (placeholder)
- Product: AccessOS / ListaPro / DoorOps
- Tagline: "One list. Real-time access. Zero chaos."

---

## 13) Open decisions (keep flexible)
- Phone required vs optional
- Identity verification (photo/ID) — later
- Overrides allowed for door/venue ops — behind feature flag
- Push notifications vs WhatsApp bridge — later

---

## 14) Success criteria for first pilot
- 3–5 events run end-to-end without WhatsApp lists
- Door team uses scanner >90% of entries
- Booker/TM actively manage allocations
- VIP host reliably receives arrival alerts
- Venue can see live counts and reconcile after event

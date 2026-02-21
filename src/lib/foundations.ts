export type MembershipRole = "SUPER_ADMIN" | "ORG_ADMIN";

export type EventRole =
  | "EVENT_OWNER"
  | "VENUE_OPS"
  | "BOOKER"
  | "TOUR_MANAGER"
  | "STAGE_MANAGER"
  | "PROMOTER"
  | "VIP_HOST"
  | "DOOR_SCANNER"
  | "SECURITY_VIEW"
  | "ANALYTICS_VIEW";

export type TierName = "GA" | "VIP" | "BACKSTAGE" | "ARTIST" | "PRESS";

export interface EventSetup {
  eventName: string;
  venueName: string;
  startsAt: string;
  doorWindow: string;
  capacity: number;
}

export interface Zone {
  name: string;
  capacity: number;
}

export interface AccessTier {
  name: TierName;
  zonesAllowed: string[];
}

export interface StakeholderAllocation {
  groupName: string;
  roleType: Extract<
    EventRole,
    "BOOKER" | "TOUR_MANAGER" | "PROMOTER" | "VENUE_OPS" | "STAGE_MANAGER"
  >;
  caps: Record<TierName, number>;
}

export interface FoundationSnapshot {
  setup: EventSetup;
  zones: Zone[];
  tiers: AccessTier[];
  rosterRoles: EventRole[];
  allocations: StakeholderAllocation[];
}

export const foundationSnapshot: FoundationSnapshot = {
  setup: {
    eventName: "SABADO: NORTH WAREHOUSE SESSION",
    venueName: "North Warehouse Club",
    startsAt: "2026-03-14 22:00",
    doorWindow: "21:30 to 04:30",
    capacity: 1200,
  },
  zones: [
    { name: "Main Floor", capacity: 900 },
    { name: "VIP Deck", capacity: 180 },
    { name: "Backstage", capacity: 80 },
    { name: "Artist Green Room", capacity: 40 },
  ],
  tiers: [
    { name: "GA", zonesAllowed: ["Main Floor"] },
    { name: "VIP", zonesAllowed: ["Main Floor", "VIP Deck"] },
    {
      name: "BACKSTAGE",
      zonesAllowed: ["Main Floor", "VIP Deck", "Backstage"],
    },
    {
      name: "ARTIST",
      zonesAllowed: ["Main Floor", "VIP Deck", "Backstage", "Artist Green Room"],
    },
    { name: "PRESS", zonesAllowed: ["Main Floor", "VIP Deck"] },
  ],
  rosterRoles: [
    "EVENT_OWNER",
    "VENUE_OPS",
    "BOOKER",
    "TOUR_MANAGER",
    "PROMOTER",
    "VIP_HOST",
    "DOOR_SCANNER",
    "SECURITY_VIEW",
    "ANALYTICS_VIEW",
  ],
  allocations: [
    {
      groupName: "Headliner Booker",
      roleType: "BOOKER",
      caps: { GA: 10, VIP: 20, BACKSTAGE: 8, ARTIST: 4, PRESS: 0 },
    },
    {
      groupName: "Tour Manager Team",
      roleType: "TOUR_MANAGER",
      caps: { GA: 8, VIP: 12, BACKSTAGE: 6, ARTIST: 8, PRESS: 0 },
    },
    {
      groupName: "Local Promoter",
      roleType: "PROMOTER",
      caps: { GA: 70, VIP: 40, BACKSTAGE: 10, ARTIST: 0, PRESS: 15 },
    },
    {
      groupName: "Venue Ops",
      roleType: "VENUE_OPS",
      caps: { GA: 20, VIP: 18, BACKSTAGE: 6, ARTIST: 0, PRESS: 10 },
    },
  ],
};

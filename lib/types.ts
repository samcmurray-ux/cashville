// Shapes returned by the Supabase queries and by buildView() in lib/bd.ts.
// Names match the prototype (data.js BD shape) so component code reads the same.

export type Player = {
  id: string;
  name: string;
  email: string;
  hue: number;
  persona: string | null;
  is_admin: boolean | null;
  // Small square image as a data: URL, uploaded by the player. Null = initials.
  photo?: string | null;
  // Public URL of the player's celebration clip (short video or GIF).
  clip?: string | null;
};

export type WeekRow = {
  week_number: number;
  week_date: string;
  stake_per_acca: number | null;
  acca_won: boolean | null;
  combined_odds: number | null;
  payout: number | null;
  notes: string | null;
  placer_id?: string | null;
};

export type PickRow = {
  id: string;
  week_number: number;
  player_id: string;
  sport: string | null;
  selection: string | null;
  market: string | null;
  odds: number | null;
  result: "Won" | "Lost" | "Push" | null | string;
  notes: string | null;
  punishment: number | null;
  filled: boolean | null;
  created_at: string;
  updated_at: string;
};

export type MovementRow = {
  id: string;
  week_number: number | null;
  type: "win" | "forfeit" | "bonus" | "adjust";
  amount: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

export type TripRow = {
  id: number;
  target: number;
  trip_date: string;
  breakdown: Array<{ label: string; amount: number }> | null;
};

// Derived view (used by the UI) ────────────────────────────────────────────

export type ViewPick = {
  playerId: string;
  sport: string;
  sel: string;
  odds: number | null;
  result: "" | "Won" | "Lost" | "Push";
  filled: boolean;
  punishment: number;
  notes: string;
  _dbId?: string;
};

export type ViewWeek = {
  week: number;
  date: string;
  picks: ViewPick[];
  combinedOdds: number;
  // Total on the bet: the base stake plus any automatic streak top-ups.
  stake: number;
  topups: { playerId: string; amount: number }[];
  payout: number;
  accaWon: boolean;
  filled: boolean;
  wonCount: number;
  lostCount: number;
  pushCount: number;
  // Who places the bet with the bookie. Follows the rotation unless someone
  // set it by hand for this week (placerExplicit).
  placerId: string | null;
  placerExplicit: boolean;
};

export type ViewMovement = {
  id: string;
  week: number | null;
  type: MovementRow["type"];
  amount: number;
  notes: string;
};

export type Trip = {
  name: string;
  target: number;
  current: number;
  tripDate: string;
  breakdown: Array<{ label: string; amount: number }>;
};

export type BD = {
  players: Player[];
  weeks: ViewWeek[];
  currentWeek: ViewWeek;
  currentWeekNum: number;
  trip: Trip;
  movements: ViewMovement[];
  playedCount: number;
  settings: Settings;
  fines: Fine[];
  votes: Vote[];
  sideBets: SideBet[];
  // False until supabase/migration-v2.sql has been run — the fines, votes
  // and side-bet screens show a "database not set up" note instead.
  v2Ready: boolean;
};

// ─── v2: fines, votes, side bets ──────────────────────────────────────────

export type Settings = {
  lateFine: number;
  lossFine: number;
  streak4Fine: number;
  topup2: number;
  topup3: number;
  overdueFine: number;
  sideBetTaxPct: number;
  rulesText: string;
  finesFromWeek: number;
};

export type FineKind = "late" | "loss" | "overdue" | "manual";

export type Fine = {
  id: string;
  week: number | null;
  playerId: string;
  kind: FineKind;
  amount: number;
  reason: string;
  paid: boolean;
  paidAt: string | null;
  movementId: string | null;
  parentId: string | null;
  createdAt: string;
};

export type VoteKind = "star" | "poo" | "win" | "lose";

export type Vote = {
  id: string;
  week: number;
  voterId: string;
  targetId: string;
  kind: VoteKind;
};

export type SideBet = {
  id: string;
  week: number;
  creatorId: string;
  opponentId: string;
  subjectId: string;
  creatorBacks: "win" | "lose";
  amount: number;
  status: "open" | "accepted" | "declined";
  paid: boolean;
  movementId: string | null;
  createdAt: string;
};

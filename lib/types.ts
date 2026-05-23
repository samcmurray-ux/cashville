// Shapes returned by the Supabase queries and by buildView() in lib/bd.ts.
// Names match the prototype (data.js BD shape) so component code reads the same.

export type Player = {
  id: string;
  name: string;
  email: string;
  hue: number;
  persona: string | null;
  is_admin: boolean | null;
};

export type WeekRow = {
  week_number: number;
  week_date: string;
  stake_per_acca: number | null;
  acca_won: boolean | null;
  combined_odds: number | null;
  payout: number | null;
  notes: string | null;
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
  stake: number;
  payout: number;
  accaWon: boolean;
  filled: boolean;
  wonCount: number;
  lostCount: number;
  pushCount: number;
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
};

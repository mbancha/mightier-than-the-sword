import type { Row } from '../data/catalog';
import type { RngState } from '../kernel/rng';
export interface Player {
  controller: 'human' | 'bot';
  name: string;
  supply: number;
  reserves: number[];
  out: number;
  points: number;
  page: number;
  rows: Record<Row, number>;
  everUpgraded: Row[];
  hand: number[];
  subplot: number | null;
  progress: number;
  completing: boolean;
  horse: number | null;
  horseSpent: boolean;
}
export interface Memory {
  owner: number;
  row: Row;
}
export interface Slot {
  page: number;
  owner: number | null;
  memory: Memory | null;
}
export interface Book {
  id: number;
  q: number;
  r: number;
  slots: Slot[];
  overflow: number[];
  covered: boolean;
  tokens: { id: number; strong: boolean }[];
}
export interface Character {
  id: number;
  owner: number;
  page: number;
  other: number | null;
  used: number[];
  collected: number;
}
// Jobs are data, not closures: saves and undo preserve every pending choice.
export interface Job {
  type: string;
  p: number;
  n?: number;
  book?: number;
  page?: number;
  char?: number;
  action?: number;
  row?: Row;
  card?: number;
  mode?: string;
  source?: string;
  target?: number;
  optional?: boolean;
  remaining?: number[];
  origin?: number;
}
export interface Battle {
  book: number;
  participants: number[];
  bonus: number[];
  played: number[];
  ignored: number[];
  allIgnored: boolean;
  hero: number[];
  revenge: number[];
  tribute: number[];
  complete: number[];
  cursor: number;
  slotOwner: number | null;
  slotPlayed: number;
  extraUsed: number[];
  winner: number | null;
  cards: number[];
}
export interface GameEvent {
  type:
    | 'turn'
    | 'points'
    | 'subplotDraw'
    | 'subplotComplete'
    | 'character'
    | 'activate'
    | 'upgrade'
    | 'place'
    | 'foreshadow'
    | 'erase'
    | 'twist'
    | 'conflictStart'
    | 'conflictEnd'
    | 'moon'
    | 'token'
    | 'memoryReward';
  act: number;
  turn: number;
  player: number;
  id?: number;
  book?: number;
  amount?: number;
  row?: Row;
  source?: string;
  participants?: number[];
  characters?: { id: number; owner: number }[];
}
export interface GameState {
  // Opt-in structured telemetry. Never exposed to bots or required for replay.
  events?: GameEvent[];
  schema: 1;
  version: string;
  seed: number;
  rng: RngState;
  players: Player[];
  books: Book[];
  unpublished: number[];
  pendingConflicts: number[];
  characters: Character[];
  decks: { twist: number[]; subplot: number[]; character: number[] };
  discards: { twist: number[]; subplot: number[] };
  pools: number[][];
  act: number;
  active: number;
  turn: number;
  acted: boolean;
  jobs: Job[];
  battle: Battle | null;
  log: string[];
  over: boolean;
}
export interface Action {
  key: string;
}
export interface Choice extends Action {
  label: string;
  group: string;
  page?: number;
  book?: number;
  detail?: string;
  q?: number;
  r?: number;
}
export interface Setup {
  names: string[];
  seed: number;
  controllers?: ('human' | 'bot')[];
}

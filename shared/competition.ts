/** Cross-town competition contracts. Every decision is the server's; the site only reads. */
export type TournamentEntry = { position: number; userId: string; name: string; townName: string;
  fishType: number; inches: number; caughtAt: number };
export type TournamentAward = { week: string; userId: string; name: string; inches: number; fishType: number;
  /** The trophy waits in the pending ledger until the winner's pockets are reachable and have room. */
  delivered: boolean };
/** GET /api/tournament -> TournamentView */
export type TournamentView = { week: string; startsAt: number; endsAt: number; entries: TournamentEntry[];
  lastWinner: TournamentAward | null; serverTime: number };

/** Native measure is whole inches; the site shows centimetres like the PT-BR text. */
export function tournamentLength(inches: number): string {
  return `${(inches * 2.54).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm`;
}

/** Units sold this Sunday week and their profit over the Sunday cost. */
export type TurnipStanding = { userId: string; units: number; profit: number };
/** GET /api/turnips: the server's price today in each town the player may visit. */
export type TurnipTown = { townId: string; townName: string; owner: string; price: number; sundayPrice: number;
  /** Prices already reached this week, Sunday first; later days stay hidden. */
  week: number[]; fee: number; feeDue: number; own: boolean };
export type TurnipView = { week: string; weekday: number; towns: TurnipTown[]; serverTime: number };

/** One town's week in the league: raw counts and the points they make. */
export type LeaguePoints = { rating: number; museum: number; fish: number; turnips: number; goals: number; total: number };
export type LeagueTown = { position: number; townId: string; townName: string; residents: string[]; points: LeaguePoints };
export type LeagueChampion = { season: string; name: string; townId: string; townName: string; total: number };
/** GET /api/league: this week live, last week settled, the month's season and past champions. */
export type LeagueView = { week: string; startsAt: number; endsAt: number; season: string; seasonName: string;
  towns: LeagueTown[]; lastWeek: LeagueTown[]; standings: { townId: string; townName: string; total: number; weeks: number }[];
  champions: LeagueChampion[]; serverTime: number };
export type ProjectContributor = { userId: string; name: string; bells: number };
/** The neighbourhood's collective project: Bells raised toward the goal by every friend. */
export type ProjectView = { id: string; title: string; goal: number; raised: number; contributionMax: number; completedAt: number | null;
  contributors: ProjectContributor[]; serverTime: number };
/** What the giver can send to one friend now: own pocket and wallet, the friend's loan and today's room. */
export type GiftState = { friendId: string; friendName: string; townName: string; wallet: number; pockets: { slot: number; item: number }[];
  loan: number; loanRoom: number; lettersLeft: number; textMax: number; papers: number; serverTime: number };

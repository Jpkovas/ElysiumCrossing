import { tournamentLength } from './competition';
export const RANKING_CATEGORIES = ['bells', 'furniture', 'playtime', 'fish', 'tournament', 'chip', 'turnips'] as const;
export type RankingCategory = typeof RANKING_CATEGORIES[number];
export const RANKING_LABELS: Record<RankingCategory, string> = {
  bells: 'Bells', furniture: 'Móveis', playtime: 'Tempo', fish: 'Peixes', tournament: 'Torneio', chip: 'Chip', turnips: 'Nabos',
};
/** site-nav/proposal A: the open category is the Ranking tab's title, with one short line under it. */
export const RANKING_TITLES: Record<RankingCategory, string> = {
  bells: 'Mais Bells', furniture: 'Mais móveis no catálogo', playtime: 'Mais tempo na vila', fish: 'Mais peixes pescados',
  tournament: 'Torneio de pesca da semana', chip: 'Maior peixe do Chip', turnips: 'Maior lucro com nabos',
};
export const RANKING_DESCRIPTIONS: Record<RankingCategory, string> = {
  bells: 'Carteira e banco.',
  furniture: 'Tipos de móveis registrados no catálogo.',
  playtime: 'Tempo conectado dentro do jogo.',
  fish: 'Capturas confirmadas; cada peixe conta uma vez.',
  tournament: 'Maior peixe de segunda a domingo; o campeão leva o troféu.',
  chip: 'Domingos de junho e novembro, das 6h às 18h.',
  turnips: 'Vendas no Nook menos o custo de domingo, na semana.',
};
/** `townPosition`: the place among the residents of the same town (Chip tourney). */
export type RankingEntry = { position: number; userId: string; name: string; townId: string; townName: string; value: number; portrait?: string; townPosition?: number };
export type Ranking = { category: RankingCategory; entries: RankingEntry[]; serverTime: number };
export function rankingCategory(value: unknown): value is RankingCategory {
  return typeof value === 'string' && (RANKING_CATEGORIES as readonly string[]).includes(value);
}
export function rankingValue(category: RankingCategory, value: number): string {
  if (category === 'playtime') {
    const minutes = Math.floor(value / 60_000);
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }
  if (category === 'tournament' || category === 'chip') return value === 0 ? '—' : tournamentLength(value);
  if (category === 'turnips') return `${value.toLocaleString('pt-BR')} Bells`;
  return value.toLocaleString('pt-BR');
}

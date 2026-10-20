import { tournamentLength } from './competition';
export const RANKING_CATEGORIES = ['bells', 'furniture', 'playtime', 'fish', 'tournament', 'turnips'] as const;
export type RankingCategory = typeof RANKING_CATEGORIES[number];
export const RANKING_LABELS: Record<RankingCategory, string> = {
  bells: 'Bells', furniture: 'Móveis', playtime: 'Tempo', fish: 'Peixes', tournament: 'Torneio', turnips: 'Nabos',
};
export const RANKING_DESCRIPTIONS: Record<RankingCategory, string> = {
  bells: 'Bells na carteira e no banco.',
  furniture: 'Tipos de móveis registrados no catálogo.',
  playtime: 'Tempo conectado dentro do jogo, contado desde a chegada do ranking.',
  fish: 'Capturas confirmadas no jogo. Cada peixe conta uma vez.',
  tournament: 'Maior peixe da semana, medido como no torneio do jogo. Vale de segunda a domingo; o campeão recebe o troféu.',
  turnips: 'Maior lucro com nabo da semana: vendas no Nook menos o custo de domingo, em qualquer vila.',
};
export type RankingEntry = { position: number; userId: string; name: string; townId: string; townName: string; value: number; portrait?: string };
export type Ranking = { category: RankingCategory; entries: RankingEntry[]; serverTime: number };
export function rankingCategory(value: unknown): value is RankingCategory {
  return typeof value === 'string' && (RANKING_CATEGORIES as readonly string[]).includes(value);
}
export function rankingValue(category: RankingCategory, value: number): string {
  if (category === 'playtime') {
    const minutes = Math.floor(value / 60_000);
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }
  if (category === 'tournament') return value === 0 ? '—' : tournamentLength(value);
  if (category === 'turnips') return `${value.toLocaleString('pt-BR')} Bells`;
  return value.toLocaleString('pt-BR');
}

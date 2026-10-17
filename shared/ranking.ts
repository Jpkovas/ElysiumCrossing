export const RANKING_CATEGORIES = ['bells', 'furniture', 'playtime', 'fish'] as const;
export type RankingCategory = typeof RANKING_CATEGORIES[number];
export const RANKING_LABELS: Record<RankingCategory, string> = {
  bells: 'Bells', furniture: 'Móveis', playtime: 'Tempo', fish: 'Peixes',
};
export const RANKING_DESCRIPTIONS: Record<RankingCategory, string> = {
  bells: 'Bells na carteira e no banco.',
  furniture: 'Tipos de móveis registrados no catálogo.',
  playtime: 'Tempo conectado dentro do jogo, contado desde a chegada do ranking.',
  fish: 'Capturas confirmadas no jogo. Cada peixe conta uma vez.',
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
  return value.toLocaleString('pt-BR');
}

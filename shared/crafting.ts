import { WORLD_FURNITURE_ITEM } from './world.ts';

/** Authorial recipe, stable identifier; no imported recipe dataset. */
export const BARREL_RECIPE = {
  id: 'fruit-barrel-v1',
  name: 'Barril de frutas',
  description: 'Separe três maçãs para preparar um barril para decorar sua vila.',
  ingredients: [{ item: 0x2800, name: 'Maçã', quantity: 3 }],
  output: { item: WORLD_FURNITURE_ITEM, name: 'Barril', quantity: 1 },
} as const;
export type CraftingOperation = { kind: 'learn_recipe' | 'craft_recipe'; recipeId: typeof BARREL_RECIPE.id };

import catalog from './crafting-recipes.json';
import type { MaterialKey } from './material-definitions.ts';
export type RecipeId = string;
export type RecipeIngredient = { material: MaterialKey; quantity: number };
/** Each sheet has one shop. `stage` opens it: in the Miles shop the resident's stage, in Nook's shop the town shop's
 * size (1 Nook's Cranny, 2 Nook 'n' Go, 3 Nookway and up). `price` is in Bells, the Nook price and the sell base. */
export type CraftingRecipe = { id: RecipeId; name: string; sheet: number; sheetName: string; price: number; stage: 1 | 2 | 3; shop: 'miles' | 'nook';
  ingredients: RecipeIngredient[]; output: { item: number; name: string; quantity: 1 }; source: string };
/** NH ingredient facts, mapped explicitly to GC furniture of the same name. Sheet prices are authored for this game. */
export const CRAFTING_RECIPES = catalog as readonly CraftingRecipe[];
export const craftingRecipe = (id: unknown): CraftingRecipe | undefined => CRAFTING_RECIPES.find(recipe => recipe.id === id);
export const MILES_SHEETS = CRAFTING_RECIPES.filter(recipe => recipe.shop === 'miles');

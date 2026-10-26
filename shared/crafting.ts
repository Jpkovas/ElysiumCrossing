import catalog from './crafting-recipes.json';
import type { MaterialKey } from './material-definitions.ts';
export type RecipeId = string;
export type RecipeIngredient = { material: MaterialKey; quantity: number };
export type CraftingRecipe = { id: RecipeId; name: string; sheet: number; sheetName: string; price: number;
  ingredients: RecipeIngredient[]; output: { item: number; name: string; quantity: 1 }; source: string };
/** NH ingredient facts, mapped explicitly to GC furniture of the same name. Sheet prices are authored for this game. */
export const CRAFTING_RECIPES = catalog as readonly CraftingRecipe[];
export const craftingRecipe = (id: unknown): CraftingRecipe | undefined => CRAFTING_RECIPES.find(recipe => recipe.id === id);

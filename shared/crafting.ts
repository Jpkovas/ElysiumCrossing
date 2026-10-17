import catalog from './crafting-recipes.json';
import { consumeMaterial } from './material-units.ts';
import type { WorldInventory } from './world.ts';
export type RecipeId = 'nh:barrel' | 'nh:garden-bench' | 'nh:wooden-low-table';
export type CraftingRecipe = { id: RecipeId; name: string; sheet: number; sheetName: string; price: number; wood: number; iron: number;
  output: { item: number; name: string; quantity: 1 }; source: string };
/** NH ingredient facts, mapped explicitly to existing GC furniture. Sheet prices are authored for this game. */
export const CRAFTING_RECIPES = catalog as readonly CraftingRecipe[];
export const BARREL_RECIPE = CRAFTING_RECIPES[0]!;
export const craftingRecipe = (id: unknown): CraftingRecipe | undefined => CRAFTING_RECIPES.find(recipe => recipe.id === id);
export const recipeSheet = (item: unknown): CraftingRecipe | undefined => CRAFTING_RECIPES.find(recipe => recipe.sheet === item);
export type CraftingOperation = {kind:'learn_recipe';recipeId:RecipeId;pocketSlot:number} | {kind:'craft_recipe';recipeId:RecipeId};
/** Copies only. The caller publishes materials, furniture, revisions and receipt atomically. */
export function prepareRecipeInventory(inventory: WorldInventory, recipe: CraftingRecipe): WorldInventory | null {
  let next: WorldInventory = inventory;
  for (const [base, amount] of [[0x2540, recipe.wood], [0x2560, recipe.iron]] as const) {
    if (!amount) continue;
    const consumed = consumeMaterial(next, base, amount);
    if (!consumed) return null;
    next = consumed;
  }
  const slot = next.pockets.findIndex((item, index) => item === 0 && ((next.conditions >>> (index * 2)) & 3) === 0);
  if (slot < 0) return null;
  const pockets = [...next.pockets]; pockets[slot] = recipe.output.item;
  return {...next, pockets};
}

import catalog from './crafting-recipes.json';
import type { MaterialKey } from './material-definitions.ts';
import { consumeMaterial, materialBase } from './material-units.ts';
import type { WorldInventory } from './world.ts';
export type RecipeId = string;
export type RecipeIngredient = { material: MaterialKey; quantity: number };
export type CraftingRecipe = { id: RecipeId; name: string; sheet: number; sheetName: string; price: number;
  ingredients: RecipeIngredient[]; output: { item: number; name: string; quantity: 1 }; source: string };
/** NH ingredient facts, mapped explicitly to GC furniture of the same name. Sheet prices are authored for this game. */
export const CRAFTING_RECIPES = catalog as readonly CraftingRecipe[];
export const craftingRecipe = (id: unknown): CraftingRecipe | undefined => CRAFTING_RECIPES.find(recipe => recipe.id === id);
export const recipeSheet = (item: unknown): CraftingRecipe | undefined => CRAFTING_RECIPES.find(recipe => recipe.sheet === item);
export type CraftingOperation = {kind:'learn_recipe';recipeId:RecipeId;pocketSlot:number} | {kind:'craft_recipe';recipeId:RecipeId} | {kind:'redeem_miles';recipeId:RecipeId};
/** Copies only. The caller publishes materials, furniture, revisions and receipt atomically. */
export function prepareRecipeInventory(inventory: WorldInventory, recipe: CraftingRecipe): WorldInventory | null {
  let next: WorldInventory = inventory;
  for (const ingredient of recipe.ingredients) {
    const consumed = consumeMaterial(next, materialBase(ingredient.material), ingredient.quantity);
    if (!consumed) return null;
    next = consumed;
  }
  const slot = next.pockets.findIndex((item, index) => item === 0 && ((next.conditions >>> (index * 2)) & 3) === 0);
  if (slot < 0) return null;
  const pockets = [...next.pockets]; pockets[slot] = recipe.output.item;
  return {...next, pockets};
}

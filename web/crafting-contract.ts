import type {RecipeId} from '../shared/crafting.ts';
import type {MaterialCounts} from '../shared/contracts.ts';
export type CraftingView={learnedRecipes:readonly string[];materials:MaterialCounts;ready:boolean};
export interface CraftingPanelPort {
 input(held:boolean):void;
 state():CraftingView;
 act(recipeId:RecipeId):Promise<void>;
}

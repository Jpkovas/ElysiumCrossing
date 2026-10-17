import type {RecipeId} from '../shared/crafting.ts';
export type CraftingView={learnedRecipes:readonly string[];wood:number;iron:number;ready:boolean};
export interface CraftingPanelPort {
 input(held:boolean):void;
 state():CraftingView;
 act(recipeId:RecipeId):Promise<void>;
}

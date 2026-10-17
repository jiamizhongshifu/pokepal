/** One foreground activity and one quiet corner. Never stack independent HUD cards. */
export type HomePanel = 'companion'|'finder'|'living'|'picnic'|'facility'|'area'|'weather'|'menu';
export type HomeHint = 'farm'|'follow'|'picnic'|'care'|'observe'|'gesture'|'guide';
export function homeHint(state:{active:boolean;immersive:boolean;blocked:boolean;panel:HomePanel|null;farm:boolean;follow:boolean;picnic:boolean;care:boolean;observe:boolean;gesture:boolean}):HomeHint|null{
 if(!state.active||state.immersive||state.blocked||state.panel)return null;
 if(state.farm)return 'farm';
 if(state.follow)return 'follow';
 if(state.picnic)return 'picnic';
 if(state.care)return 'care';
 if(state.observe)return 'observe';
 if(state.gesture)return 'gesture';
 return 'guide';
}
/** Pokémon take their own turns; only the child's turn asks for a tap. */
export function automaticTogetherTurn(kind:'ball'|'rest',partners:number,turn:number){
 return kind==='rest'||partners===2||turn%2===0;
}

import {CAMP_PLAYER_DISTANCE} from './together';
import {MathUtils,Vector3} from 'three';
/** The child stands opposite the partner, at eye level. Keep the toy's lane visible. */
export function campShot(actors:{position:Vector3;height:number;width:number}[],aspect:number,fov:number){
 const portrait=aspect<1,center=new Vector3();
 for(const actor of actors)center.add(actor.position);center.divideScalar(actors.length);
 const height=Math.max(...actors.map(a=>a.height)),radius=Math.max(...actors.map(a=>a.position.distanceTo(center)+a.width/2));
 const vertical=Math.tan(MathUtils.degToRad(fov/2));
 const distance=Math.max(actors.length===1?CAMP_PLAYER_DISTANCE+.35+height*.8:3.6,height/(2*vertical*(portrait?.48:.65)),radius/(vertical*aspect*(portrait?.78:.72)));
 const angle=actors.length===1?Math.PI/2:0;
 const right=new Vector3(Math.cos(angle),0,-Math.sin(angle));
 const target=center.clone().add(new Vector3(0,height*.5,0));
 // On landscape the controls occupy the right corner; portrait reserves the bottom.
 target.addScaledVector(right,distance*vertical*aspect*(portrait?0:.04));
 target.y-=distance*vertical*(portrait?.14:.04);
 const position=target.clone().add(new Vector3(Math.sin(angle)*distance,distance*.12,Math.cos(angle)*distance));
 return {position,target};
}

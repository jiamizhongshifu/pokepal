import {Vector3,MathUtils} from 'three';
/** Fit the resident in the unobscured space above/right of the companion card. */
export function companionShot(position:Vector3,height:number,width:number,aspect:number,fov:number,angle:number){
 const portrait=aspect<1.05;
 const vertical=Math.tan(MathUtils.degToRad(fov/2));
 const distance=Math.max(1.4,height/(2*vertical*(portrait?.36:.53)),width/(2*vertical*aspect*(portrait?.7:.48)));
 const right=new Vector3(Math.cos(angle),0,-Math.sin(angle));
 const target=position.clone().add(new Vector3(0,height*.54,0));
 target.addScaledVector(right,-distance*vertical*aspect*(portrait?0:.30));
 target.y-=distance*vertical*(portrait?.34:.10);
 const camera=target.clone().add(new Vector3(Math.sin(angle)*distance,distance*.24,Math.cos(angle)*distance));
 return {position:camera,target,distance};
}

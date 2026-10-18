import {Vector3,MathUtils} from 'three';
/** Frame the partner centrally between the two corner controls, above them on portrait. */
export function companionShot(position:Vector3,height:number,width:number,aspect:number,fov:number,angle:number){
 const portrait=aspect<1.05;
 const vertical=Math.tan(MathUtils.degToRad(fov/2));
 const distance=Math.max(1.4,height/(2*vertical*(portrait?.32:.55)),width/(2*vertical*aspect*(portrait?.7:.48)));
 const target=position.clone().add(new Vector3(0,height*.54,0));
 target.y-=distance*vertical*(portrait?.38:.08);
 const camera=target.clone().add(new Vector3(Math.sin(angle)*distance,distance*.18,Math.cos(angle)*distance));
 return {position:camera,target,distance};
}

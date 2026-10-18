import type { Vector3 } from 'three';
import type { Activity } from '../lib/routine';
export interface ResidentPose { position:Vector3; heading:number; height:number; width?:number; moving:boolean; activity:Activity;weather?:string }
export const residentPoses=new Map<number,ResidentPose>();
export const residentPosition=(id:number)=>residentPoses.get(id)?.position;

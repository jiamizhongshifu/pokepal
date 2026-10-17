/** Bounded, in-memory camera telemetry. No images, microphone data or child profile. */
export interface CameraSample {
 at:number; reason:string; view:string; elapsed:number; pointers:number;
 candidates:number; reduced:boolean; subject:number|null; lastInput:string;
}
const history:CameraSample[]=[];
let latest:CameraSample|null=null;
export function recordCamera(sample:CameraSample){
 latest=sample;
 if(!history.length||sample.at-history[history.length-1].at>=1000){history.push(sample);if(history.length>75)history.shift();}
}
export function cameraReport(){
 return {version:'camera-1',release:import.meta.env.VITE_APP_BUILD_ID,at:Date.now(),latest,history:[...history]};
}
export function cameraSummary(){
 if(!latest)return '尚未取得场景记录，请先进入家园。';
 const home=history.filter(s=>s.reason!=='页面未显示'&&s.reason!=='弹窗打开');
 const last=home[home.length-1]??latest;
 return `最近家园状态：${last.reason|| (last.subject!==null?'正在观察':`等待观察，还剩 ${Math.max(0,Math.ceil((45000-last.elapsed)/1000))} 秒`)}；场景伙伴 ${last.candidates} 只；减少动态${last.reduced?'已开启':'未开启'}。`;
}

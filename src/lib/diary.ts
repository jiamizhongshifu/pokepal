import { DIARY_PROMPTS } from '../data/diaryPrompts';
export interface DiaryPage{zh:string;en:string;hint:string;}
export interface DiaryAnswer{question:string;text?:string;audio?:Blob;audioRevision?:string;transcribedRevision?:string;skipped?:boolean;}
export interface DiaryEntry{guided?:boolean;guidedComplete?:boolean;guidedStep?:number;answers?:DiaryAnswer[];id:string;createdAt:number;transcript:string;audio?:Blob;audioRevision?:string;pages?:DiaryPage[];title?:string;companion?:number;}
/** Keep the child's words intact; English is a separately labelled companion expression, not a claimed translation. */
export function diaryPages(text:string):DiaryPage[]{
 const clean=text.trim().slice(0,2000);if(!clean)return [];
 const sentences=clean.match(/[^。！？.!?\n]+[。！？.!?\n]*|[。！？.!?\n]+/g)??[clean];
 const chunks:string[]=[];for(const sentence of sentences){if(chunks.length&&chunks[chunks.length-1].length+sentence.length<=100)chunks[chunks.length-1]+=sentence;else for(let i=0;i<sentence.length;i+=160)chunks.push(sentence.slice(i,i+160));}
 return chunks.map(zh=>{const phrase=/谢|分享|帮助/.test(zh)?['Thank you!','谢谢你！']:/生气|难过|休息|累/.test(zh)?['I need a rest.','我需要休息一下。']:/玩|轮流|球/.test(zh)?['Your turn!','轮到你啦！']:['Hello!','你好！'];return {zh,en:phrase[0],hint:phrase[1]};});
}
export async function toDiaryWav(blob:Blob):Promise<Blob>{
 const Audio=window.AudioContext||(window as any).webkitAudioContext;if(!Audio)throw new Error('这个设备暂时不能转换录音，可以请大人帮忙写下来。');
 const context=new Audio();let buffer:AudioBuffer;try{buffer=await context.decodeAudioData(await blob.arrayBuffer());}finally{await context.close();}
 if(buffer.duration>61)throw new Error('录音超过一分钟，请缩短后再试。');
 const rate=16000,length=Math.ceil(buffer.duration*rate),bytes=new ArrayBuffer(44+length*2),v=new DataView(bytes);
 const str=(offset:number,s:string)=>[...s].forEach((c,i)=>v.setUint8(offset+i,c.charCodeAt(0)));
 str(0,'RIFF');v.setUint32(4,36+length*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,length*2,true);
 const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 for(let i=0;i<length;i++){const source=Math.min(buffer.length-1,Math.floor(i*buffer.sampleRate/rate));const sample=channels.reduce((sum,c)=>sum+c[source],0)/channels.length;v.setInt16(44+i*2,Math.max(-1,Math.min(1,sample))*32767,true);}
 return new Blob([bytes],{type:'audio/wav'});
}

/** Only the child's answers go into the book, never the questions or invented transitions. */
export function diaryAnswerText(answers:DiaryAnswer[]):string{
 return DIARY_PROMPTS.map(p=>answers.find(a=>a.question===p.id)).filter(a=>a&&!a.skipped).map(a=>a!.text?.trim()??'').filter(Boolean).join('\n').slice(0,2000);
}
export function pendingDiaryAnswers(answers:DiaryAnswer[]):DiaryAnswer[]{
 return answers.filter(a=>!a.skipped&&a.audio&&a.audioRevision!==a.transcribedRevision);
}

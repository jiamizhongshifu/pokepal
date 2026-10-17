/** Keep synchronous gameplay in one writer window; IndexedDB revisions also guard older runtimes. */
let held=false;
let acquiring:Promise<boolean>|undefined;
export async function acquireSaveSession():Promise<boolean>{
 if(held)return true;
 if(acquiring)return acquiring;
 if(!navigator.locks){held=true;return true;}
 acquiring=new Promise<boolean>((resolve,reject)=>{
  void navigator.locks.request('pokepal-save-writer',{ifAvailable:true},lock=>{
   if(!lock){resolve(false);return;}
   held=true;resolve(true);
   // The browser releases this lock when this window closes or reloads.
   return new Promise<void>(()=>{});
  }).catch(reject);
 });
 try{return await acquiring;}finally{acquiring=undefined;}
}

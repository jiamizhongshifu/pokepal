import {advancePlayClock,advanceCareClock} from './lib/playClock';
import {markReviewAudio,settleUnitRound} from './lib/learningProgress';
import type {EnergyGoal} from './lib/energyGoal';
import {weatherAt} from './lib/weather';
import {waterCropsWithRain} from './lib/farm';
import { type GuideId } from './data/onboarding';
import { normalizeLearningSettings,applyLearningSettings,validLearningProfile,type LearningProfile } from './lib/learningStage';
import { mergePokeballs, exchangePokeball, capturePartner } from "./lib/pokeballs";
import { ensureIslandProgress,useIslandGift,upgradeIsland,placeIslandDecoration,type UpgradeId } from './lib/islandProgress';
import { migratePersonalities, rememberTogether, type FurnitureId, type LivingMemory } from './lib/islandLiving';
import { migrateParticipation, rewardParticipation, rewardCourse, courseClaims, type Reward } from './lib/participation';
import { STORIES, storyProgressKey } from './data/stories';
import { plantCrop, waterCrop, harvestCrop, feedBerry, type BerryKind } from './lib/farm';
import { beginPicnic, servePicnic, endPicnic } from './lib/picnic';
import { advanceCare, comfortCompanion, deferCare } from "./lib/companionCare";
import { create } from "zustand";
import type { Daily, DaySummary, InteractKind, SaveData, Settings, TaskKind } from "./types";
import { todayStr } from "./lib/date";
import { readSaveSnapshot, writeSave, resetSave, loadSaveBackup, SaveConflictError } from "./lib/db";
import { validateSave } from "./lib/saveValidation";
import { acquireSaveSession } from "./lib/saveSession";
import { POKEMON } from "./data/pokemon";
import { setSpeechRate } from "./lib/speech";
import { isAvatarPhoto } from "./lib/avatar";
import { migrateLearning,ensureLearning,toggleSavedLearning,encounter,attempt,applyStation,noteLearningStory,restAfterListening } from './lib/learningProgress';
import { learningEntry,unitUnlocked,unitById,unitRoundCount } from './data/curriculum';

export const DAILY_ENERGY_CAP = 15;
export const BOARD_BONUS = 1;
export const TASK_ENERGY: Record<TaskKind, number> = { listen: 2, wordpic: 2, repeat: 2, trace: 2 };
export const TASK_INFO: Record<TaskKind, { zh: string; en: string; icon: string; color: string }> = {
  listen: { zh: "听一听", en: "Listen", icon: "ear", color: "#4fc3f7" },
  repeat: { zh: "说一说", en: "Speak", icon: "speak", color: "#ff8a65" },
  wordpic: { zh: "认一认", en: "Look", icon: "picture", color: "#aed581" },
  trace: { zh: "写一写", en: "Write", icon: "pencil", color: "#ba68c8" }
};

export interface DexBrowseState { onlyOwned:boolean; query:string; page:number; generation:number; scrollTop:number; filtersOpen:boolean; focusId:number }

export type Screen =
  | { name: "welcome" }
  | { name: "home"; station?:string; companion?:number }
  | { name: "journey" }
  | { name: "lesson"; returnGoal?:EnergyGoal; id:string }
  | { name: "notebook"; mode?:'all'|'saved'|'retry'; returnTo?:'energy'|'tasks'|'parent' }
  | { name: "review"; keys:string[]; returnTo?:'energy'|'tasks'|'parent' }
  | { name: "tasks" }
  | { name: "practice" }
  | { name: "energy"; goal?:EnergyGoal }
  | { name: "diary"; id?:string }
  | { name: "stories"; returnGoal?:EnergyGoal }
  | { name: "story"; returnGoal?:EnergyGoal; id:string }
  | { name: "task"; returnGoal?:EnergyGoal; kind: TaskKind; boardIndex: number | null; practice?:boolean; session?:number }
  | { name: "shop" }
  | { name: "catch" }
  | { name: "dex"; picking?: boolean; browse?:DexBrowseState }
  | { name: "dexDetail"; id: number; picking?: boolean; browse?:DexBrowseState }
  | { name: "parent" };

const DEFAULT_SETTINGS: Settings = { dailyMinutes: 15, tasksPerDay: 4, level: 1, favorites: [25], speechRate: 1 };

function makeBoard(_n:3|4,_date:string):TaskKind[]{return ['listen','wordpic','repeat','trace'];}

function newDaily(date: string, settings: Settings): Daily {
  const board = makeBoard(settings.tasksPerDay, date);
  return {
    date,
    energyEarned: 0,
    board,
    boardDone: board.map(() => false),
    bonusGiven: false,
    tasksCompleted: 0,
    heard: 0,
    spoken: 0,
    words: [],
    caught: [],
    playSeconds: 0,
    extraSeconds: 0
  };
}

function newSave(): SaveData {
  return {
    version: 1,
    trainer: null,
    energy: 0,
    balls: { poke: 0, great: 0, ultra: 0, master: 0 },
    captures: [],
    daily: newDaily(todayStr(), DEFAULT_SETTINGS),
    streak: { lastDate: "", count: 0 },
    wordStats: {},
    settings: normalizeLearningSettings({ ...DEFAULT_SETTINGS }),
    history: []
  };
}

function summarize(d: Daily): DaySummary {
  return {
    date: d.date,
    energyEarned: d.energyEarned,
    tasksCompleted: d.tasksCompleted,
    heard: d.heard,
    spoken: d.spoken,
    words: d.words.filter((w) => !w.startsWith("letter:")).length,
    caught: d.caught.length,
    playMinutes: Math.round(d.playSeconds / 60)
  };
}

function rollover(s: SaveData) {
  const today = todayStr();
  if (s.daily.date === today) return;
  s.history = [...s.history.filter((h) => h.date !== s.daily.date), summarize(s.daily)].slice(-30);
  s.daily = newDaily(today, s.settings);
}

export type TaskReward = Reward;

interface State {
  useIslandGift:()=>boolean;
  upgradeIsland:(id:UpgradeId,expectedLevel:number)=>boolean;
  finishReview: () => Reward;
  markReviewAudio: (key:string,pending:boolean)=>void;
  noteStoryRead: (id:string,page:number) => void;
  startUnit: (id:string,returnGoal?:EnergyGoal)=>void;
  advanceUnit: (id:string,round:number,skipped?:boolean)=>Promise<Reward|undefined>;
  noteAttempt: (word:string,correct:boolean,assisted:boolean,source:string)=>void;
  restLearningWord: (word:string)=>void;
  saveLearningWord: (word:string)=>void;
  noteStationLearning: (station:string,key?:string,action?:boolean)=>void;
  loaded: boolean;
  saveIssue: null | "load" | "busy" | "write" | "conflict";
  saveBusy: boolean;
  hasSaveBackup: boolean;
  retrySave: () => Promise<void>;
  restoreSaveBackup: () => Promise<void>;
  save: SaveData;
  screen: Screen;
  energyGoal?: EnergyGoal;
  load: () => Promise<void>;
  go: (s: Screen) => void;
  createTrainer: (avatar: string) => void;
  completeTask: (kind: TaskKind, boardIndex: number | null) => Promise<TaskReward | undefined>;
  noteStoryPage: (id:string,page:number) => void;
  buyBall: () => Promise<boolean>;
  catchPokemon: (id: number) => Promise<boolean>;
  setCatchWish: (id: number | null) => void;
  /** 满友好度进化：from 进化成 to，友好度保留到 3 颗心，图鉴记下新形态 */
  evolve: (from: number, to: number) => void;
  /** 选择保持现在的样子（不再提醒，之后仍可进化） */
  stayAsIs: (id: number) => void;
  interact: (id: number, kind: InteractKind) => void;
  noteHeard: (count?: number) => void;
  plantCrop: (index:number,berry:BerryKind)=>boolean;
  waterCrop: (index:number,plantedAt:number,pokemonId:number)=>boolean;
  rainWaterCrops: ()=>number;
  harvestCrop: (index:number)=>Promise<boolean>;
  feedBerry: (id:number,berry:BerryKind)=>boolean;
  setFurniture:(id:FurnitureId,enabled:boolean)=>boolean;
  rememberTogether:(memory:LivingMemory)=>boolean;
  beginPicnic:(id:number,berry:BerryKind)=>boolean;
  servePicnic:(id:string)=>boolean;
  endPicnic:(id:string)=>void;
  noteWord: (word: string, kind: "heard" | "spoken" | "correct") => void;
  addPlaySeconds: (sec: number) => void;
  grantExtraMinutes: (min: number) => void;
  tickCare: (seconds:number) => void;
  deferCare: (id:number) => void;
  grantMysteryGift: () => void;
  markGuideSeen: (id:GuideId)=>void;
  resetGuides: ()=>void;
  setGuideAutomatic: (automatic:boolean)=>void;
  updateSettings: (patch: Partial<Settings>) => void;
  setLearningProfile: (profile:LearningProfile) => Promise<boolean>;
  renameTrainer: (name: string) => void;
  setTrainerAvatar: (avatar: string, photo?: string) => void;
  resetAll: () => Promise<void>;
  importSave: (data: unknown) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let revision=0;
let pendingSave:SaveData|undefined;
let saving:Promise<void>|undefined;
let loading:Promise<void>|undefined;
async function flushSave():Promise<void>{
  clearTimeout(saveTimer);
  if(saving){await saving;if(pendingSave)await flushSave();return;}
  saving=(async()=>{
    while(pendingSave){
      const snapshot=pendingSave;pendingSave=undefined;
      try{revision=await writeSave(snapshot,revision);}
      catch(error){pendingSave??=snapshot;useGame.setState({saveIssue:error instanceof SaveConflictError?'conflict':'write'});throw error;}
    }
  })();
  try{await saving;}finally{saving=undefined;}
}
export function flushPendingSave(){return flushSave();}
function scheduleSave(s:SaveData){
  pendingSave=s;clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{void flushSave().catch(()=>{});},400);
}

export const useGame = create<State>((set, get) => {
  /** 所有存档修改都走这里：先换日，再修改副本，再异步落盘 */
  function mut<R>(fn: (s: SaveData) => R): R {
    if(!get().loaded||get().saveIssue||get().saveBusy)return undefined as R;
    const s = structuredClone(get().save);
    rollover(s);
    mergePokeballs(s);
    const r = fn(s);
    migratePersonalities(s);ensureIslandProgress(s);
    set({ save: s });
    scheduleSave(s);
    return r;
  }

  // Final rewards are shown only after their snapshot is durable. A failed write
  // retains that snapshot for SaveRecovery; retry writes it without rerunning fn.
  async function commit<R>(fn:(s:SaveData)=>R):Promise<R|undefined> {
    if(!get().loaded||get().saveIssue||get().saveBusy)return undefined;
    const s=structuredClone(get().save);
    rollover(s);mergePokeballs(s);
    const result=fn(s);
    migratePersonalities(s);ensureIslandProgress(s);
    set({saveBusy:true});
    pendingSave=s;
    try { await flushSave();set({save:s});return result; }
    catch { set({save:s});return undefined; }
    finally { set({saveBusy:false}); }
  }

  return {
    loaded: false,
    saveIssue:null,saveBusy:false,hasSaveBackup:false,
    save: newSave(),
    screen: { name: "welcome" },

    async load() {
      if(loading)return loading;
      loading=(async()=>{
        clearTimeout(saveTimer);
        set({saveBusy:true});
        try{
          if(!await acquireSaveSession()){set({saveIssue:'busy'});return;}
          // Never read past a pending write, or replace a failed read with a blank save.
          if(saving)await saving;
          const snapshot=await readSaveSnapshot();
          const s=snapshot.save===undefined?newSave():validateSave(snapshot.save);
          s.settings=normalizeLearningSettings({...DEFAULT_SETTINGS,...s.settings});
          if(s.trainer&&!s.trainer.avatar.startsWith('avatar-'))s.trainer.avatar='avatar-red';
          if(s.trainer&&!isAvatarPhoto(s.trainer.avatarPhoto))delete s.trainer.avatarPhoto;
          migratePersonalities(s);ensureIslandProgress(s);migrateLearning(s);migrateParticipation(s);rollover(s);setSpeechRate(s.settings.speechRate);
          revision=snapshot.revision;pendingSave=undefined;
          const backup=await loadSaveBackup().catch(()=>undefined);
          set({save:s,loaded:true,saveIssue:null,hasSaveBackup:!!backup});
          // Persist migration only after a successful read, with a revision check.
          scheduleSave(s);
        }catch{set({saveIssue:'load'});}
        finally{set({saveBusy:false});}
      })();
      try{await loading;}finally{loading=undefined;}
    },
    async retrySave(){
      if(get().saveBusy)return;
      if(get().saveIssue!=='write'){await get().load();return;}
      set({saveBusy:true});
      try{await flushSave();set({saveIssue:null});}catch{/* Keep the recoverable snapshot and visible error. */}
      finally{set({saveBusy:false});}
    },
    async restoreSaveBackup(){
      const backup=await loadSaveBackup();
      if(!backup)throw new Error('没有可恢复的导入备份。');
      await get().importSave(backup);
    },

    go(screen) {
      set({ screen, ...(screen.name==='energy'&&screen.goal?{energyGoal:screen.goal}:{}) });
    },

    startUnit(id,returnGoal) { if(!unitUnlocked(get().save,id))return;mut(s=>{ensureLearning(s).activeUnit=id;});set({screen:{name:'lesson',id,returnGoal}}); },
    async advanceUnit(id,round,skipped=false) {
      const u=unitById(id);if(!u||!unitUnlocked(get().save,id))return;
      if(round!==unitRoundCount(u)){mut(s=>{settleUnitRound(s,id,round,skipped);});return;}
      return commit(s=>{
        // Capture legacy claims before progressUnit changes activeUnit / completedAt.
        s.daily.courseUnits??=courseClaims(s);
        if(!settleUnitRound(s,id,round,skipped))return;
        return rewardCourse(s,id);
      });
    },
    markReviewAudio(key,pending){mut(s=>markReviewAudio(s,key,pending));},
    finishReview(){return mut(s=>rewardParticipation(s,'review'));},
    noteStoryRead(id,page){mut(s=>{const story=STORIES.find(st=>storyProgressKey(st)===id);if(!story||!Number.isInteger(page)||page<1||page>story.pages.length)return;const pages=(s.daily.storyReadPages??={})[id]??=[];if(!pages.includes(page))pages.push(page);if(pages.length===story.pages.length){rewardParticipation(s,'story');noteLearningStory(s,story.id);}});},
    restLearningWord(word) {mut(s=>restAfterListening(s,word));},
    noteAttempt(word,correct,assisted,source) {mut(s=>attempt(s,word,correct,assisted,source));},
    saveLearningWord(word) {const entry=learningEntry(word);if(!entry)return;word=entry.key;mut(s=>{toggleSavedLearning(s,word);});},
    noteStationLearning(station,key,action=false) {mut(s=>{
      const entry=key?learningEntry(key):undefined;
      applyStation(s,station,Date.now(),entry?.key,action);
      // One heard sequence, one exposure record. Action and recognition stay separate.
      if(entry){
        (s.wordStats[entry.key]??={heard:0,spoken:0,correct:0}).heard++;
        if(!s.daily.words.includes(entry.key))s.daily.words.push(entry.key);
        if(action)rewardParticipation(s,'island');
      }
    });},

    plantCrop(index,berry) {return mut(s=>plantCrop(s,index,berry))??false;},
    waterCrop(index,plantedAt,id) {return mut(s=>waterCrop(s,index,plantedAt,id))??false;},
    async harvestCrop(index) {return await commit(s=>harvestCrop(s,index))??false;},
    feedBerry(id,berry) {return mut(s=>feedBerry(s,id,berry))??false;},
    useIslandGift(){return !!mut(s=>useIslandGift(s));},
    upgradeIsland(id,level){return mut(s=>upgradeIsland(s,id,level))??false;},
    setFurniture(id,enabled){return mut(s=>placeIslandDecoration(s,id,enabled))??false;},
    rememberTogether(memory){return mut(s=>rememberTogether(s,memory))??false;},
    beginPicnic(id,berry) {return mut(s=>beginPicnic(s,id,berry,crypto.randomUUID()))??false;},
    servePicnic(id) {return mut(s=>servePicnic(s,id))??false;},
    endPicnic(id) {mut(s=>endPicnic(s,id));},

    createTrainer(avatar) {
      mut((s) => {
        s.trainer = { name: "小训练师", avatar, createdAt: Date.now() };
        s.balls.poke += 1; // 见面礼：一个精灵球，第一天就能抓到第一只
      });
    },

    completeTask(kind, boardIndex) {
      return commit((s) => {
        const d=s.daily;
        if(boardIndex!==null&&Number.isInteger(boardIndex)&&boardIndex>=0&&d.board[boardIndex]===kind)d.boardDone[boardIndex]=true;
        d.tasksCompleted++;
        return rewardParticipation(s,kind);
      });
    },

    noteStoryPage(id,page) {
      mut(s=>{ s.storyProgress ??= {}; s.storyProgress[id]=Math.max(s.storyProgress[id]??0,page); });
    },

    async buyBall() { return !!await commit(exchangePokeball); },

    setCatchWish(id) {
      mut((s) => {
        if (id === null) { delete s.catchWish; return; }
        const p = POKEMON.find((p) => p.id === id);
        if (p && !s.captures.some((c) => c.id === id)) s.catchWish = id;
      });
    },

    async catchPokemon(id) { return !!await commit(s=>capturePartner(s,id)); },

    evolve(from, to) {
      mut((s) => {
        const c = s.captures.find((x) => x.id === from);
        if (!c || s.captures.some((x) => x.id === to)) return;
        if(s.picnic?.session?.pokemonId===from)delete s.picnic.session;
        s.dex = [...new Set([...(s.dex ?? s.captures.map((x) => x.id)), from, to])];
        c.id = to;
        c.friendship = 60;
        c.stay = false;
      });
    },

    stayAsIs(id) {
      mut((s) => {
        const c = s.captures.find((x) => x.id === id);
        if (c) c.stay = true;
      });
    },

    tickCare(seconds) {
      if(!get().loaded||get().saveIssue||get().saveBusy)return;
      if(get().save.daily.date!==todayStr()){mut(s=>s.captures.forEach(c=>advanceCare(c,seconds)));return;}
      const save=advanceCareClock(get().save,seconds);set({save});scheduleSave(save);
    },
    deferCare(id) { mut(s=>{const c=s.captures.find(c=>c.id===id);if(c)deferCare(c);}); },

    interact(id, kind) {
      mut((s) => {
        const c = s.captures.find((x) => x.id === id);
        if (!c) return;
        comfortCompanion(c,kind);
        const gain = kind === "feed" ? 4 : kind === "pet" ? 2 : 3;
        c.friendship = Math.min(100, c.friendship + gain);
      });
    },

    noteHeard(count = 1) {
      mut((s) => {
        s.daily.heard += count;
      });
    },

    noteWord(word, kind) {
      word=learningEntry(word)?.key??word;
      mut((s) => {
        if(kind!=='correct')encounter(s,word,get().screen.name,Date.now(),kind==='spoken');
        const w = (s.wordStats[word] ??= { heard: 0, spoken: 0, correct: 0 });
        w[kind] += 1;
        if (!s.daily.words.includes(word)) s.daily.words.push(word);
        if (kind === "spoken") s.daily.spoken += 1;
      });
    },

    addPlaySeconds(sec) {
      if(!get().loaded||get().saveIssue||get().saveBusy)return;
      if(get().save.daily.date!==todayStr()){mut(s=>{s.daily.playSeconds+=Math.max(0,Math.min(sec,playLimitSeconds(s)-s.daily.playSeconds));});return;}
      const save=advancePlayClock(get().save,sec,playLimitSeconds(get().save));
      if(save===get().save)return;set({save});scheduleSave(save);
    },

    grantExtraMinutes(min) {
      mut((s) => {
        // Older releases counted time spent on the rest screen. A fresh grant
        // must still give the full requested time, even for those existing saves.
        const overrun=Math.max(0,s.daily.playSeconds-playLimitSeconds(s));
        s.daily.extraSeconds += overrun + Math.max(0,min) * 60;
      });
    },

    grantMysteryGift() {
      mut((s) => {
        s.balls.poke += 1;
      });
    },

    async setLearningProfile(profile) {
      if(!validLearningProfile(profile)||!get().loaded||get().saveBusy||get().saveIssue)return false;
      mut(s=>{s.settings=applyLearningSettings(s.settings,{learningProfile:profile});});
      try{await flushSave();return true;}catch{return false;}
    },

    rainWaterCrops(){const s=get().save,now=Date.now();if(weatherAt(now,s.settings.islandWeather??'auto').rain<.65||!s.farm?.plots.some(c=>c&&c.wateredAt===undefined&&now-c.plantedAt>=12000))return 0;return mut(s=>waterCropsWithRain(s,now));},
    markGuideSeen(id) {if(get().save.onboarding?.seen[id])return;mut(s=>{s.onboarding??={version:1,seen:{},automatic:true};s.onboarding.seen[id]=true;});},
    resetGuides() {mut(s=>{s.onboarding={version:1,seen:{},automatic:true};});},
    setGuideAutomatic(automatic) {mut(s=>{s.onboarding??={version:1,seen:{},automatic:true};s.onboarding.automatic=automatic;});},
    updateSettings(patch) {
      mut((s) => {
        const prevTasks = s.settings.tasksPerDay;
        s.settings = applyLearningSettings(s.settings,patch);
        if (patch.speechRate) setSpeechRate(patch.speechRate);
        // 任务数变化时，若今天还没开始做任务就重排任务板
        if (patch.tasksPerDay && patch.tasksPerDay !== prevTasks && !s.daily.boardDone.some(Boolean)) {
          s.daily.board = makeBoard(patch.tasksPerDay, s.daily.date);
          s.daily.boardDone = s.daily.board.map(() => false);
        }
      });
    },

    renameTrainer(name) {
      mut((s) => {
        if (s.trainer) s.trainer.name = name.trim() || "小训练师";
      });
    },

    setTrainerAvatar(avatar, photo) {
      mut((s) => {
        if (!s.trainer) return;
        s.trainer.avatar = ["avatar-red", "avatar-pink", "avatar-blue", "avatar-yellow"].includes(avatar) ? avatar : "avatar-red";
        if (isAvatarPhoto(photo)) s.trainer.avatarPhoto = photo;
        else delete s.trainer.avatarPhoto;
      });
    },

    async resetAll() {
      if(get().saveBusy||get().saveIssue)return;
      set({saveBusy:true});
      try{
        await flushSave();const s=newSave();
        revision=await resetSave(s,revision);
        set({save:s,screen:{name:'welcome'},hasSaveBackup:false});
      }catch(error){set({saveIssue:error instanceof SaveConflictError?'conflict':'write'});}
      finally{set({saveBusy:false});}
    },

    async importSave(data) {
      // Validate the complete candidate before touching either live state or the disk.
      const s=validateSave(data);
      if(get().saveBusy||get().saveIssue||!get().loaded)throw new Error('请先完成存档重试，再导入。');
      s.settings=normalizeLearningSettings({...DEFAULT_SETTINGS,...s.settings});
      if(s.trainer&&!isAvatarPhoto(s.trainer.avatarPhoto))delete s.trainer.avatarPhoto;
      migratePersonalities(s);ensureIslandProgress(s);migrateLearning(s);migrateParticipation(s);rollover(s);
      set({saveBusy:true});
      try{
        await flushSave();
        revision=await writeSave(s,revision,true);
        setSpeechRate(s.settings.speechRate);
        set({save:s,screen:{name:s.trainer?'home':'welcome'},hasSaveBackup:true});
      }catch(error){
        if(error instanceof SaveConflictError)set({saveIssue:'conflict'});
        throw error;
      }finally{set({saveBusy:false});}
    }

  };
});

export const playLimitSeconds = (s: SaveData) => s.settings.dailyMinutes * 60 + s.daily.extraSeconds;

/** 图鉴里“已拥有”的宝可梦：现在的伙伴 + 进化前的形态 */
export const dexOwned = (s: SaveData) => new Set([...(s.dex ?? []), ...s.captures.map((c) => c.id)]);

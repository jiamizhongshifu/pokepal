import { withTransition } from './lib/viewTransition';
import { AVATARS, DEFAULT_AVATAR } from './icons/avatars';
import { SavePersistence } from './lib/savePersistence';
import { newSave, prepareForPlay, rollover } from './lib/saveLifecycle';
import { TASK_KINDS, type TaskKind } from './data/tasks';
import { createNavigation, type Screen } from './lib/navigation';
import { playById, finishPlay, wishFor, notePlayedTogether } from './island/plays';
import { finishErrand } from './island/errands';
import { finishParty } from './island/parties';
import { noteIslandDone } from './island/scenes';
import { getCreature as creatureOf } from './data/creatures';
import {trackInteraction,trackLearningCompletion} from './lib/interaction';
import { advancePlayClock, grantPlayMinutes } from './lib/playClock';
import {markReviewAudio,settleUnitRound, recordOpportunity, markHomeTried, type Opportunity } from './lib/learningProgress';
import {weatherAt} from './lib/weather';
import {waterCropsWithRain} from './lib/farm';
import { newOnboarding, completeGuide, type GuideId } from './data/onboarding';
import { applyLearningSettings,validLearningProfile,type LearningProfile } from './lib/learningStage';
import { invitePartner } from "./lib/invites";
import { markPathSeen, claimChapterFriend, notePathReview, openChapterDiary } from "./lib/learningPath";
import { rewardParticipation, rewardCourse, courseClaims, type Reward } from './lib/participation';
import { STORIES, storyProgressKey } from './data/stories';
import { plantCrop, waterCrop, harvestCrop, feedCrop, type CropKind } from './lib/farm';
import { create } from "zustand";
import type { SaveData, Settings } from "./types";
import { todayStr } from "./lib/date";
import { loadSaveBackup, SaveConflictError } from "./lib/db";
import {clearParentNotice} from './lib/parentNotice';
import { validateSave } from "./lib/saveValidation";
import { acquireSaveSession } from "./lib/saveSession";
import { CREATURES } from "./data/creatures";
import { setSpeechRate } from "./lib/speech";
import { isAvatarPhoto } from "./lib/avatar";
import { ensureLearning,toggleSavedLearning,encounter,attempt,applyStation,noteLearningStory,restAfterListening } from './lib/learningProgress';
import { learningEntry,unitUnlocked,unitById,unitRoundCount } from './data/curriculum';

interface State {
  /** Light up newly finished path stops once; island stops grant the next island upgrade. Returns the keys celebrated. */
  celebratePath:(keys:string[])=>string[];
  /** Friend stop: one invite berry for meeting this chapter's new friend. */
  claimChapterFriend:(chapter:number)=>Promise<boolean>;
  /** Diary stop: opening the chapter's diary completes it; telling anything is optional. */
  openChapterDiary:(chapter:number)=>void;
  finishReview: () => Reward | undefined;
  markReviewAudio: (key:string,pending:boolean)=>void;
  noteStoryRead: (id:string,page:number) => void;
  startUnit: (id:string)=>void;
  advanceUnit: (id:string,round:number,skipped?:boolean)=>Promise<Reward|undefined>;
  noteAttempt: (word:string,correct:boolean,assisted:boolean,source:string)=>void;
  /** One answer opportunity, classified by the help seen before it was finished (local only). */
  noteOpportunity: (o:Omit<Opportunity,'v'|'at'>)=>void;
  /** Three rounds of an island activity finished with a companion. */
  finishIslandPlay: (playId:string,partner:number)=>boolean;
  /** A lesson's island errand got done with a companion: its island stop is complete and its trace stays for a while. */
  finishErrand: (unitId:string,partner?:number)=>boolean;
  /** A chapter's island party was held. */
  finishParty: (chapter:number)=>boolean;
  /** Put an earned island sticker away or bring it back. */
  markHomeTried: (id:string,tried:boolean)=>void;
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
  load: () => Promise<void>;
  go: (s: Screen) => void;
  /** Back to the page the child came from (the shelf a story was opened on, the island the grown-up left); the learning path when there is none. */
  back: () => void;
  createTrainer: (avatar: string) => Promise<boolean>;
  /** `partner`: the companion practising alongside; a finished set counts as time played together. */
  completeTask: (kind: TaskKind, boardIndex: number | null, partner?: number) => Promise<Reward | undefined>;
  noteStoryPage: (id:string,page:number) => void;
  inviteFriend: (id: number) => Promise<boolean>;
  setCatchWish: (id: number | null) => void;
  /** 满友好度长大：from 长大成 to，友好度保留到 3 颗心，好朋友相册记下新形态 */
  evolve: (from: number, to: number) => void;
  /** 选择保持现在的样子（不再提醒，之后仍可长大） */
  stayAsIs: (id: number) => void;
  noteHeard: (count?: number) => void;
  plantCrop: (index:number,berry:CropKind)=>boolean;
  waterCrop: (index:number,plantedAt:number,pokemonId:number)=>boolean;
  rainWaterCrops: ()=>number;
  harvestCrop: (index:number)=>Promise<boolean>;
  feedCrop: (id:number,berry:CropKind)=>boolean;
  noteWord: (word: string, kind: "heard" | "spoken" | "correct") => void;
  addPlaySeconds: (sec: number) => void;
  grantExtraMinutes: (min: number) => void;
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

const persistence = new SavePersistence(error => {
  useGame.setState({ saveIssue: error instanceof SaveConflictError ? 'conflict' : 'write' });
});
export function flushPendingSave() { return persistence.flush(); }

export const useGame = create<State>((set, get) => {
  const navigation = createNavigation(() => get().screen, screen => set({screen}), withTransition);
  let loading: Promise<void> | undefined;
  function editableSave() {
    const state = get();
    if (!state.loaded || state.saveIssue || state.saveBusy) return;
    const save = structuredClone(state.save);
    rollover(save);
    return save;
  }

  function mut<R>(fn: (s: SaveData) => R): R | undefined {
    const save = editableSave();
    if (!save) return;
    const result = fn(save);
    set({ save });
    persistence.schedule(save);
    return result;
  }

  // Final rewards are shown only after their snapshot is durable. A failed write
  // retains that snapshot for SaveRecovery; retry writes it without rerunning fn.
  async function commit<R>(fn:(s:SaveData)=>R):Promise<R|undefined> {
    const s = editableSave();
    if (!s) return;
    const result = fn(s);
    set({ saveBusy: true });
    try { await persistence.flush(s); set({save:s}); return result; }
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
      if(get().saveBusy)return;
      loading=(async()=>{
        set({saveBusy:true});
        try{
          if(!await acquireSaveSession()){set({saveIssue:'busy'});return;}
          const s = await persistence.readForPlay(get().saveIssue === 'conflict' || get().saveIssue === 'load');
          setSpeechRate(s.settings.speechRate);
          const backup=await loadSaveBackup().catch(()=>undefined);
          set({save:s,loaded:true,saveIssue:null,hasSaveBackup:!!backup});
          // Persist migration only after a successful read, with a revision check.
          persistence.schedule(s);
        }catch{
          // A flush can fail before the read starts. Keep its retry action and pending snapshot.
          const issue = get().saveIssue;
          if (issue !== 'write' && issue !== 'conflict') set({saveIssue:'load'});
        }
        finally{set({saveBusy:false});}
      })();
      try{await loading;}finally{loading=undefined;}
    },
    async retrySave(){
      if(get().saveBusy)return;
      if(get().saveIssue!=='write'){await get().load();return;}
      set({saveBusy:true});
      try{await persistence.flush();set({saveIssue:null});}catch{/* Keep the recoverable snapshot and visible error. */}
      finally{set({saveBusy:false});}
    },
    async restoreSaveBackup(){
      const backup=await loadSaveBackup();
      if(!backup)throw new Error('没有可恢复的导入备份。');
      await get().importSave(backup);
    },

    go: navigation.go,
    back: navigation.back,

    startUnit(id) { if(!unitUnlocked(get().save,id))return;mut(s=>{ensureLearning(s).activeUnit=id;});navigation.show({name:'lesson',id}); },
    async advanceUnit(id,round,skipped=false) {
      const u=unitById(id);if(!u||!unitUnlocked(get().save,id))return;
      if(round!==unitRoundCount(u)){mut(s=>{settleUnitRound(s,id,round,skipped);});return;}
      const result=await commit(s=>{
        // Capture legacy claims before progressUnit changes activeUnit / completedAt.
        s.daily.courseUnits??=courseClaims(s);
        if(!settleUnitRound(s,id,round,skipped))return;
        completeGuide(s,'lesson');
        return rewardCourse(s,id);
      });
      trackLearningCompletion('lesson_completed',result);return result;
    },
    markReviewAudio(key,pending){mut(s=>markReviewAudio(s,key,pending));},
    finishReview(){const reward=mut(s=>{notePathReview(s);return rewardParticipation(s,'review');});if(reward)void persistence.flush().then(()=>{trackLearningCompletion('review_completed',reward);}).catch(()=>{});return reward;},
    noteStoryRead(id,page){
      const reward=mut(s=>{
        const story=STORIES.find(st=>storyProgressKey(st)===id);
        if(!story||!Number.isInteger(page)||page<1||page>story.pages.length)return;
        const pages=(s.daily.storyReadPages??={})[id]??=[];
        const wasComplete=pages.length===story.pages.length;
        if(!pages.includes(page))pages.push(page);
        if(wasComplete||pages.length!==story.pages.length)return;
        noteLearningStory(s,story.id);return rewardParticipation(s,'story');
      });
      if(reward)void persistence.flush().then(()=>{trackLearningCompletion('story_completed',reward);}).catch(()=>{});
    },
    restLearningWord(word) {mut(s=>restAfterListening(s,word));},
    noteAttempt(word,correct,assisted,source) {mut(s=>attempt(s,word,correct,assisted,source));},
    noteOpportunity(o) {mut(s=>recordOpportunity(s,{...o,at:Date.now()}));},
    finishIslandPlay(playId,partner) {const play=playById(playId,get().save);if(!play)return false;return !!mut(s=>{const ok=finishPlay(s,play,partner,s.daily.date,wishFor(s,creatureOf(partner).species));if(ok)noteIslandDone(s);return ok;});},
    finishErrand(unitId,partner) {return !!mut(s=>{const ok=finishErrand(s,unitId,partner);if(ok)noteIslandDone(s);return ok;});},
    finishParty(chapter) {return !!mut(s=>{const ok=finishParty(s,chapter);if(ok)noteIslandDone(s);return ok;});},
    markHomeTried(id,tried) {mut(s=>markHomeTried(s,id,tried));},
    saveLearningWord(word) {const entry=learningEntry(word);if(!entry)return;word=entry.key;mut(s=>{toggleSavedLearning(s,word);});},
    noteStationLearning(station,key,action=false) {const reward=mut(s=>{
      const entry=key?learningEntry(key):undefined;
      applyStation(s,station,Date.now(),entry?.key,action);
      // One heard sequence, one exposure record. Action and recognition stay separate.
      if(entry){
        (s.wordStats[entry.key]??={heard:0,spoken:0,correct:0}).heard++;
        if(!s.daily.words.includes(entry.key))s.daily.words.push(entry.key);
        if(action)return rewardParticipation(s,'island');
      }
    });if(reward)void persistence.flush().catch(()=>{});},

    plantCrop(index,berry) {return mut(s=>plantCrop(s,index,berry))??false;},
    waterCrop(index,plantedAt,id) {return mut(s=>waterCrop(s,index,plantedAt,id))??false;},
    async harvestCrop(index) {return await commit(s=>harvestCrop(s,index))??false;},
    feedCrop(id,berry) {return mut(s=>{return feedCrop(s,id,berry);})??false;},
    celebratePath(keys){return mut(s=>markPathSeen(s,keys)) ?? [];},
    async claimChapterFriend(chapter){return !!await commit(s=>claimChapterFriend(s,chapter));},
    openChapterDiary(chapter){mut(s=>openChapterDiary(s,chapter));},

    async createTrainer(avatar) {
      if(get().saveBusy||get().saveIssue)return false;
      if(get().save.trainer)return true;
      const created=await commit((s) => {
        s.trainer = { name: "小岛主人", avatar, createdAt: Date.now() };
        s.balls.poke += 1; // 见面礼只在成功创建时发放一次。
        return true;
      })===true;
      if(created)trackInteraction('trainer_created');return created;
    },

    async completeTask(kind, boardIndex, partner) {
      const reward=await commit((s) => {
        const d=s.daily;
        const buddy=partner===undefined?undefined:s.captures.find(c=>c.id===partner);
        if(buddy)notePlayedTogether(buddy);
        if(boardIndex!==null&&Number.isInteger(boardIndex)&&boardIndex>=0&&d.board[boardIndex]===kind)d.boardDone[boardIndex]=true;
        d.tasksCompleted++;
        return rewardParticipation(s,kind);
      });
      trackLearningCompletion('practice_completed',reward);return reward;
    },

    noteStoryPage(id,page) {
      mut(s=>{ s.storyProgress ??= {}; s.storyProgress[id]=Math.max(s.storyProgress[id]??0,page); });
    },


    setCatchWish(id) {
      mut((s) => {
        if (id === null) { delete s.catchWish; return; }
        const p = CREATURES.find((p) => p.id === id);
        if (p && !s.captures.some((c) => c.id === id)) s.catchWish = id;
      });
    },

    async inviteFriend(id) {const ok=!!await commit(s=>invitePartner(s,id));if(ok)trackInteraction('capture_succeeded');return ok;},

    evolve(from, to) {
      mut((s) => {
        const c = s.captures.find((x) => x.id === from);
        if (!c || s.captures.some((x) => x.id === to)) return;
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
      const current = get().save;
      if (current.daily.date !== todayStr()) {
        mut(s => { s.daily = advancePlayClock(s, sec).daily; });
        return;
      }
      const save = advancePlayClock(current, sec);
      if (save === current) return;
      set({ save });
      persistence.schedule(save);
    },

    grantExtraMinutes(min) { mut(s => grantPlayMinutes(s, min)); },

    grantMysteryGift() {
      mut((s) => {
        s.balls.poke += 1;
      });
    },

    async setLearningProfile(profile) {
      if(!validLearningProfile(profile)||!get().loaded||get().saveBusy||get().saveIssue)return false;
      mut(s=>{s.settings=applyLearningSettings(s.settings,{learningProfile:profile});});
      try{await persistence.flush();trackInteraction('learning_settings_saved');return true;}catch{return false;}
    },

    rainWaterCrops(){const s=get().save,now=Date.now();if(weatherAt(now,s.settings.islandWeather??'auto').rain<.65||!s.farm?.plots.some(c=>c&&c.wateredAt===undefined&&now-c.plantedAt>=12000))return 0;return mut(s=>waterCropsWithRain(s,now)) ?? 0;},
    markGuideSeen(id) {if(get().save.onboarding?.seen[id])return;mut(s=>{s.onboarding??=newOnboarding();s.onboarding.seen[id]=true;});},
    resetGuides() {mut(s=>{s.onboarding=newOnboarding();});},
    setGuideAutomatic(automatic) {mut(s=>{s.onboarding??=newOnboarding();s.onboarding.automatic=automatic;});},
    updateSettings(patch) {
      mut((s) => {
        const prevTasks = s.settings.tasksPerDay;
        s.settings = applyLearningSettings(s.settings,patch);
        if (patch.speechRate) setSpeechRate(patch.speechRate);
        // 任务数变化时，若今天还没开始做任务就重排任务板
        if (patch.tasksPerDay && patch.tasksPerDay !== prevTasks && !s.daily.boardDone.some(Boolean)) {
          s.daily.board = [...TASK_KINDS];
          s.daily.boardDone = s.daily.board.map(() => false);
        }
      });
    },

    renameTrainer(name) {
      mut((s) => {
        if (s.trainer) s.trainer.name = name.trim() || "小岛主人";
      });
    },

    setTrainerAvatar(avatar, photo) {
      mut((s) => {
        if (!s.trainer) return;
        s.trainer.avatar = AVATARS.includes(avatar) ? avatar : DEFAULT_AVATAR;
        if (isAvatarPhoto(photo)) s.trainer.avatarPhoto = photo;
        else delete s.trainer.avatarPhoto;
      });
    },

    async resetAll() {
      if(get().saveBusy||get().saveIssue)return;
      set({saveBusy:true});
      try{
        const s = newSave();
        await persistence.replace(s, 'reset');
        try{clearParentNotice(localStorage);}catch{/* Storage may be blocked. */}
        navigation.reset();set({save:s,screen:{name:'welcome'},hasSaveBackup:false});
      }catch(error){set({saveIssue:error instanceof SaveConflictError?'conflict':'write'});}
      finally{set({saveBusy:false});}
    },

    async importSave(data) {
      // Validate the complete candidate before touching either live state or the disk.
      const s=validateSave(data);
      if(get().saveBusy||get().saveIssue||!get().loaded)throw new Error('请先完成存档重试，再导入。');
      prepareForPlay(s);
      set({saveBusy:true});
      try{
        await persistence.replace(s, 'import');
        setSpeechRate(s.settings.speechRate);
        navigation.reset();set({save:s,screen:{name:s.trainer?'home':'welcome'},hasSaveBackup:true});
      }catch(error){
        if(error instanceof SaveConflictError)set({saveIssue:'conflict'});
        throw error;
      }finally{set({saveBusy:false});}
    }

  };
});

export const dexOwned = (s: SaveData) => new Set([...(s.dex ?? []), ...s.captures.map((c) => c.id)]);

import type {Adventure} from '../../lib/storyPlayer';
/** Authored pilot. Media is intentionally not marked ready until reviewed. */
export const APPLE_PICNIC = {
 id:'apple-picnic',taskId:'magic-words',version:1,
 title:'留给你的一颗苹果',cast:[25,133],mediaStatus:'pending',
 beats:[
  {id:'welcome',zh:'小岛主人，你来啦。今天一起吃苹果。',en:'Apple!'},
  {id:'mud',zh:'苹果上还有一点泥，先洗一洗。',en:''},
  {id:'help',zh:'水壶有点重。没关系，我们一起。',en:'Help, please!',invitation:{target:'watering-can',waitMs:7000}},
  {id:'wash',zh:'哗啦，水来了。',en:'Water.'},
  {id:'dry',zh:'这一颗小小的，也要擦干净。',en:'',invitation:{target:'apple',waitMs:7000}},
  {id:'for-you',zh:'这颗留给你。这里，也有你的座位。',en:''},
  {id:'thanks',zh:'朋友们坐下来，一起吃点心。',en:'Thank you!'},
  {id:'goodbye',zh:'今天的野餐真好。下次见，小岛主人。',en:''}
 ]
} as const satisfies Omit<Adventure,'beats'> & {title:string;cast:readonly number[];mediaStatus:string;beats:readonly (Adventure['beats'][number]&{zh:string;en:string})[]};

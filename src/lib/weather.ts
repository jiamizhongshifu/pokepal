/** Island weather is local and offline. It never asks for the child's location. */
export const WEATHER = {
 sunny:{name:'晴天',icon:'sun',en:"It's sunny.",voice:'阳光暖暖的，伙伴们在小岛上慢慢玩。',cloud:.04,wind:.25,rain:0},
 cloudy:{name:'多云',icon:'cloud',en:"It's cloudy.",voice:'云朵飘过来啦。光线变柔和，伙伴们也会找个舒服的地方歇歇。',cloud:.62,wind:.35,rain:0},
 breezy:{name:'微风',icon:'wind',en:"It's windy.",voice:'风吹过树叶，沙沙沙。会飞的伙伴停下来听听风。',cloud:.3,wind:1,rain:0},
 rain:{name:'小雨',icon:'water',en:"It's raining.",voice:'小雨滴答滴答，帮树果浇浇水。喜欢水的伙伴玩水，其他伙伴在树下躲雨，歇一歇。',cloud:.86,wind:.6,rain:1},
} as const;
export const CLEAR_NIGHT={name:'晴夜',icon:'moon',en:"It's a clear night.",voice:'夜空晴朗，星星在闪。海浪轻轻响，伙伴们慢慢休息。'} as const;
export type WeatherKind=keyof typeof WEATHER;
export type WeatherMode='auto'|WeatherKind;
export interface IslandWeather {kind:WeatherKind;cloud:number;wind:number;rain:number;nextAt:number;automatic:boolean;}
export const WEATHER_PERIOD=20*60*1000;
export const WEATHER_TRANSITION=30_000;
export const validWeatherMode=(value:unknown):value is WeatherMode=>value==='auto'||typeof value==='string'&&Object.prototype.hasOwnProperty.call(WEATHER,value);
function scheduled(slot:number):WeatherKind{
 // A stable 20-minute forecast: reopening pages cannot reroll it. Longest consecutive rain is 40 min.
 let h=Math.imul((slot^0x51f15e)>>>0,1664525)+1013904223;h=Math.imul(h^(h>>>16),2246822519);h^=h>>>13;
 const roll=(h>>>0)%100;
 return roll<42?'sunny':roll<67?'cloudy':roll<85?'breezy':slot%3===0?'cloudy':'rain';
}
export function weatherAt(time:Date|number=Date.now(),mode:WeatherMode='auto'):IslandWeather{
 const ms=typeof time==='number'?time:time.getTime(),slot=Math.floor(ms/WEATHER_PERIOD);
 const kind=mode==='auto'?scheduled(slot):mode,previous=mode==='auto'?scheduled(slot-1):kind;
 const t=Math.max(0,Math.min(1,(ms-slot*WEATHER_PERIOD)/WEATHER_TRANSITION)),ease=t*t*(3-2*t);
 const blend=(key:'cloud'|'wind'|'rain')=>WEATHER[previous][key]+(WEATHER[kind][key]-WEATHER[previous][key])*ease;
 return {kind,cloud:blend('cloud'),wind:blend('wind'),rain:blend('rain'),nextAt:(slot+1)*WEATHER_PERIOD,automatic:mode==='auto'};
}
export type NatureLevel='off'|'soft'|'normal';
export function soundscape(weather:IslandWeather,sky:string,level:NatureLevel,foreground=false){
 const volume=(level==='normal'?.32:level==='soft'?.17:0)*(foreground?.12:1),night=sky==='night';
 return {waves:volume*(.65+weather.wind*.35),leaves:volume*(.18+weather.wind*.75),rain:volume*weather.rain*.8,crickets:night?volume*(1-weather.rain)*.22:0,birds:!night&&weather.rain<.1&&!foreground&&volume>0,birdGap:sky==='morning'?28:sky==='evening'?65:45};
}

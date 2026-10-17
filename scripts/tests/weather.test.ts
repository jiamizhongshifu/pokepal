import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherAt,soundscape,WEATHER_PERIOD,WEATHER_TRANSITION,validWeatherMode} from '../../src/lib/weather';
import {waterCropsWithRain,newFarm,harvestCrop,GROW_MS,validFarm} from '../../src/lib/farm';
import {weatherReaction,weatherVisit} from '../../src/scene/weatherReactions';
import type {SaveData,Pokemon} from '../../src/types';
import type {Habit} from '../../src/data/behaviors';
const habit:Habit={from:0,to:24,activity:'explore',zone:'meadow'};
const pokemon=(id:number,types:string[])=>({id,types} as Pokemon);
test('offline weather survives reload, transitions continuously, and bounds consecutive rain',()=>{
 let run=0;const kinds=new Set();
 for(let slot=1000000;slot<1001000;slot++){
  const at=slot*WEATHER_PERIOD+WEATHER_TRANSITION,w=weatherAt(at);kinds.add(w.kind);
  assert.deepEqual(w,weatherAt(new Date(at)));run=w.kind==='rain'?run+1:0;assert.ok(run<=2);
  const before=weatherAt(slot*WEATHER_PERIOD-1),boundary=weatherAt(slot*WEATHER_PERIOD);
  for(const key of ['rain','wind','cloud'] as const)assert.ok(Math.abs(before[key]-boundary[key])<.001);
 }assert.equal(kinds.size,4);
});
test('fixed weather, nighttime calls and foreground ducking match the environment',()=>{
 assert.equal(validWeatherMode('__proto__'),false);assert.equal(validWeatherMode('auto'),true);
 const rain=weatherAt(123456789,'rain'),sun=weatherAt(123456789,'sunny');assert.equal(rain.rain,1);assert.equal(sun.rain,0);
 const day=soundscape(sun,'day','soft'),night=soundscape(sun,'night','soft');
 assert.equal(day.birds,true);assert.equal(night.birds,false);assert.ok(night.crickets>0);assert.equal(day.crickets,0);
 const wet=soundscape(rain,'night','soft');assert.equal(wet.crickets,0);assert.equal(wet.birds,false);assert.ok(wet.rain>0);
 const duck=soundscape(sun,'day','soft',true);assert.ok(duck.waves<day.waves*.2);assert.equal(duck.birds,false);
 assert.equal(soundscape(rain,'night','off').rain,0);
});
test('rain waters once after a short wait; never duplicates harvests or changes existing watering',()=>{
 const s={farm:newFarm()} as SaveData;s.farm!.plots=[{berry:'oran',plantedAt:1000},{berry:'pecha',plantedAt:1000,wateredAt:2000},null];
 assert.equal(waterCropsWithRain(s,12999),0);assert.equal(waterCropsWithRain(s,NaN),0);
 assert.equal(waterCropsWithRain(s,13000),1);assert.equal(waterCropsWithRain(s,14000),0);assert.equal(s.farm!.plots[1]!.wateredAt,2000);
 assert.deepEqual(s.farm!.basket,{oran:0,pecha:0,cheri:0});assert.ok(validFarm(s.farm));
 assert.equal(harvestCrop(s,0,13000+GROW_MS-1),false);assert.equal(harvestCrop(s,0,13000+GROW_MS),true);assert.equal(harvestCrop(s,0,13000+GROW_MS),false);assert.equal(s.farm!.basket.oran,2);
});
test('weather reactions distinguish water, grass, fire, flight and sleeping routines',()=>{
 assert.equal(weatherReaction(pokemon(7,['water']),habit,'rain'),'splash');assert.equal(weatherReaction(pokemon(1,['grass']),habit,'rain'),'leaves');
 assert.equal(weatherReaction(pokemon(4,['fire']),habit,'rain'),'shelter');assert.equal(weatherReaction(pokemon(16,['flying']),habit,'breezy'),'perch');
 assert.equal(weatherVisit(pokemon(4,['fire']),{...habit,activity:'sleep'},'rain')!.station.activity,'nap');
 assert.equal(weatherReaction(pokemon(4,['fire']),habit,'sunny'),null);
 assert.equal(weatherReaction(pokemon(7,['water']),{...habit,activity:'sleep'},'rain'),null);
 assert.equal(weatherVisit(pokemon(129,['water']),habit,'rain')!.station.water,true);
 assert.equal(weatherVisit(pokemon(1,['grass']),habit,'rain')!.station.activity,'guard');
 assert.notDeepEqual(weatherVisit(pokemon(4,['fire']),habit,'rain',0)!.station.target,weatherVisit(pokemon(4,['fire']),habit,'rain',1)!.station.target);
 assert.deepEqual(weatherVisit(pokemon(4,['fire']),habit,'rain'),weatherVisit(pokemon(4,['fire']),habit,'rain'));
});

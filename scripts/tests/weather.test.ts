import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherAt,soundscape,WEATHER_PERIOD,WEATHER_TRANSITION,validWeatherMode} from '../../src/lib/weather';
import {waterCropsWithRain,newFarm,harvestCrop,GROW_MS,validFarm} from '../../src/lib/farm';
import {whereNow} from '../../src/island/world';
import type {SaveData} from '../../src/types';
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
 const s={farm:newFarm()} as SaveData;s.farm!.plots=[{berry:'grapes',plantedAt:1000},{berry:'apple',plantedAt:1000,wateredAt:2000},null];
 assert.equal(waterCropsWithRain(s,12999),0);assert.equal(waterCropsWithRain(s,NaN),0);
 assert.equal(waterCropsWithRain(s,13000),1);assert.equal(waterCropsWithRain(s,14000),0);assert.equal(s.farm!.plots[1]!.wateredAt,2000);
 assert.deepEqual(s.farm!.basket,newFarm().basket);assert.ok(validFarm(s.farm));
 assert.equal(harvestCrop(s,0,13000+GROW_MS-1),false);assert.equal(harvestCrop(s,0,13000+GROW_MS),true);assert.equal(harvestCrop(s,0,13000+GROW_MS),false);assert.equal(s.farm!.basket.grapes,2);
});
test('weather and time change who is where, following each companion\'s setting',()=>{
 assert.equal(whereNow('drippy',10,'rain').id,'farm','the rain snail comes out to the garden');
 assert.equal(whereNow('mushy',10,'rain').id,'tree','the mushroom raccoon walks under the trees');
 assert.equal(whereNow('bubbo',10,'rain').id,'shells');assert.equal(whereNow('sunny',10,'rain').id,'tent','others shelter by the tent');
 assert.equal(whereNow('sunny',10,'sunny').id,'bench','the sun cub sunbathes');
 assert.equal(whereNow('sunny',22,'sunny').id,'tent','most sleep by the tent at night');
 assert.equal(whereNow('twinkle',22,'sunny').id,'music','the star fawn glows on the stage at night');
 assert.equal(whereNow('moony',12,'sunny').id,'tent');assert.equal(whereNow('moony',22,'sunny').id,'hammock','the moon sloth is awake at night');
});
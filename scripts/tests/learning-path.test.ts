import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {LEARNING_CHAPTERS,LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {progressUnit} from '../../src/lib/learningProgress';
import {learningPath,pathStars,currentNode} from '../../src/lib/learningPath';

const fresh=()=>({version:1,settings:{level:1},wordStats:{},learning:{version:1,records:{},units:{}}} as unknown as SaveData);
const finish=(s:SaveData,i:number)=>progressUnit(s,LEARNING_UNITS[i].id,unitRoundCount(LEARNING_UNITS[i]),100+i);

test('a new child starts at the first stop with every later stop locked',()=>{
 const path=learningPath(fresh());
 assert.equal(path.length,LEARNING_CHAPTERS.length);
 assert.equal(path.flatMap(c=>c.nodes).length,LEARNING_UNITS.length);
 assert.equal(currentNode(path)?.unit.id,LEARNING_UNITS[0].id);
 assert.ok(path.flatMap(c=>c.nodes).slice(1).every(n=>n.state==='locked'));
 assert.equal(pathStars(path),0);
});

test('finishing a stop lights it, earns a star and moves the current stop forward',()=>{
 const s=fresh();finish(s,0);finish(s,1);
 const nodes=learningPath(s).flatMap(c=>c.nodes);
 assert.deepEqual(nodes.slice(0,3).map(n=>n.state),['done','done','current']);
 assert.equal(pathStars(learningPath(s)),2);
 assert.equal(learningPath(s)[0].done,2);
});

test('there is exactly one current stop, and none once the whole path is done',()=>{
 const s=fresh();
 for(let i=0;i<5;i++)finish(s,i);
 assert.equal(learningPath(s).flatMap(c=>c.nodes).filter(n=>n.state==='current').length,1);
 for(let i=0;i<LEARNING_UNITS.length;i++)finish(s,i);
 assert.equal(currentNode(learningPath(s)),undefined);
 assert.equal(pathStars(learningPath(s)),LEARNING_UNITS.length);
});

test('a locked stop chosen as active never becomes current',()=>{
 const s=fresh();s.learning!.activeUnit=LEARNING_UNITS[3].id;
 assert.equal(currentNode(learningPath(s))?.unit.id,LEARNING_UNITS[0].id);
});

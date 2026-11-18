import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Runs the build-time aligner's pure functions on small, hand-measured cases.
const run=code=>{const r=spawnSync('python3',['-I','-c',`import sys,json;sys.path.insert(0,'scripts/voice');import align_timings as A\n${code}`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};

test('a phrase that drifted after a sentence break is moved back onto the recognized speech',()=>{
 // Measured audio: "Roll," starts at 2.25 s and the second "roll" at 3.20 s; the provider said 3.255 and 3.595.
 const [t]=run(`words=A.sentence_words("A yellow ball. Roll, roll!")
raw={"w":["A","yellow","ball.","Roll,","roll!"],"t":[0.335,0.535,1.135,3.255,3.595],"e":[0.535,1.135,1.795,3.595,4.015],"c":[0.89,0.82,0.84,0.75,0.76]}
heard=[["A",0.30],["yellow",0.82],["ball",1.38],["roll",2.54],["roll",3.46]]
print(json.dumps(A.correct(words,A.merge(raw,words),heard,0.175,4.4,0.4)))`);
 assert.ok(Math.abs(t[3]-2.25)<0.15,`Roll at ${t[3]}`);
 assert.ok(Math.abs(t[4]-3.2)<0.15,`roll at ${t[4]}`);
 assert.deepEqual(t,[...t].sort((a,b)=>a-b));
});

test('an unsure name follows the word before it; an unheard first name starts with the first sound',()=>{
 const [t]=run(`words=A.sentence_words("Carro rolls in Bubbo’s basket.")
raw={"w":["Carro","rolls","in","Bubbo’","s","basket."],"t":[1.325,1.355,2.395,3.065,3.095,3.185],"e":[1.33,1.6,2.605,3.095,3.185,3.835],"c":[0.2,0.85,0.73,0.08,0.28,0.92]}
heard=[["Balthazar",0.42],["rolls",1.62],["in",2.57],["basket",3.36]]
print(json.dumps(A.correct(words,A.merge(raw,words),heard,0.175,4.0,0.5)))`);
 assert.equal(t[0],0.5);
 assert.ok(t[2]<=t[3]&&t[3]<t[4],`${t}`);
 assert.ok(Math.abs(t[3]-2.6)<0.15,`Bubbo's at ${t[3]}`);
});

test('contraction pieces merge and mismatched provider words are rejected',()=>{
 const [merged,bad]=run(`words=A.sentence_words("Let’s wash.")
print(json.dumps([A.merge({"w":["Let’","s","wash."],"t":[0.1,0.2,0.4],"e":[0.2,0.3,0.8],"c":[0.5,0.3,0.9]},words),A.merge({"w":["Let","go"],"t":[0,1],"e":[1,2],"c":[1,1]},words)]))`);
 assert.deepEqual(merged,[{t:0.1,e:0.3,c:0.3},{t:0.4,e:0.8,c:0.9}]);
 assert.equal(bad,null);
});

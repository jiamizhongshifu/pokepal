import assert from 'node:assert/strict';
import {TraceStroke} from '../src/lib/traceStroke';
import {LETTER_STROKES} from '../src/data/letterStrokes';
assert.equal(Object.keys(LETTER_STROKES).sort().join(''),'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const points=Array.from({length:57},(_,i)=>({x:100,y:90+i*5}));
let stroke=new TraceStroke(points);
assert.equal(stroke.canStart({x:100,y:370}),false,'cannot begin at wrong end');
assert.equal(stroke.canStart({x:132,y:90}),true,'generous touch start');
stroke.advance({x:100,y:90},{x:100,y:90});
stroke.advance({x:100,y:90},{x:100,y:45});assert.equal(stroke.done,false,'reverse motion is not completion');
stroke=new TraceStroke(points);stroke.advance({x:100,y:90},{x:100,y:230});assert.equal(stroke.done,false);
assert.equal(stroke.canStart(stroke.next),true,'lift and resume');
stroke.advance(stroke.next,{x:100,y:370});assert.equal(stroke.done,true,'sparse touch samples still cover the line');
const bend=[...Array.from({length:41},(_,i)=>({x:100,y:100+i*5})),...Array.from({length:40},(_,i)=>({x:105+i*5,y:300}))];
stroke=new TraceStroke(bend);stroke.advance({x:100,y:100},{x:300,y:300});assert.equal(stroke.done,false,'diagonal shortcut cannot complete an L');
console.log('PASS: all 26 letters; correct start; reverse and shortcut rejection; generous touch tolerance; lift/resume; sparse-event coverage.');
// Touch starts were accepted at a wider distance than continuing strokes,
// leaving valid off-centre handwriting stuck at the first sample.
stroke=new TraceStroke(points);
assert.equal(stroke.canStart({x:135,y:90}),true);
stroke.advance({x:135,y:90},{x:135,y:220});
assert.ok(stroke.progress>.4,'off-centre child tracing advances');
assert.equal(stroke.canStart({x:130,y:240}),true,'resume nearby after lifting');
stroke.advance({x:130,y:240},{x:130,y:350});
assert.equal(stroke.done,true,'near-end touch completes without hitting the exact last pixel');
stroke=new TraceStroke(points);stroke.advance(points[0],points[0]);
assert.equal(stroke.done,false,'a single tap cannot complete a stroke');
console.log('PASS: off-centre handwriting, lift/resume, endpoint tolerance, tap rejection.');

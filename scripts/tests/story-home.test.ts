import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSave} from '../../src/lib/saveValidation';
import {collectionStep} from '../../src/lib/storyHome';

const make=()=>validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));
test('after a shared moment a waiting berry leads to the meadow, otherwise back to the path, without touching the save',()=>{
 const s=make();s.balls.poke=1;const before=JSON.stringify(s);
 assert.equal(collectionStep(s).kind,'catch');assert.equal(JSON.stringify(s),before);
 s.balls.poke=0;assert.equal(collectionStep(s).kind,'path');
});

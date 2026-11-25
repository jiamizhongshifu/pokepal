import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exportableSave,describeStorage} from '../../src/lib/saveExport';
import {validateSave} from '../../src/lib/saveValidation';

const fixture=()=>JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8'));

// T12: a parent can always take a readable copy out; the copy never carries the photo, and stays importable.
test('the exported save drops the avatar photo, leaves the original untouched and can be imported again',()=>{
 const s=fixture();s.trainer={...(s.trainer??{name:'测试',avatar:'avatar-red'}),avatarPhoto:'data:image/jpeg;base64,AAAA'};
 const out=exportableSave(s) as typeof s;
 assert.equal(out.trainer.avatarPhoto,undefined);assert.ok(s.trainer.avatarPhoto,'source not mutated');
 assert.doesNotThrow(()=>validateSave(JSON.parse(JSON.stringify(out))));
});

test('an unreadable save is exported as it is (minus the photo), and odd values do not throw',()=>{
 const broken={version:'?',trainer:{avatarPhoto:'data:x',name:'测试'},learning:{records:'bad'}};
 assert.deepEqual(exportableSave(broken),{version:'?',trainer:{name:'测试'},learning:{records:'bad'}});
 assert.equal(exportableSave(null),null);assert.equal(exportableSave('x'),'x');
});

test('storage facts say unknown rather than guessing',()=>{
 assert.match(describeStorage({}),/未知/);
 assert.match(describeStorage({usage:1048576,quota:10485760,persisted:false}),/1\.0 MB.*10\.0 MB.*可能清理.*导出/);
 assert.match(describeStorage({usage:1048576,quota:10485760,persisted:true}),/不会自动清理/);
});

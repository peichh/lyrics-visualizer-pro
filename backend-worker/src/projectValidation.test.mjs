import assert from 'node:assert/strict';
import { validateProject } from './projectValidation.ts';
const valid = {title:'SHELTER',revision:0,lyrics:[{id:'a',time:1.11,text:'Lights out'}]};
assert.deepEqual(validateProject(valid), valid);
assert.throws(() => validateProject({...valid,lyrics:[...valid.lyrics,...valid.lyrics]}), /duplicate/);
assert.throws(() => validateProject({...valid,lyrics:[{id:'a',time:NaN,text:'bad'}]}), /cue/);
assert.throws(() => validateProject({...valid,revision:-1}), /revision/);
assert.throws(() => validateProject({...valid,lyrics:[{id:'a',time:4,endTime:2,text:'bad'}]}), /end/);

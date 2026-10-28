import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
const mf=new Miniflare({modules:true,scriptPath:process.argv[2],compatibilityDate:'2024-01-01',d1Databases:['DB'],bindings:{OWNER_TOKEN:'owner-test',AI_TOKEN:'ai-test',FRONTEND_URL:'https://studio.example'}});
try {
 const db=await mf.getD1Database('DB');
 for(const file of ['../database/schema.sql','../database/proposals.sql'])for(const sql of (await readFile(file,'utf8')).split(';').filter(x=>x.trim()))await db.prepare(sql).run();
 const req=async(path,token,method='GET',data)=>{const r=await mf.dispatchFetch('https://test'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,body:await r.json()};};
 const saved=await req('/api/projects','owner-test','POST',{title:'SHELTER test',revision:0,lyrics:[{id:'cue1',time:1,text:'Original'}]});
 assert.equal(saved.status,201);const id=saved.body.id;
 const proposal=await req('/api/proposals','ai-test','POST',{projectId:id,baseRevision:0,summary:'Fix lyric',changes:[{cueId:'cue1',text:'Corrected'}]});
 assert.equal(proposal.status,201);
 assert.equal((await req('/api/projects/'+id,'owner-test')).body.lyrics[0].text,'Original');
 assert.equal((await req('/api/proposals/'+proposal.body.id+'/approve','ai-test','POST')).status,401);
 const approved=await req('/api/proposals/'+proposal.body.id+'/approve','owner-test','POST');
 assert.equal(approved.status,200);assert.equal(approved.body.project.lyrics[0].text,'Corrected');assert.equal(approved.body.project.revision,1);
 assert.equal((await req('/api/proposals/'+proposal.body.id+'/approve','owner-test','POST')).status,404);
 const stale=await req('/api/projects/'+id,'owner-test','PUT',saved.body);assert.equal(stale.status,409);
 const pending=await req('/api/proposals','ai-test','POST',{projectId:id,baseRevision:1,summary:'Second change',changes:[{cueId:'cue1',text:'AI suggestion'}]});
 assert.equal(pending.status,201);
 const ownerSave=await req('/api/projects/'+id,'owner-test','PUT',{...approved.body.project,lyrics:[{id:'cue1',time:1,text:'Owner edit'}]});assert.equal(ownerSave.status,200);
 assert.equal((await req('/api/proposals/'+pending.body.id+'/approve','owner-test','POST')).status,409);
 assert.equal((await req('/api/projects/'+id,'owner-test')).body.lyrics[0].text,'Owner edit');
 console.log('D1 cloud save → AI proposal → owner approval → stale revision protection passed');
} finally {await mf.dispose();}

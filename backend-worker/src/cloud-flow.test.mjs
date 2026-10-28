import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
const mf=new Miniflare({modules:true,scriptPath:process.argv[2],compatibilityDate:'2024-01-01',d1Databases:['DB'],bindings:{FRONTEND_URL:'https://studio.example'}});
try {
 const db=await mf.getD1Database('DB');
 for(const file of ['../database/schema.sql','../database/proposals.sql'])for(const sql of (await readFile(file,'utf8')).split(';').filter(x=>x.trim()))await db.prepare(sql).run();
 const account=await mf.dispatchFetch('https://test/api/account',{method:'POST'});const {apiKey}=await account.json();
 const req=async(path,token,method='GET',data)=>{const headers={'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};const r=await mf.dispatchFetch('https://test'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,body:await r.json()};};
 const saved=await req('/api/projects',apiKey,'POST',{title:'SHELTER test',revision:0,lyrics:[{id:'cue1',time:1,text:'Original'}]});
 assert.equal(saved.status,201);const id=saved.body.id;
 const proposal=await req('/api/proposals',apiKey,'POST',{projectId:id,baseRevision:0,summary:'Fix lyric',changes:[{cueId:'cue1',text:'Corrected'}]});
 assert.equal(proposal.status,201);
 assert.equal((await req('/api/projects/'+id,apiKey)).body.lyrics[0].text,'Original');
 const approved=await req('/api/proposals/'+proposal.body.id+'/approve',apiKey,'POST');
 assert.equal(approved.status,200);assert.equal(approved.body.project.lyrics[0].text,'Corrected');assert.equal(approved.body.project.revision,1);
 assert.equal((await req('/api/proposals/'+proposal.body.id+'/approve',apiKey,'POST')).status,404);
 const stale=await req('/api/projects/'+id,apiKey,'PUT',saved.body);assert.equal(stale.status,409);
 const pending=await req('/api/proposals',apiKey,'POST',{projectId:id,baseRevision:1,summary:'Second change',changes:[{cueId:'cue1',text:'AI suggestion'}]});
 assert.equal(pending.status,201);
 const userSave=await req('/api/projects/'+id,apiKey,'PUT',{...approved.body.project,lyrics:[{id:'cue1',time:1,text:'User edit'}]});assert.equal(userSave.status,200);
 assert.equal((await req('/api/proposals/'+pending.body.id+'/approve',apiKey,'POST')).status,409);
 assert.equal((await req('/api/projects/'+id,apiKey)).body.lyrics[0].text,'User edit');
 console.log('Per-account cloud save → AI proposal → explicit user approval → stale revision protection passed');
} finally {await mf.dispose();}

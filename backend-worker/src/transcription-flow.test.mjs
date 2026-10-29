import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Miniflare} from 'miniflare';

const {default:app}=await import(pathToFileURL(resolve(process.argv[2])));
const mf=new Miniflare({modules:true,scriptPath:process.argv[2],compatibilityDate:'2024-01-01',d1Databases:['DB']});
try {
  const DB=await mf.getD1Database('DB');
  for(const file of ['../../database/schema.sql','../../database/proposals.sql'])for(const sql of (await readFile(new URL(file,import.meta.url),'utf8')).split(';').filter(x=>x.trim()))await DB.prepare(sql).run();
  let calls=0;
  const env={DB,FRONTEND_URL:'https://studio.example',AI:{async run(model,{audio}){calls++;assert.equal(model,'@cf/openai/whisper');assert.ok(audio.length>44);return {words:[{word:'Hello',start:0.1,end:0.45},{word:' world',start:0.5,end:0.9}]};}}};
  const accountResponse=await app.request('https://test/api/account',{method:'POST'},env);
  assert.equal(accountResponse.status,201);const {apiKey}=await accountResponse.json();
  const seconds=2;const pcmBytes=seconds*16000*2;const wav=new ArrayBuffer(44+pcmBytes);const data=new DataView(wav);const bytes=new Uint8Array(wav);
  const write=(offset,text)=>{for(let i=0;i<text.length;i++)data.setUint8(offset+i,text.charCodeAt(i));};
  write(0,'RIFF');data.setUint32(4,36+pcmBytes,true);write(8,'WAVE');write(12,'fmt ');data.setUint32(16,16,true);data.setUint16(20,1,true);data.setUint16(22,1,true);data.setUint32(24,16000,true);data.setUint32(28,32000,true);data.setUint16(32,2,true);data.setUint16(34,16,true);write(36,'data');data.setUint32(40,pcmBytes,true);
  const form=new FormData();form.append('audio',new Blob([bytes],{type:'audio/wav'}),'test.wav');
  const response=await app.request('https://test/api/transcribe',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`},body:form},env);
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.words.length,2);assert.deepEqual(result.words[1],{text:' world',start:0.5,end:0.9});assert.equal(calls,1);
  const daily=await DB.prepare('SELECT seconds FROM ai_usage').first();assert.equal(daily.seconds,2);
  console.log('Authenticated Whisper upload → timed words → per-account/global quota passed');
} finally {await mf.dispose();}

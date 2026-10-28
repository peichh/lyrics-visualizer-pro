import { rpcMessage } from './mcp';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { accountForKey, proposalRoutes } from './proposalRoutes';
import { validateProject } from './projectValidation';

type WorkersAI = { run(model: string, input: { audio: number[] }): Promise<unknown> };
type Bindings = { DB: D1Database; FRONTEND_URL: string; AI?: WorkersAI };
type Variables = { userId: string };
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');

app.use('/*',cors({origin:(origin,c)=>{if(!origin)return c.env.FRONTEND_URL||'*';try{const u=new URL(origin);return origin===c.env.FRONTEND_URL||u.hostname.endsWith('.lyrics-visualizer-pro.pages.dev')||['localhost','127.0.0.1'].includes(u.hostname)?origin:'null';}catch{return 'null';}},allowMethods:['GET','POST','PUT','DELETE','OPTIONS'],allowHeaders:['Content-Type','Authorization']}));

// Each person gets a random API key once. Only its hash is stored.
app.post('/api/account',async c=>{
  const key=`lv_${crypto.randomUUID().replaceAll('-','')}${crypto.randomUUID().replaceAll('-','')}`;
  const id=crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO users(id,api_key_hash) VALUES(?,?)').bind(id,await hash(key)).run();
  return c.json({id,apiKey:key,message:'Copy this key now. It is shown only once.'},201);
});

app.use('/api/*',async(c,next)=>{
  if(c.req.path==='/api/account')return next();
  const bearer=c.req.header('Authorization');
  if(!bearer?.startsWith('Bearer '))return c.json({error:'Account API key required'},401);
  const user=await accountForKey(c.env.DB,bearer.slice(7));
  if(!user)return c.json({error:'Invalid account API key'},401);
  c.set('userId',user.id);await next();
});

app.route('/api/proposals',proposalRoutes);
app.get('/api/projects',async c=>{
  const {results}=await c.env.DB.prepare('SELECT p.data FROM projects p JOIN project_owners o ON o.project_id=p.id WHERE o.user_id=? ORDER BY p.updated_at DESC').bind(c.get('userId')).all<{data:string}>();
  return c.json(results.map(row=>JSON.parse(row.data)));
});
app.post('/api/projects',async c=>{
  try{
    const project=validateProject(await c.req.json());const id=crypto.randomUUID();const saved={...project,id,revision:0};
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO projects(id,data) VALUES(?,?)').bind(id,JSON.stringify(saved)),
      c.env.DB.prepare('INSERT INTO project_owners(project_id,user_id) VALUES(?,?)').bind(id,c.get('userId')),
    ]);
    return c.json(saved,201);
  }catch{return c.json({error:'Invalid project'},400);}
});
app.put('/api/projects/:id',async c=>{
  let project;try{project=validateProject(await c.req.json());}catch{return c.json({error:'Invalid project'},400);}
  const id=c.req.param('id');
  const row=await c.env.DB.prepare('SELECT p.data FROM projects p JOIN project_owners o ON o.project_id=p.id WHERE p.id=? AND o.user_id=?').bind(id,c.get('userId')).first<{data:string}>();
  if(!row)return c.json({error:'Project not found'},404);
  const current=JSON.parse(row.data);if(current.revision!==project.revision)return c.json({error:'Project changed; reload before saving'},409);
  const saved={...project,id,revision:project.revision+1};
  const result=await c.env.DB.prepare('UPDATE projects SET data=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND data=? AND EXISTS(SELECT 1 FROM project_owners WHERE project_id=? AND user_id=?)').bind(JSON.stringify(saved),id,row.data,id,c.get('userId')).run();
  return result.meta.changes===1?c.json(saved):c.json({error:'Project changed; reload before saving'},409);
});
app.get('/api/projects/:id',async c=>{
  const row=await c.env.DB.prepare('SELECT p.data FROM projects p JOIN project_owners o ON o.project_id=p.id WHERE p.id=? AND o.user_id=?').bind(c.req.param('id'),c.get('userId')).first<{data:string}>();
  return row?c.json(JSON.parse(row.data)):c.json({error:'Project not found'},404);
});

// Whisper word timestamps for karaoke timing. Audio is converted in-browser to
// mono 16 kHz PCM WAV, then chunked here so a long track never becomes one huge
// model input. Daily caps keep the public preview inside the free AI allowance.
app.post('/api/transcribe',async c=>{
  if(!c.env.AI)return c.json({error:'Whisper is not enabled for this service yet'},503);
  const contentLength=Number(c.req.header('Content-Length')||0);
  if(contentLength>20*1024*1024)return c.json({error:'Audio is too large. Maximum is 20 MB after audio preparation.'},413);
  let form:FormData;try{form=await c.req.formData();}catch{return c.json({error:'Upload a prepared WAV audio file'},400);}
  const file=form.get('audio');
  if(!(file instanceof File)||file.size<44||file.size>20*1024*1024)return c.json({error:'Audio must be a WAV file under 20 MB'},400);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(String.fromCharCode(...bytes.subarray(0,4))!=='RIFF'||String.fromCharCode(...bytes.subarray(8,12))!=='WAVE')return c.json({error:'Audio preparation failed. Expected WAV format.'},400);
  let sampleRate=0,channels=0,bits=0,format=0,dataStart=-1,dataLength=0;
  for(let offset=12;offset+8<=bytes.length;){const name=String.fromCharCode(...bytes.subarray(offset,offset+4));const size=view.getUint32(offset+4,true);const start=offset+8;if(start+size>bytes.length)return c.json({error:'Invalid WAV file'},400);if(name==='fmt '&&size>=16){format=view.getUint16(start,true);channels=view.getUint16(start+2,true);sampleRate=view.getUint32(start+4,true);bits=view.getUint16(start+14,true);}if(name==='data'){dataStart=start;dataLength=size;break;}offset=start+size+(size%2);}
  if(format!==1||channels!==1||sampleRate!==16000||bits!==16||dataStart<0||dataLength%2)return c.json({error:'Audio must be mono 16 kHz PCM WAV'},400);
  const samples=dataLength/2;const duration=samples/sampleRate;const seconds=Math.ceil(duration);if(seconds<1||seconds>1800)return c.json({error:'Audio must be between 1 second and 30 minutes'},400);
  const day=new Date().toISOString().slice(0,10);const userId=c.get('userId');
  const reserveUser=await c.env.DB.prepare('INSERT INTO ai_usage(day,user_id,seconds) VALUES(?,?,?) ON CONFLICT(day,user_id) DO UPDATE SET seconds=seconds+excluded.seconds WHERE seconds+excluded.seconds<=1800').bind(day,userId,seconds).run();
  if(reserveUser.meta.changes!==1)return c.json({error:'This account has reached its 30 minute daily Whisper allowance'},429);
  const reserveGlobal=await c.env.DB.prepare('INSERT INTO ai_global_usage(day,seconds) VALUES(?,?) ON CONFLICT(day) DO UPDATE SET seconds=seconds+excluded.seconds WHERE seconds+excluded.seconds<=10800').bind(day,seconds).run();
  if(reserveGlobal.meta.changes!==1){await c.env.DB.prepare('UPDATE ai_usage SET seconds=MAX(0,seconds-?) WHERE day=? AND user_id=?').bind(seconds,day,userId).run();return c.json({error:'The shared free Whisper allowance is used up for today. Try again after 00:00 UTC.'},429);}
  try{
    const words:Array<{text:string;start:number;end:number}>=[];const chunkSeconds=30;const overlapSeconds=.5;const stepSamples=(chunkSeconds-overlapSeconds)*sampleRate;
    for(let startSample=0;startSample<samples;startSample+=stepSamples){
      const count=Math.min(chunkSeconds*sampleRate,samples-startSample);const startByte=dataStart+startSample*2;const pcm=bytes.slice(startByte,startByte+count*2);
      const wav=new Uint8Array(44+pcm.length);const wv=new DataView(wav.buffer);const put=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)wav[offset+i]=value.charCodeAt(i);};put(0,'RIFF');wv.setUint32(4,36+pcm.length,true);put(8,'WAVE');put(12,'fmt ');wv.setUint32(16,16,true);wv.setUint16(20,1,true);wv.setUint16(22,1,true);wv.setUint32(24,sampleRate,true);wv.setUint32(28,sampleRate*2,true);wv.setUint16(32,2,true);wv.setUint16(34,16,true);put(36,'data');wv.setUint32(40,pcm.length,true);wav.set(pcm,44);
      const raw=await c.env.AI.run('@cf/openai/whisper',{audio:Array.from(wav)}) as any;const result=raw?.result||raw;const list=Array.isArray(result?.words)?result.words:[];const offset=startSample/sampleRate;
      for(const item of list){const text=String(item?.word??item?.text??'');const localStart=Number(item?.start??item?.start_time??item?.startTime);const localEnd=Number(item?.end??item?.end_time??item?.endTime);if(!text||!Number.isFinite(localStart)||!Number.isFinite(localEnd)||localEnd<=localStart)continue;const start=offset+localStart;if(start>offset+chunkSeconds-overlapSeconds&&startSample+count<samples)continue;const normalized={text,start:Number(start.toFixed(3)),end:Number((offset+localEnd).toFixed(3))};const duplicate=words.some(prev=>Math.abs(prev.start-normalized.start)<.3&&prev.text.trim()===normalized.text.trim());if(!duplicate)words.push(normalized);}
    }
    words.sort((a,b)=>a.start-b.start);
    if(!words.length)throw new Error('Whisper did not return word timestamps for this audio.');
    return c.json({words,duration,model:'@cf/openai/whisper'});
  }catch(error){
    await c.env.DB.batch([c.env.DB.prepare('UPDATE ai_usage SET seconds=MAX(0,seconds-?) WHERE day=? AND user_id=?').bind(seconds,day,userId),c.env.DB.prepare('UPDATE ai_global_usage SET seconds=MAX(0,seconds-?) WHERE day=?').bind(seconds,day)]);
    console.error('Whisper transcription failed',error);return c.json({error:error instanceof Error?error.message:'Whisper transcription failed'},502);
  }
});

// MCP clients authenticate with the same per-user key shown once at account creation.
app.use('/mcp/*',async(c,next)=>{
  const bearer=c.req.header('Authorization');if(!bearer?.startsWith('Bearer '))return c.json({error:'Account API key required'},401);
  const user=await accountForKey(c.env.DB,bearer.slice(7));
  if(!user)return c.json({error:'Invalid account API key'},401);c.set('userId',user.id);await next();
});
app.use('/mcp',async(c,next)=>{
  const bearer=c.req.header('Authorization');if(!bearer?.startsWith('Bearer '))return c.json({error:'Account API key required'},401);
  const user=await accountForKey(c.env.DB,bearer.slice(7));
  if(!user)return c.json({error:'Invalid account API key'},401);c.set('userId',user.id);await next();
});
app.get('/mcp',()=>new Response(null,{status:405,headers:{Allow:'POST'}}));
app.post('/mcp',async c=>{
  if(!c.req.header('Content-Type')?.includes('application/json'))return c.json({error:'JSON required'},415);
  let input;try{input=await c.req.json();}catch{return c.json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400);}
  const userId=c.get('userId');
  const call=async(name:string,args:Record<string,unknown>)=>{
    if(name==='list_projects'){
      const {results}=await c.env.DB.prepare('SELECT p.data FROM projects p JOIN project_owners o ON o.project_id=p.id WHERE o.user_id=?').bind(userId).all<{data:string}>();
      return results.map(row=>{const p=JSON.parse(row.data);return {id:p.id,title:p.title,revision:p.revision};});
    }
    if(typeof args.projectId!=='string'||args.projectId.length>200)throw new Error('Valid project ID required');
    if(name==='get_project'){
      const row=await c.env.DB.prepare('SELECT p.data FROM projects p JOIN project_owners o ON o.project_id=p.id WHERE p.id=? AND o.user_id=?').bind(args.projectId,userId).first<{data:string}>();
      if(!row)throw new Error('Project not found');return JSON.parse(row.data);
    }
    const response=await app.request('https://internal/api/proposals',{method:'POST',headers:{'Content-Type':'application/json',Authorization:c.req.header('Authorization')!},body:JSON.stringify(args)},c.env);
    const body=await response.json() as any;if(!response.ok)throw new Error(body.error||'Proposal failed');return body;
  };
  if(Array.isArray(input)){if(!input.length||input.length>50)return c.json({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid batch'}},400);const out=[];for(const item of input){const result=await rpcMessage(item,call);if(result)out.push(result);}return out.length?c.json(out):new Response(null,{status:202});}
  const result=await rpcMessage(input,call);return result?c.json(result):new Response(null,{status:202});
});
app.get('/',c=>c.json({status:'Lyrics Visualizer MCP API',accountRegistration:'/api/account',mcp:'/mcp'}));
export default app;

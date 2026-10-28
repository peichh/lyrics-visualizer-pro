import { rpcMessage } from './mcp';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { proposalRoutes } from './proposalRoutes';
import { validateProject } from './projectValidation';

type Bindings = { DB: D1Database; FRONTEND_URL: string };
type Variables = { userId: string };
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
const hash = async (value: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));

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
  const user=await c.env.DB.prepare('SELECT id FROM users WHERE api_key_hash = ?').bind(await hash(bearer.slice(7))).first<{id:string}>();
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

// MCP clients authenticate with the same per-user key shown once at account creation.
app.use('/mcp/*',async(c,next)=>{
  const bearer=c.req.header('Authorization');if(!bearer?.startsWith('Bearer '))return c.json({error:'Account API key required'},401);
  const user=await c.env.DB.prepare('SELECT id FROM users WHERE api_key_hash=?').bind(await hash(bearer.slice(7))).first<{id:string}>();
  if(!user)return c.json({error:'Invalid account API key'},401);c.set('userId',user.id);await next();
});
app.use('/mcp',async(c,next)=>{
  const bearer=c.req.header('Authorization');if(!bearer?.startsWith('Bearer '))return c.json({error:'Account API key required'},401);
  const user=await c.env.DB.prepare('SELECT id FROM users WHERE api_key_hash=?').bind(await hash(bearer.slice(7))).first<{id:string}>();
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

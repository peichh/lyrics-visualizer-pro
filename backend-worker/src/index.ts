import { rpcMessage } from './mcp';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authorized, proposalRoutes } from './proposalRoutes';
import { validateProject } from './projectValidation';

type Bindings = { DB: D1Database; FRONTEND_URL: string; OWNER_TOKEN: string; AI_TOKEN: string; }
const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors({
  origin: (o, c) => c.env.FRONTEND_URL || '*',
  allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

app.route('/api/proposals', proposalRoutes);

app.use('/mcp/*', async (c, next) => {
  const header = c.req.header('Authorization');
  if (!await authorized(header, c.env.AI_TOKEN) && !await authorized(header, c.env.OWNER_TOKEN)) return c.json({error:'Authentication required'}, 401);
  await next();
});
app.use('/api/projects*', async (c, next) => {
  if (!await authorized(c.req.header('Authorization'), c.env.OWNER_TOKEN)) return c.json({error:'Authentication required'}, 401);
  await next();
});

app.use('/mcp', async (c, next) => {
  const origin=c.req.header('Origin');
  if(origin && origin!==c.env.FRONTEND_URL)return c.json({error:'Origin not allowed'},403);
  const header=c.req.header('Authorization');
  if(!await authorized(header,c.env.AI_TOKEN) && !await authorized(header,c.env.OWNER_TOKEN))return c.json({error:'Authentication required'},401);
  await next();
});
app.get('/mcp',()=>new Response(null,{status:405,headers:{Allow:'POST'}}));
app.post('/mcp',async c=>{
  if(!c.req.header('Content-Type')?.includes('application/json'))return c.json({error:'JSON required'},415);
  let input;
  try{input=await c.req.json();}catch{return c.json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400);}
  const call=async(name:string,args:Record<string,unknown>)=>{
    if(name==='list_projects'){
      const {results}=await c.env.DB.prepare('SELECT data FROM projects').all();
      return results.map((row:any)=>{const p=JSON.parse(row.data);return {id:p.id,title:p.title,revision:p.revision};});
    }
    if(typeof args.projectId!=='string'||args.projectId.length>200)throw new Error('Valid project ID required');
    if(name==='get_project'){
      const row=await c.env.DB.prepare('SELECT data FROM projects WHERE id = ?').bind(args.projectId).first<{data:string}>();
      if(!row)throw new Error('Project not found');return JSON.parse(row.data);
    }
    const response=await app.request('https://internal/api/proposals',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${c.env.AI_TOKEN}`},body:JSON.stringify(args)},c.env);
    const body=await response.json() as any;
    if(!response.ok)throw new Error(body.error||'Proposal failed');return body;
  };
  if(Array.isArray(input)){
    if(!input.length||input.length>50)return c.json({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid batch'}},400);
    const results=[];for(const message of input){const result=await rpcMessage(message,call);if(result)results.push(result);}
    return results.length?c.json(results):new Response(null,{status:202});
  }
  const result=await rpcMessage(input,call);return result?c.json(result):new Response(null,{status:202});
});

app.get('/mcp/tools', (c) => c.json({
  name: 'lyrics-visualizer-mcp',
  tools: [
    { name: 'get_project_state', params: ['projectId'] },
    { name: 'get_lyrics_timestamps', params: ['projectId'] },
  ]
}));

app.post('/mcp/call', async (c) => {
  const { tool, args } = await c.req.json();
  const projectId = args.projectId;
  if (tool === 'get_project_state') {
    const row = await c.env.DB.prepare('SELECT data FROM projects WHERE id = ?').bind(projectId).first();
    return c.json({ success: true, result: row ? JSON.parse(row.data as string) : null });
  }
  if (tool === 'get_lyrics_timestamps') {
    const row = await c.env.DB.prepare('SELECT data FROM projects WHERE id = ?').bind(projectId).first();
    if (!row) return c.json({ success: false });
    const p = JSON.parse(row.data as string);
    return c.json({ success: true, result: p.lyrics });
  }
  if (tool === 'update_timeline_cue') {
    return c.json({success:false,error:'Create a proposal through /api/proposals; the owner must confirm before any edit'}, 409);
  }
  return c.json({ success: false, error: 'unknown tool' });
});

app.post('/mcp/chat', c => c.json({error:'Chat provider is not configured. No project changes were made.'}, 503));

app.get('/api/projects', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT data FROM projects').all();
  return c.json(results.map((r:any) => JSON.parse(r.data)));
});

app.post('/api/projects', async c => {
  try {
    const project = validateProject(await c.req.json());
    const id = crypto.randomUUID();
    const saved = {...project,id,revision:0};
    await c.env.DB.prepare('INSERT INTO projects(id,data) VALUES(?,?)').bind(id,JSON.stringify(saved)).run();
    return c.json(saved,201);
  } catch { return c.json({error:'Invalid project'},400); }
});

app.put('/api/projects/:id', async c => {
  let project;
  try { project = validateProject(await c.req.json()); }
  catch { return c.json({error:'Invalid project'},400); }
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT data FROM projects WHERE id = ?').bind(id).first<{data:string}>();
  if (!row) return c.json({error:'Project not found'},404);
  const current = JSON.parse(row.data);
  if (current.revision !== project.revision) return c.json({error:'Project changed; reload before saving'},409);
  const saved = {...project,id,revision:(project.revision as number)+1};
  const result = await c.env.DB.prepare('UPDATE projects SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND data = ?').bind(JSON.stringify(saved),id,row.data).run();
  if (result.meta.changes !== 1) return c.json({error:'Project changed; reload before saving'},409);
  return c.json(saved);
});

app.get('/api/projects/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT data FROM projects WHERE id = ?').bind(id).first();
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(JSON.parse(row.data as string));
});

app.get('/', (c) => c.json({ status: 'Lyrics Visualizer Pro API on Cloudflare Workers' }));

export default app;

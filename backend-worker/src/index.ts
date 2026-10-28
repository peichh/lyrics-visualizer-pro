import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authorized, proposalRoutes } from './proposalRoutes';

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

app.get('/api/projects/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT data FROM projects WHERE id = ?').bind(id).first();
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json(JSON.parse(row.data as string));
});

app.get('/', (c) => c.json({ status: 'Lyrics Visualizer Pro API on Cloudflare Workers' }));

export default app;

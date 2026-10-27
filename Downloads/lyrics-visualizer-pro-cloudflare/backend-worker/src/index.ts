import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = { DB: D1Database; FRONTEND_URL: string; }
const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors({
  origin: (o, c) => c.env.FRONTEND_URL || '*',
  allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type']
}));

app.get('/mcp/tools', (c) => c.json({
  name: 'lyrics-visualizer-mcp',
  tools: [
    { name: 'get_project_state', params: ['projectId'] },
    { name: 'get_lyrics_timestamps', params: ['projectId'] },
    { name: 'update_timeline_cue', params: ['projectId','timestamp','updates'] },
    { name: 'set_background_transition', params: ['projectId','time_start','style','duration'] },
    { name: 'trigger_preview_at', params: ['projectId','timestamp'] }
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
    const row = await c.env.DB.prepare('SELECT data FROM projects WHERE id = ?').bind(projectId).first();
    if (!row) return c.json({ success: false, error: 'not found' });
    const p = JSON.parse(row.data as string);
    const cue = p.lyrics.find((l:any) => Math.abs(l.time - args.timestamp) < 1);
    if (cue) Object.assign(cue, args.updates);
    await c.env.DB.prepare('UPDATE projects SET data = ? WHERE id = ?').bind(JSON.stringify(p), projectId).run();
    return c.json({ success: true, result: cue });
  }
  return c.json({ success: false, error: 'unknown tool' });
});

app.post('/mcp/chat', async (c) => {
  const { message, projectId, timestamp } = await c.req.json();
  const lower = message.toLowerCase();
  let reply = 'รับทราบคับพี่พีช: ' + message + ' - องศากำลังปรับให้...';
  if (lower.includes('ขวาบน')) {
    reply = 'ปรับให้แล้วคับพี่พีช! ย้ายไปมุมขวาบน Celestial Starlight พุ่งแรงขึ้น';
  }
  return c.json({ reply, seek: { timestamp: timestamp || 84.5 } });
});

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
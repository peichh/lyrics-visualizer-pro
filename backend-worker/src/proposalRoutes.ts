import { Hono } from 'hono';
import { applyApprovedChanges, validateCuePatch } from './proposals';

type ProposalBindings = { DB: D1Database };
type AuthVars = { userId: string };
export const proposalRoutes = new Hono<{Bindings: ProposalBindings; Variables: AuthVars}>();

export async function authorized(header: string | undefined, token: string | undefined) {
  if (!token || !header?.startsWith('Bearer ')) return false;
  const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  const [a, b] = await Promise.all([digest(header.slice(7)), digest(token)]);
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

proposalRoutes.use('*', async (c, next) => {
  const bearer=c.req.header('Authorization');
  if(!bearer?.startsWith('Bearer '))return c.json({error:'Account API key required'},401);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bearer.slice(7)))).map(b=>b.toString(16).padStart(2,'0'))).join('');
  const user=await c.env.DB.prepare('SELECT id FROM users WHERE api_key_hash = ?').bind(digest).first<{id:string}>();
  if(!user)return c.json({error:'Invalid account API key'},401);
  c.set('userId',user.id);
  await next();
});

proposalRoutes.get('/', async c => {
  const projectId = c.req.query('projectId');
  if (!projectId) return c.json({error:'Project ID required'}, 400);
  const {results} = await c.env.DB.prepare('SELECT a.* FROM ai_proposals a JOIN project_owners o ON o.project_id=a.project_id WHERE a.project_id = ? AND o.user_id = ? ORDER BY a.created_at DESC LIMIT 100').bind(projectId,c.get('userId')).all();
  return c.json({proposals:results.map(row => ({...row, changes:JSON.parse(row.changes as string)}))});
});

proposalRoutes.post('/', async c => {
  try {
    const body = await c.req.json();
    if (typeof body.projectId !== 'string' || typeof body.summary !== 'string' || body.summary.length > 2000 || !Array.isArray(body.changes) || !body.changes.length || body.changes.length > 200) return c.json({error:'Invalid proposal'}, 400);
    const changes = body.changes.map(validateCuePatch);
    const row = await c.env.DB.prepare('SELECT p.data FROM projects p JOIN project_owners o ON o.project_id=p.id WHERE p.id = ? AND o.user_id = ?').bind(body.projectId,c.get('userId')).first<{data:string}>();
    if (!row) return c.json({error:'Project not found'}, 404);
    const project = JSON.parse(row.data);
    if (!Number.isInteger(project.revision)) return c.json({error:'Project needs a revision before AI editing'}, 409);
    applyApprovedChanges(project, {baseRevision:body.baseRevision, changes}, true);
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO ai_proposals(id,project_id,base_revision,changes,summary) VALUES(?,?,?,?,?)').bind(id,body.projectId,body.baseRevision,JSON.stringify(changes),body.summary).run();
    return c.json({id,status:'pending'}, 201);
  } catch { return c.json({error:'Invalid proposal or stale project revision'}, 400); }
});

proposalRoutes.post('/:id/approve', async c => {
  const proposal = await c.env.DB.prepare('SELECT a.* FROM ai_proposals a JOIN project_owners o ON o.project_id=a.project_id WHERE a.id = ? AND o.user_id = ?').bind(c.req.param('id'),c.get('userId')).first<{id:string;project_id:string;base_revision:number;changes:string;status:string}>();
  if (!proposal || proposal.status !== 'pending') return c.json({error:'Pending proposal not found'}, 404);
  const row = await c.env.DB.prepare('SELECT data FROM projects WHERE id = ?').bind(proposal.project_id).first<{data:string}>();
  if (!row) return c.json({error:'Project not found'}, 404);
  let updated;
  try { updated = applyApprovedChanges(JSON.parse(row.data), {baseRevision:proposal.base_revision,changes:JSON.parse(proposal.changes)}, true); }
  catch { return c.json({error:'Project changed; review a new proposal'}, 409); }
  const data = JSON.stringify(updated);
  const results = await c.env.DB.batch([
    c.env.DB.prepare("UPDATE projects SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND data = ? AND EXISTS(SELECT 1 FROM ai_proposals WHERE id = ? AND status = 'pending')").bind(data,proposal.project_id,row.data,proposal.id),
    c.env.DB.prepare("UPDATE ai_proposals SET status = 'approved' WHERE id = ? AND status = 'pending' AND EXISTS(SELECT 1 FROM projects WHERE id = ? AND data = ?)").bind(proposal.id,proposal.project_id,data),
  ]);
  if (results[0].meta.changes !== 1) return c.json({error:'Project changed; retry review'}, 409);
  return c.json({project:updated,status:'approved'});
});

proposalRoutes.post('/:id/reject', async c => {
  const result = await c.env.DB.prepare("UPDATE ai_proposals SET status = 'rejected' WHERE id = ? AND status = 'pending' AND EXISTS(SELECT 1 FROM project_owners WHERE project_id=ai_proposals.project_id AND user_id=?)").bind(c.req.param('id'),c.get('userId')).run();
  return result.meta.changes === 1 ? c.json({status:'rejected'}) : c.json({error:'Pending proposal not found'}, 404);
});

export function validateProject(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid project');
  const project = structuredClone(input) as Record<string, unknown>;
  if (typeof project.title !== 'string' || project.title.length > 500) throw new Error('Invalid project title');
  if (!Number.isInteger(project.revision) || (project.revision as number) < 0) throw new Error('Invalid project revision');
  if (!Array.isArray(project.lyrics) || project.lyrics.length > 10000) throw new Error('Invalid lyrics');
  const ids = new Set();
  for (const cue of project.lyrics) {
    if (!cue || typeof cue.id !== 'string' || !cue.id || cue.id.length > 200 || ids.has(cue.id)) throw new Error('Invalid or duplicate cue ID');
    ids.add(cue.id);
    if (typeof cue.text !== 'string' || cue.text.length > 10000 || typeof cue.time !== 'number' || !Number.isFinite(cue.time) || cue.time < 0) throw new Error('Invalid lyric cue');
    if (cue.endTime !== undefined && (typeof cue.endTime !== 'number' || !Number.isFinite(cue.endTime) || cue.endTime <= cue.time)) throw new Error('Invalid cue end');
  }
  if (JSON.stringify(project).length > 1_000_000) throw new Error('Project too large');
  return project;
}

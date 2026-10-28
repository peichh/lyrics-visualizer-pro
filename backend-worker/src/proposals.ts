export type CuePatch = { cueId: string; text?: string; time?: number; endTime?: number; x?: number; y?: number; preset?: string };
const allowed = new Set(['cueId', 'text', 'time', 'endTime', 'x', 'y', 'preset']);

export function validateCuePatch(value: unknown): CuePatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid cue change');
  const patch = value as Record<string, unknown>;
  if (Object.keys(patch).some(key => !allowed.has(key))) throw new Error('Unsupported cue property');
  if (typeof patch.cueId !== 'string' || !patch.cueId || patch.cueId.length > 200) throw new Error('Missing cue ID');
  if (Object.keys(patch).length < 2) throw new Error('Empty change');
  for (const key of ['time', 'endTime', 'x', 'y']) {
    if (patch[key] === undefined) continue;
    if (typeof patch[key] !== 'number' || !Number.isFinite(patch[key])) throw new Error('Invalid numeric value');
    if ((patch[key] as number) < 0 || (['x', 'y'].includes(key) && (patch[key] as number) > 100)) throw new Error('Value out of range');
  }
  for (const key of ['text', 'preset']) if (patch[key] !== undefined && (typeof patch[key] !== 'string' || (patch[key] as string).length > 10000)) throw new Error('Invalid text value');
  return { ...patch } as CuePatch;
}

/** Apply only to the revision the owner reviewed; never mutate the stored source in place. */
export function applyApprovedChanges<T extends { revision: number; lyrics: Array<{ id: string; time: number; endTime?: number; [key: string]: unknown }> }>(
  project: T, proposal: { baseRevision: number; changes: unknown[] }, ownerApproved: boolean,
): T {
  if (!ownerApproved) throw new Error('Owner confirmation required');
  if (proposal.baseRevision !== project.revision) throw new Error('Project changed; review a new proposal');
  if (!Array.isArray(proposal.changes) || !proposal.changes.length || proposal.changes.length > 200) throw new Error('Invalid change count');
  const changes = proposal.changes.map(validateCuePatch);
  const copy = structuredClone(project);
  for (const { cueId, ...patch } of changes) {
    const cue = copy.lyrics.find(item => item.id === cueId);
    if (!cue) throw new Error('Cue no longer exists');
    Object.assign(cue, patch);
    if (cue.endTime !== undefined && cue.endTime <= cue.time) throw new Error('Cue end must follow start');
  }
  copy.lyrics.sort((a, b) => a.time - b.time);
  copy.revision++;
  return copy;
}

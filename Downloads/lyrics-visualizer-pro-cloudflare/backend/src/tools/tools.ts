
import { db } from '../db/database.js';

export const mcpTools = {
  async get_project_state(projectId: string) {
    await db.read();
    const project = db.data.projects.find(p => p.id === projectId);
    return project || null;
  },

  async get_lyrics_timestamps(projectId: string) {
    await db.read();
    const project = db.data.projects.find(p => p.id === projectId);
    if (!project) return [];
    return project.lyrics.map(l => ({
      id: l.id,
      timestamp: l.time,
      end: l.endTime,
      text: l.text,
      x: l.x, y: l.y, scale: l.scale, rotation: l.rotation,
      preset: l.preset
    }));
  },

  async update_timeline_cue(projectId: string, timestamp: number, updates: any) {
    await db.read();
    const project = db.data.projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    const cue = project.lyrics.find(l => Math.abs(l.time - timestamp) < 0.5 || l.id === updates.id);
    if (!cue) throw new Error('Cue not found');
    Object.assign(cue, updates);
    // updates can include: x,y,scale,rotation,preset,speed,duration,color
    await db.write();
    return { success: true, cue };
  },

  async set_background_transition(projectId: string, time_start: number, style: string, duration: number) {
    await db.read();
    const project = db.data.projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    project.backgrounds.push({
      id: `bg_${Date.now()}`,
      type: 'transition',
      value: style,
      start: time_start,
      duration,
      layer: 1,
      loop: 'seamless'
    });
    await db.write();
    return { success: true };
  },

  async trigger_preview_at(projectId: string, timestamp: number) {
    // This is a signal for frontend via SSE/WebSocket - here we just return instruction
    return { action: 'SEEK', timestamp, projectId };
  }
};

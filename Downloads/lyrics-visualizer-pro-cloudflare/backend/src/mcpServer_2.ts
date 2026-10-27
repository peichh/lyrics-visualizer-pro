
import express from 'express';
import { mcpTools } from './tools/tools.js';

export const mcpRouter = express.Router();

// List tools
mcpRouter.get('/tools', (req, res) => {
  res.json({
    name: 'lyrics-visualizer-mcp',
    description: 'MCP Server for Ongsa AI to control timeline',
    tools: [
      { name: 'get_project_state', description: 'ดึงข้อมูลโปรเจกต์ปัจจุบัน', params: ['projectId'] },
      { name: 'get_lyrics_timestamps', description: 'ดึงเนื้อเพลงทุกท่อนพร้อมเวลา', params: ['projectId'] },
      { name: 'update_timeline_cue', description: 'ปรับจูนท่อนนั้นๆ เช่น x,y,rotation,preset,speed', params: ['projectId','timestamp','updates'] },
      { name: 'set_background_transition', description: 'ปรับสไตล์การเฟดพื้นหลัง', params: ['projectId','time_start','style','duration'] },
      { name: 'trigger_preview_at', description: 'สั่ง Playhead เลื่อนไปวินาทีนั้น', params: ['projectId','timestamp'] }
    ]
  });
});

mcpRouter.post('/call', async (req, res) => {
  const { tool, args } = req.body;
  try {
    // @ts-ignore
    const result = await mcpTools[tool](...Object.values(args));
    res.json({ success: true, result });
  } catch (e:any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Chat endpoint for Ongsa
mcpRouter.post('/chat', async (req, res) => {
  const { message, projectId, timestamp } = req.body;
  // Simple intent parser - in production this would call LLM
  let response = '';
  let actions: any[] = [];

  const lower = message.toLowerCase();
  if (lower.includes('ขวาบน') || lower.includes('มุมขวา')) {
    const targetTime = timestamp || 84.5;
    await mcpTools.update_timeline_cue(projectId, targetTime, { x: 85, y: 15, preset: 'celestial_starlight', scale: 1.4 });
    actions.push({ tool: 'update_timeline_cue', x: 85, y: 15, preset: 'celestial_starlight' });
    response = `ปรับให้แล้วคับพี่พีช! ย้ายไปมุมขวาบน ปรับเป็น Starlight พุ่งแรงขึ้น ลองกดพรีวิวดูได้เลยคับ ✨ (seek to ${targetTime}s)`;
    const seek = await mcpTools.trigger_preview_at(projectId, targetTime);
    return res.json({ reply: response, actions, seek });
  }
  if (lower.includes('ทอง') || lower.includes('starlight')) {
    await mcpTools.update_timeline_cue(projectId, timestamp||5, { preset: 'celestial_starlight', style: { color: '#ffd700', glowColor: '#ffaa00' } });
    response = 'จัดให้เป็น Celestial Starlight Tunnel สีทอง Obsidian + Gold แล้วคับพี่พีช 🌌';
    return res.json({ reply: response, actions });
  }
  if (lower.includes('เด้ง') || lower.includes('pop')) {
    await mcpTools.update_timeline_cue(projectId, timestamp||5, { preset: 'kinetic_pop', scale: 1.5 });
    response = 'เปลี่ยนเป็น Kinetic Pop & Snap เด้งตามสแนร์แล้วคับ 🥁';
    return res.json({ reply: response, actions });
  }

  response = `รับทราบคับพี่พีช: "${message}" - องศากำลังปรับให้... (demo parser, ต่อ LLM จริงได้ที่ /mcp/call)`;
  res.json({ reply: response, actions });
});


import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { mcpClient } from '../lib/mcpClient';

export function ChatPanel() {
  const { project, currentTime, setCurrentTime } = useProjectStore();
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState<{role:'user'|'ongsa', text:string}[]>([
    { role: 'ongsa', text: 'สวัสดีคับพี่พีช องศาพร้อมคับ พิมพ์สั่งได้เลย เช่น "ท่อนฮุก 01:24 ย้ายไปขวาบน ขอสีทองประกายดาว"' }
  ]);

  const send = async () => {
    if (!msg.trim() || !project) return;
    setHistory(h=>[...h, { role: 'user', text: msg }]);
    const res = await mcpClient.chat(msg, project.id, currentTime);
    setHistory(h=>[...h, { role: 'ongsa', text: res.reply }]);
    if (res.seek) setCurrentTime(res.seek.timestamp);
    // refresh project after update
    const updated = await mcpClient.getProjectState(project.id);
    if (updated) {
      // @ts-ignore update store via event
      window.dispatchEvent(new CustomEvent('project-updated', { detail: updated }));
    }
    setMsg('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] border-l border-white/10">
      <div className="p-2 text-xs font-bold bg-[#1a1a1a]">💬 แชทสดกับองศา (MCP)</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {history.map((h,i)=>(
          <div key={i} className={`text-[11px] p-2 rounded ${h.role==='user' ? 'bg-white/10 ml-6' : 'bg-yellow-500/10 border border-yellow-500/20 mr-6'}`}>
            <span className="font-bold">{h.role==='user'?'พี่พีช':'องศา'}: </span>{h.text}
          </div>
        ))}
      </div>
      <div className="p-2 flex gap-1">
        <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="พิมพ์สั่งองศา..." className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white" />
        <button onClick={send} className="bg-yellow-500 text-black px-3 py-1 rounded text-xs font-bold">ส่ง</button>
      </div>
      <div className="p-1 text-[8px] text-white/20">Tools: get_project_state, update_timeline_cue, set_background_transition, trigger_preview_at</div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { Timeline } from './components/Timeline';
import { PresetCatalog } from './components/PresetCatalog';
import { ChatPanel } from './components/ChatPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { BackgroundManager } from './components/BackgroundManager';
import { useProjectStore } from './stores/projectStore';
const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:4000';
export default function App() {
  const { setProject, project } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [isCloud, setIsCloud] = useState(false);
  useEffect(() => {
    setIsCloud(BACKEND_URL.includes('workers.dev'));
    fetch(`${BACKEND_URL}/api/projects`).then(r=>r.json()).then(data=>{ if (data[0]) setProject({ ...data[0], currentTime: 0, selectedCueId: null }); setLoading(false); }).catch(()=>setLoading(false));
    const handler = (e:any) => { const updated = e.detail; setProject({ ...updated, currentTime: useProjectStore.getState().currentTime, selectedCueId: useProjectStore.getState().selectedCueId }); };
    window.addEventListener('project-updated', handler);
    return () => window.removeEventListener('project-updated', handler);
  }, []);
  if (loading) return <div className="h-screen bg-black text-white flex items-center justify-center">โหลดสตูดิโอ...</div>;
  return (
    <div className="h-screen w-screen flex flex-col bg-[#050505] text-white overflow-hidden">
      <div className="h-10 flex items-center justify-between px-4 bg-[#0f0f0f] border-b border-white/10">
        <div className="font-bold text-sm">Lyrics Visualizer Pro Studio <span className={isCloud ? "text-green-400" : "text-yellow-400"}>● {isCloud ? "Cloud" : "Local"}</span></div>
        <div className="flex gap-2 text-[10px]">
          <span className="px-2 py-1 bg-white/5 rounded">Project: {project?.title}</span>
          <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">Backend: {isCloud ? "peich.workers.dev" : ":4000"} ✓</span>
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">MCP: /mcp ✓</span>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[260px] flex flex-col border-r border-white/10 bg-[#121212]"><PropertiesPanel /></div>
        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 relative"><CanvasStage /><div className="absolute top-2 left-2"><BackgroundManager /></div></div>
          <div className="h-[180px] border-t border-white/10"><Timeline /></div>
        </div>
        <div className="w-[320px] flex flex-col border-l border-white/10">
          <div className="flex-1 overflow-hidden"><PresetCatalog /></div>
          <div className="h-[300px] border-t border-white/10"><ChatPanel /></div>
        </div>
      </div>
    </div>
  );
}

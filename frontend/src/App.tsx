
import { useEffect, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { Timeline } from './components/Timeline';
import { PresetCatalog } from './components/PresetCatalog';
import { ChatPanel } from './components/ChatPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { BackgroundManager } from './components/BackgroundManager';
import { useProjectStore } from './stores/projectStore';

const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || 'https://lyrics-visualizer-pro-api.peich.workers.dev';

export default function App() {
  const { setProject, project } = useProjectStore();
  const [tab, setTab] = useState<'preset'|'chat'|'bg'>('preset');
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/projects`).then(r=>r.json()).then(d=>{ if(d[0]) setProject({...d[0], currentTime:0, selectedCueId:null}) })
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#080808] text-white">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 bg-[#111] border-b border-white/10">
        <b>Lyrics Visualizer Pro Studio <span className="text-green-400">● Cloud</span></b>
        <div className="text- opacity-60">Project: {project?.title} | {BACKEND_URL.includes('peich') ? 'peich.workers.dev ✓' : 'Local'}</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left - Properties */}
        <div className="w- bg-[#121212] border-r border-white/10 overflow-auto"><PropertiesPanel /></div>
        
        {/* Center - Canvas + Timeline */}
        <div className="flex-1 flex flex-col bg-black">
          <div className="flex-1 relative bg-[#050505] flex items-center justify-center">
            <CanvasStage />
          </div>
          <div className="h- border-t border-white/10 bg-[#0e0e0e]"><Timeline /></div>
        </div>

        {/* Right - Tabs instead of full catalog */}
        <div className={`${rightCollapsed ? 'w-' : 'w-'} transition-all bg-[#121212] border-l border-white/10 flex flex-col`}>
          <div className="flex items-center h-9 border-b border-white/10">
            {!rightCollapsed && (
              <>
                <button onClick={()=>setTab('preset')} className={`flex-1 h-full text-xs ${tab==='preset'?'bg-white/10':''}`}>Presets 19</button>
                <button onClick={()=>setTab('chat')} className={`flex-1 h-full text-xs ${tab==='chat'?'bg-white/10':''}`}>แชตองศา</button>
                <button onClick={()=>setTab('bg')} className={`flex-1 h-full text-xs ${tab==='bg'?'bg-white/10':''}`}>BG</button>
              </>
            )}
            <button onClick={()=>setRightCollapsed(!rightCollapsed)} className="w-10 h-full text-xs"> {rightCollapsed ? '◀' : '▶'} </button>
          </div>
          {!rightCollapsed && (
            <div className="flex-1 overflow-auto">
              {tab==='preset' && <PresetCatalog />}
              {tab==='chat' && <ChatPanel />}
              {tab==='bg' && <BackgroundManager />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
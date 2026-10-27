
import { useProjectStore } from '../stores/projectStore';

export function PropertiesPanel() {
  const { project, selectedCueId, updateCue, currentTime, setCurrentTime } = useProjectStore();
  if (!project) return null;
  const cue = project.lyrics.find(l=>l.id===selectedCueId);

  return (
    <div className="p-3 bg-[#121212] border-r border-white/10 h-full overflow-y-auto">
      <h3 className="text-xs font-bold mb-3">Properties & Camera</h3>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-white/50">Current Time</label>
          <input type="number" value={currentTime} onChange={e=>setCurrentTime(parseFloat(e.target.value))} step={0.1} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs" />
        </div>

        {cue ? (
          <>
            <div className="p-2 bg-white/5 rounded">
              <div className="text-[11px] font-bold truncate">{cue.text}</div>
              <div className="text-[9px] text-white/40">{cue.time}s → {cue.endTime}s | {cue.preset}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[9px]">X %</label><input type="range" min={0} max={100} value={cue.x} onChange={e=>updateCue(cue.id,{x: parseFloat(e.target.value)})} className="w-full" /></div>
              <div><label className="text-[9px]">Y %</label><input type="range" min={0} max={100} value={cue.y} onChange={e=>updateCue(cue.id,{y: parseFloat(e.target.value)})} className="w-full" /></div>
              <div><label className="text-[9px]">Scale</label><input type="range" min={0.2} max={3} step={0.1} value={cue.scale} onChange={e=>updateCue(cue.id,{scale: parseFloat(e.target.value)})} className="w-full" /></div>
              <div><label className="text-[9px]">Rotation</label><input type="range" min={-45} max={45} value={cue.rotation} onChange={e=>updateCue(cue.id,{rotation: parseFloat(e.target.value)})} className="w-full" /></div>
            </div>

            <div>
              <label className="text-[9px]">Fade Duration (ms)</label>
              <input type="range" min={0} max={2000} value={cue.camera?.fade || 300} onChange={e=>updateCue(cue.id,{camera:{...cue.camera, fade: parseInt(e.target.value)}})} className="w-full" />
            </div>

            <div>
              <label className="text-[9px]">Z-Depth (กล้องซูม)</label>
              <input type="range" min={-1000} max={1000} value={cue.camera?.z || 0} onChange={e=>updateCue(cue.id,{camera:{...cue.camera, z: parseInt(e.target.value)}})} className="w-full" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[9px]">Roll</label><input type="range" min={-30} max={30} value={cue.camera?.roll || 0} onChange={e=>updateCue(cue.id,{camera:{...cue.camera, roll: parseInt(e.target.value)}})} className="w-full" /></div>
              <div><label className="text-[9px]">Pitch</label><input type="range" min={-30} max={30} value={cue.camera?.pitch || 0} onChange={e=>updateCue(cue.id,{camera:{...cue.camera, pitch: parseInt(e.target.value)}})} className="w-full" /></div>
            </div>
          </>
        ) : (
          <div className="text-[11px] text-white/30">เลือกท่อนใน Timeline เพื่อปรับละเอียดระดับเฟรม</div>
        )}

        <div className="pt-2 border-t border-white/5">
          <div className="text-[10px] font-bold">Export Settings</div>
          <div className="text-[9px] text-white/40 mt-1">Resolution: 720p / 1080p / 4K</div>
          <div className="text-[9px] text-white/40">FPS: 30 / 60 | Ratio: 16:9, 9:16, 1:1</div>
          <div className="text-[9px] text-white/40">BG Looper: Seamless / Ping-Pong</div>
        </div>
      </div>
    </div>
  );
}

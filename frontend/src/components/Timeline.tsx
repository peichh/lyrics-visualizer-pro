
import { useProjectStore } from '../stores/projectStore';
import { presets } from '../presets/presets';

export function Timeline() {
  const { project, currentTime, setCurrentTime, setSelectedCueId, selectedCueId } = useProjectStore();
  if (!project) return null;

  const duration = project.duration || 180;

  return (
    <div className="bg-[#111] border-t border-white/10 p-2">
      <div className="flex gap-2 text-[11px] text-white/60 mb-2">
        <span>🎵 Audio Track</span><span className="opacity-30">|</span>
        <span>📝 Lyrics Track</span><span className="opacity-30">|</span>
        <span>🖼️ BG Layer 1,2,3</span><span className="opacity-30">|</span>
        <span>✨ Visualizer</span><span className="opacity-30">|</span>
        <span>🎬 Intro/Outro</span>
      </div>

      <div className="relative h-[110px] bg-[#0a0a0a] rounded overflow-hidden border border-white/5">
        {/* Time ruler */}
        <div className="absolute top-0 left-0 right-0 h-5 bg-white/5 flex text-[9px] text-white/30">
          {Array.from({length: 19}).map((_,i)=><div key={i} className="flex-1 border-l border-white/10 pl-1">{i*10}s</div>)}
        </div>

        {/* Playhead */}
        <div className="absolute top-0 bottom-0 w-[2px] bg-[#ffd700] z-20" style={{ left: `${(currentTime/duration)*100}%` }}>
          <div className="w-2 h-2 bg-[#ffd700] rounded-full -ml-[3px]" />
        </div>

        {/* Lyric cues */}
        <div className="absolute top-6 left-0 right-0 bottom-0">
          {project.lyrics.map(cue => {
            const left = (cue.time / duration) * 100;
            const width = ((cue.endTime - cue.time) / duration) * 100;
            const isSelected = selectedCueId === cue.id;
            return (
              <div
                key={cue.id}
                onClick={()=>setSelectedCueId(cue.id)}
                className={`absolute top-1 h-10 rounded text-[10px] px-2 flex items-center cursor-pointer border ${isSelected ? 'bg-yellow-500/30 border-yellow-400' : 'bg-white/10 border-white/10 hover:bg-white/20'}`}
                style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                title={`${cue.text} [${cue.preset}]`}
              >
                <span className="truncate">{cue.text}</span>
              </div>
            );
          })}
        </div>

        <input type="range" min={0} max={duration} step={0.05} value={currentTime}
          onChange={e=>setCurrentTime(parseFloat(e.target.value))}
          className="absolute bottom-0 w-full opacity-20 hover:opacity-100" />
      </div>

      <div className="flex gap-2 mt-2">
        {project.lyrics.slice(0,6).map(cue=>{
          const p = presets.find(x=>x.id===cue.preset);
          return <div key={cue.id} className="text-[9px] px-2 py-1 rounded bg-white/5 text-white/50">{cue.time.toFixed(1)}s - {p?.name}</div>
        })}
      </div>
    </div>
  );
}

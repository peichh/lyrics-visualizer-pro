
import { presets } from '../presets/presets';
import { useProjectStore } from '../stores/projectStore';

export function PresetCatalog() {
  const { project, selectedCueId, updateCue } = useProjectStore();
  return (
    <div className="p-3 bg-[#151515] h-full overflow-y-auto">
      <h3 className="text-sm font-bold mb-2">Preset Catalog (19 แบบ)</h3>
      <div className="grid grid-cols-1 gap-2">
        {presets.map(p=>(
          <button
            key={p.id}
            onClick={()=>{
              if (selectedCueId) updateCue(selectedCueId, { preset: p.id });
            }}
            className="text-left p-2 rounded bg-white/5 hover:bg-white/10 border border-white/5 hover:border-yellow-500/50 transition"
          >
            <div className="text-[12px] font-bold text-white">{p.name}</div>
            <div className="text-[10px] text-yellow-400/80">{p.nameTh} • {p.style}</div>
            <div className="text-[9px] text-white/40 mt-1">{p.description}</div>
            <div className="text-[8px] text-white/30 mt-1">เหมาะกับ: {p.genre}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-white/30">
        * เลือกท่อนใน Timeline ก่อน แล้วกด Preset เพื่อเปลี่ยนเฉพาะท่อนนั้น (Per-line Styling)
      </div>
    </div>
  );
}

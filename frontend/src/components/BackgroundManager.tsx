
export function BackgroundManager() {
  return (
    <div className="p-2 bg-[#111] border border-white/5 rounded">
      <div className="text-[10px] font-bold mb-1">Background Layers (Smart Looper)</div>
      <div className="grid grid-cols-3 gap-1">
        <div className="bg-white/5 p-1 rounded text-[9px]">Layer 1: Obsidian Gold (Seamless Loop)</div>
        <div className="bg-white/5 p-1 rounded text-[9px]">Layer 2: Particle Field</div>
        <div className="bg-white/5 p-1 rounded text-[9px]">Layer 3: Vignette + Scanline</div>
      </div>
      <div className="text-[8px] text-white/30 mt-1">ถ้าวิดีโอ 15วิ แต่เพลง 3นาที ระบบจะ Loop อัตโนมัติ</div>
    </div>
  );
}

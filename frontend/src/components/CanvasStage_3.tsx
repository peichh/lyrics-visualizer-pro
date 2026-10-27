
import { Stage, Layer, Text, Group } from 'react-konva';
import { useProjectStore } from '../stores/projectStore';
import { useEffect, useState } from 'react';

export function CanvasStage() {
  const { project, currentTime, selectedCueId, setSelectedCueId, updateCue } = useProjectStore();
  const [dimensions, setDimensions] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const el = document.getElementById('canvas-container');
    if (el) setDimensions({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  if (!project) return <div className="flex items-center justify-center h-full text-white/50">โหลดโปรเจกต์...</div>;

  const visibleCues = project.lyrics.filter(l => currentTime >= l.time && currentTime <= l.endTime);

  return (
    <div id="canvas-container" className="w-full h-full bg-black relative overflow-hidden">
      <Stage width={dimensions.w} height={dimensions.h}>
        <Layer>
          {/* Background */}
          <Group>
            {/* Obsidian Gold Gradient for demo */}
            <Text text="" />
          </Group>
          {visibleCues.map(cue => (
            <Group
              key={cue.id}
              x={(cue.x/100)*dimensions.w}
              y={(cue.y/100)*dimensions.h}
              scaleX={cue.scale}
              scaleY={cue.scale}
              rotation={cue.rotation}
              draggable
              onClick={() => setSelectedCueId(cue.id)}
              onDragEnd={(e) => {
                const newX = (e.target.x() / dimensions.w) * 100;
                const newY = (e.target.y() / dimensions.h) * 100;
                updateCue(cue.id, { x: newX, y: newY });
              }}
            >
              <Text
                text={cue.text}
                fontSize={cue.style.fontSize || 48}
                fontFamily="Kanit"
                fill={cue.style.color}
                shadowEnabled
                shadowColor={cue.style.glowColor || '#ffd700'}
                shadowBlur={selectedCueId===cue.id ? 20 : 10}
                align="center"
              />
            </Group>
          ))}
        </Layer>
      </Stage>
      <div className="absolute bottom-2 left-2 text-[10px] text-white/40">
        Interactive Canvas - คลิกที่คำเพื่อเลือก ลากเพื่อย้าย | Z-Depth: {project.camera?.[0]?.z || 0}
      </div>
    </div>
  );
}

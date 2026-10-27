
export type LyricCue = {
  id: string; time: number; endTime: number; text: string;
  x: number; y: number; scale: number; rotation: number;
  preset: string;
  style: { color: string; glowColor?: string; fontSize?: number; fontWeight?: string };
  camera?: { z: number; roll: number; pitch: number; fade: number };
};

export type BackgroundLayer = {
  id: string; type: 'gradient'|'video'|'image'|'gif'; value: string;
  layer: 1|2|3; loop: 'seamless'|'pingpong'|'random'; start: number; duration: number;
};

export type ProjectState = {
  id: string; title: string; artist: string; audioUrl: string; duration: number;
  lyrics: LyricCue[]; backgrounds: BackgroundLayer[]; camera: any[]; visualizer: any;
  currentTime: number; selectedCueId: string|null;
};

export type Preset = {
  id: string; name: string; nameTh: string; style: string; genre: string;
  description: string; config: any;
};

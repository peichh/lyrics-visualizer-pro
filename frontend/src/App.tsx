import { CloudPanel } from "./CloudPanel";
import { parseTimestampedLyrics } from "./lyrics-parser.mjs";
import { drawGrain, drawLyricFrame } from './lyric-renderer';
import { prepareWhisperAudio } from './audioWav';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload, FileText, Play, Pause, Sparkles, Download, Music2, Image as ImageIcon, Film,
  Type, Layers, Save, Undo2, Redo2, Plus, Trash2, Lock, Unlock, Eye, EyeOff,
  ChevronDown, ChevronUp, Wand2, Scissors, MonitorPlay, Clock3, Check,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Crosshair, FileDown, CircleAlert, Timer, RotateCcw, Move, Repeat,
} from "lucide-react";

type WordTiming = { text: string; start: number; end: number };
type Lyric = { id: string; time: number; text: string; wordTimings?: WordTiming[] };
type BgKind = "image" | "video" | "gif";
type LoopMode = "normal" | "seamless" | "reverse";
type BgItem = {
  id: string; url: string; kind: BgKind; name: string;
  duration: number; loop: boolean; loopMode: LoopMode;
  trimStart: number; trimEnd: number; mediaDur: number;
  blur: number; brightness: number; contrast: number;
  tint: string; tintOpacity: number; fit: "cover" | "contain" | "stretch";
};
type AnimName = "Karaoke Fill" | "Typewriter + Cursor" | "Floating Handwritten" | "Glitch & Scale" | "Center Fade" | "Word-by-Word Pop" | "Bounce Pop" | "Wave Flow" | "3D Flip" | "Neon Flicker" | "Blur Smoke" | "Kinetic Slide" | "Rubber Band" | "Glitch RGB";
type CurveMode = "off" | "arc-top" | "arc-bottom" | "circle";
type VAlign = "top" | "center" | "bottom";
type TextWidthMode = "auto" | "85" | "80" | "full";
export type TextStyle = {
  fontFamily: string; fontSize: number; scale: number; weight: number; italic: boolean;
  letterSpacing: number; lineHeight: number; color: string; opacity: number;
  boxColor: string; boxOpacity: number; boxPadding: number; boxRadius: number;
  strokeOn: boolean; strokeColor: string; strokeWidth: number;
  shadowOn: boolean; shadowX: number; shadowY: number; shadowBlur: number; shadowColor: string;
  glowOn: boolean; glowIntensity: number; glowColor: string;
  align: "left" | "center" | "right"; vAlign: VAlign; textWidth: TextWidthMode;
  x: number; y: number; locked: boolean;
  animation: AnimName; animSpeed: number; fadeIn: number; fadeOut: number;
  backdropBlur: number; grain: boolean; chroma: boolean; uppercase: boolean;
  curve: number; curveMode: CurveMode; arcRadius: number; rotate: number; hearts: boolean;
};
type Preset = { name: string; artist: string; dot: string; style: Partial<TextStyle> };

const DEFAULT_STYLE: TextStyle = {
  fontFamily: "Inter", fontSize: 48, scale: 1, weight: 700, italic: false,
  letterSpacing: 0, lineHeight: 1.25, color: "#FFFFFF", opacity: 1,
  boxColor: "#000000", boxOpacity: 0, boxPadding: 16, boxRadius: 16,
  strokeOn: false, strokeColor: "#000000", strokeWidth: 2,
  shadowOn: true, shadowX: 0, shadowY: 3, shadowBlur: 12, shadowColor: "#000000",
  glowOn: false, glowIntensity: 18, glowColor: "#EC4899",
  align: "center", vAlign: "center", textWidth: "85", x: 50, y: 50, locked: false,
  animation: "Karaoke Fill", animSpeed: 1, fadeIn: 0.4, fadeOut: 0.4,
  backdropBlur: 0, grain: false, chroma: false, uppercase: false,
  curve: 0, curveMode: "off", arcRadius: 260, rotate: 0, hearts: false,
};

const FONT_GROUPS: { group: string; fonts: string[] }[] = [
  { group: "Thai · ฟอนต์ไทย", fonts: ["Prompt","Kanit","Mitr","Sarabun","Noto Sans Thai","Noto Serif Thai","Chonburi"] },
  { group: "Sans", fonts: ["Inter","Montserrat","Poppins","Oswald","Raleway","Work Sans","Syne","Space Grotesk"] },
  { group: "Serif", fonts: ["Playfair Display","Cormorant Garamond","Instrument Serif","DM Serif Display","Lora","Merriweather"] },
  { group: "Display", fonts: ["Bebas Neue","Anton","Lobster"] },
  { group: "Mono", fonts: ["Space Mono","JetBrains Mono"] },
  { group: "Handwritten", fonts: ["Caveat","Dancing Script","Permanent Marker","Pacifico"] },
];
const FONT_LIST = FONT_GROUPS.flatMap(g=>g.fonts);

const PRESETS: Preset[] = [
  { name: "Happier Than Ever", artist: "Billie Eilish", dot: "#E8E4D8", style: { fontFamily: "Playfair Display", fontSize: 26, weight: 500, letterSpacing: 3, color: "#F5F1E6", align: "left", x: 12, y: 82, animation: "Center Fade" } },
  { name: "All Too Well", artist: "Taylor Swift", dot: "#D8C9A3", style: { fontFamily: "Space Mono", fontSize: 24, weight: 400, color: "#F3EAD3", align: "left", x: 10, y: 78, animation: "Typewriter + Cursor", grain: true } },
  { name: "Blinding Lights", artist: "The Weeknd", dot: "#FF2E88", style: { fontFamily: "Bebas Neue", fontSize: 72, weight: 700, color: "#FF5CAB", align: "center", x: 50, y: 50, animation: "Glitch & Scale", glowOn: true, glowColor: "#FF2E88", glowIntensity: 26, uppercase: true } },
  { name: "drivers license", artist: "Olivia Rodrigo", dot: "#FFFFFF", style: { fontFamily: "Caveat", fontSize: 40, weight: 600, color: "#FFFFFF", align: "center", x: 50, y: 84, animation: "Floating Handwritten" } },
  { name: "Video Games", artist: "Lana Del Rey", dot: "#C9A86A", style: { fontFamily: "DM Serif Display", fontSize: 40, italic: true, weight: 500, color: "#F7EFDD", align: "center", x: 50, y: 50, animation: "Center Fade", backdropBlur: 6 } },
  { name: "FE!N", artist: "Travis Scott", dot: "#FF4D00", style: { fontFamily: "Anton", fontSize: 84, weight: 800, color: "#FFFFFF", align: "center", x: 50, y: 50, animation: "Glitch & Scale", uppercase: true, letterSpacing: 1 } },
  { name: "Hello", artist: "Adele", dot: "#E5E5E5", style: { fontFamily: "Playfair Display", fontSize: 46, weight: 600, color: "#F2F2F2", align: "center", x: 50, y: 55, animation: "Center Fade" } },
  { name: "White Ferrari", artist: "Frank Ocean", dot: "#B8B8B8", style: { fontFamily: "Space Grotesk", fontSize: 18, weight: 500, color: "#EDEDED", align: "left", x: 8, y: 88, animation: "Center Fade", shadowOn: false } },
  { name: "Levitating", artist: "Dua Lipa", dot: "#FFD166", style: { fontFamily: "Poppins", fontSize: 48, weight: 800, color: "#FFD166", align: "center", x: 50, y: 55, animation: "Word-by-Word Pop", glowOn: true, glowColor: "#FF9E00", glowIntensity: 14 } },
  { name: "Do I Wanna Know?", artist: "Arctic Monkeys", dot: "#7FB2D9", style: { fontFamily: "Permanent Marker", fontSize: 44, weight: 700, color: "#EAF2FA", align: "center", x: 50, y: 78, animation: "Karaoke Fill", glowColor: "#7FB2D9" } },
  { name: "Love wins all", artist: "IU", dot: "#FDA4AF", style: { fontFamily: "Kanit", fontSize: 36, weight: 600, color: "#FFF1F2", align: "center", x: 50, y: 80, animation: "Floating Handwritten", glowOn: true, glowColor: "#FB7185", glowIntensity: 12 } },
  { name: "The Less I Know", artist: "Tame Impala", dot: "#22D3EE", style: { fontFamily: "Space Grotesk", fontSize: 42, weight: 700, color: "#F0FDFA", align: "center", x: 50, y: 50, animation: "Word-by-Word Pop", chroma: true, glowOn: true, glowColor: "#D946EF", glowIntensity: 16 } },
  { name: "Sweetener ☁️", artist: "Ariana Grande", dot: "#FBCFE8", style: { fontFamily: "Pacifico", fontSize: 36, weight: 600, letterSpacing: 3, color: "#FFFFFF", align: "center", x: 50, y: 80, animation: "Floating Handwritten", glowOn: true, glowColor: "#F9A8D4", glowIntensity: 20, hearts: true } },
  { name: "How You Like That 🖤💗", artist: "BLACKPINK", dot: "#EC4899", style: { fontFamily: "Anton", fontSize: 84, weight: 800, letterSpacing: 2, color: "#FFFFFF", align: "center", x: 50, y: 50, animation: "Glitch & Scale", uppercase: true, textWidth: "full", strokeOn: true, strokeColor: "#EC4899", strokeWidth: 3, shadowOn: true, shadowX: 0, shadowY: 5, shadowBlur: 0, shadowColor: "#000000", glowOn: true, glowColor: "#EC4899", glowIntensity: 14 } },
  { name: "Say So 🐱", artist: "Doja Cat", dot: "#FDE047", style: { fontFamily: "Space Grotesk", fontSize: 56, weight: 800, italic: true, color: "#FDE047", align: "center", x: 50, y: 55, animation: "Bounce Pop", rotate: -2, strokeOn: true, strokeColor: "#EC4899", strokeWidth: 1.5, glowOn: true, glowColor: "#22D3EE", glowIntensity: 16 } },
];

const THAI_PRESETS: Preset[] = [
  { name: "4EVE", artist: "T-Pop · Pop สดใส", dot: "#EC4899", style: { fontFamily: "Prompt", fontSize: 56, weight: 800, color: "#FFFFFF", align: "center", x: 50, y: 50, animation: "Word-by-Word Pop", glowOn: true, glowColor: "#EC4899", glowIntensity: 18, textWidth: "80" } },
  { name: "Jeff Satur", artist: "T-Pop · เศร้าละมุน", dot: "#E7E5E4", style: { fontFamily: "Noto Serif Thai", fontSize: 40, weight: 500, italic: true, color: "#FAFAF9", align: "center", x: 50, y: 78, animation: "Center Fade", glowOn: true, glowColor: "#FFFFFF", glowIntensity: 10 } },
  { name: "Bowkylion", artist: "Indie Soul · อินดี้โซล", dot: "#D6C7A8", style: { fontFamily: "Mitr", fontSize: 44, weight: 600, italic: true, color: "#EFE6D2", align: "left", x: 10, y: 72, animation: "Floating Handwritten" } },
  { name: "PP Krit × Billkin", artist: "Romantic Pastel · โรแมนติก", dot: "#F9A8D4", style: { fontFamily: "Noto Serif Thai", fontSize: 46, weight: 600, color: "#FFF1F2", align: "center", x: 50, y: 50, animation: "Karaoke Fill", glowOn: true, glowColor: "#F9A8D4", glowIntensity: 14 } },
  { name: "Ink Waruntorn", artist: "Cute Pop · น่ารักสดใส", dot: "#FDE047", style: { fontFamily: "Kanit", fontSize: 52, weight: 700, color: "#FEF9C3", align: "center", x: 50, y: 55, animation: "Word-by-Word Pop", glowOn: true, glowColor: "#FACC15", glowIntensity: 12 } },
  { name: "Phum Viphurit", artist: "Indie Folk · อินดี้โฟล์ก", dot: "#F5F5F4", style: { fontFamily: "Space Mono", fontSize: 26, weight: 400, color: "#F5F5F4", align: "left", x: 8, y: 86, animation: "Typewriter + Cursor", shadowOn: false } },
  { name: "ลูกทุ่งโมเดิร์น", artist: "Luk Thung Modern · ทองอร่าม", dot: "#F59E0B", style: { fontFamily: "Noto Serif Thai", fontSize: 64, weight: 700, color: "#FEF3C7", align: "center", x: 50, y: 50, animation: "Center Fade", glowOn: true, glowColor: "#F59E0B", glowIntensity: 22 } },
  { name: "ลูกทุ่งวินเทจ", artist: "Luk Thung Vintage · ยุคทอง", dot: "#DC2626", style: { fontFamily: "Chonburi", fontSize: 54, weight: 700, color: "#FEE2E2", align: "center", x: 50, y: 50, animation: "Center Fade", grain: true, glowOn: true, glowColor: "#DC2626", glowIntensity: 12 } },
  { name: "หมอลำ นีออน", artist: "Mor Lam Neon · หมอลำซิ่ง", dot: "#22C55E", style: { fontFamily: "Kanit", fontSize: 68, weight: 800, color: "#FFFFFF", align: "center", x: 50, y: 50, animation: "Glitch & Scale", chroma: true, glowOn: true, glowColor: "#EC4899", glowIntensity: 24, uppercase: false } },
  { name: "T-Pop Dance", artist: "BUS / LYKN · เต้นกระจาย", dot: "#FFFFFF", style: { fontFamily: "Prompt", fontSize: 76, weight: 800, color: "#FFFFFF", align: "center", x: 50, y: 50, animation: "Word-by-Word Pop", uppercase: true, strokeOn: true, strokeColor: "#8B5CF6", strokeWidth: 1.5, glowOn: true, glowColor: "#8B5CF6", glowIntensity: 16 } },
];

const ANIMATIONS: AnimName[] = ["Karaoke Fill", "Typewriter + Cursor", "Floating Handwritten", "Glitch & Scale", "Center Fade", "Word-by-Word Pop", "Bounce Pop", "Wave Flow", "3D Flip", "Neon Flicker", "Blur Smoke", "Kinetic Slide", "Rubber Band", "Glitch RGB"];
const ASPECTS = ["16:9", "9:16", "1:1", "4:5"] as const;
type Aspect = (typeof ASPECTS)[number];
const ASPECT_WH: Record<Aspect, [number, number]> = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350] };
const ASPECT_BASE: Record<Aspect, [number, number]> = { "16:9": [1280, 720], "9:16": [720, 1280], "1:1": [960, 960], "4:5": [960, 1200] };

const DEMO_LRC = `[00:00.00] neon lights in the rain
[00:03.00] your shadow on the glass
[00:06.00] every city holds a name
[00:09.00] but none of them will last
[00:12.00] we were running through the blue
[00:15.00] with the skyline in our shoes
[00:18.00] if the morning takes you home
[00:21.00] leave the melody with me
[00:24.00] hold the last note, let it glow
[00:27.00] till the neon fades to snow`;

let uid = 0;
const nid = (p: string) => `${p}${++uid}-${Date.now().toString(36)}`;

function parseLyrics(raw: string): Lyric[] {
  return parseTimestampedLyrics(raw).map((line: { time: number; text: string }) => ({ ...line, id: nid("l") }));
}

function fmt(t: number) { if (!isFinite(t) || t < 0) t = 0; const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; }
function fmtFull(t: number) { const cs = Math.floor((t % 1) * 100); return `${fmt(t)}.${String(cs).padStart(2, "0")}`; }
function parseTimeInput(v: string, fallback: number) { const p = v.split(":").map((x) => parseFloat(x)); if (p.some(isNaN)) return fallback; if (p.length === 2) return p[0] * 60 + p[1]; if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]; return p[0] || fallback; }
function hexA(hex: string, a: number) { const h = hex.replace("#", ""); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return `rgba(${r},${g},${b},${a})`; }

async function api(action: string, args: Record<string, unknown>) {
  const key = `lv-studio:${String(args.collection)}`;
  const records = JSON.parse(localStorage.getItem(key) || '[]');
  if (action === 'records.list') return { records: records.slice(0, Number(args.limit) || records.length) };
  if (action === 'records.create') {
    const record = { id: crypto.randomUUID(), value: args.value };
    records.unshift(record);
    localStorage.setItem(key, JSON.stringify(records));
    return record;
  }
  if (action === 'records.replace') {
    const index = records.findIndex((record: {id: string}) => record.id === args.id);
    if (index < 0) throw new Error('Project not found');
    records[index].value = args.value;
    localStorage.setItem(key, JSON.stringify(records));
    return records[index];
  }
  throw new Error('Unsupported storage operation');
}

function MediaLayer({ item, active, fade, registerRef }: { item: BgItem; active: boolean; fade: number; registerRef: (id: string, el: HTMLElement | null) => void }) {
  const vA = useRef<HTMLVideoElement>(null);
  const vB = useRef<HTMLVideoElement>(null);
  const [front, setFront] = useState<"A" | "B">("A");
  const [xfade, setXfade] = useState(0);
  const dirRef = useRef(1);
  const filter = `blur(${item.blur}px) brightness(${item.brightness}%) contrast(${item.contrast}%)`;
  const fitCls = item.fit === "cover" ? "object-cover" : item.fit === "contain" ? "object-contain" : "object-fill";
  useEffect(() => {
    if (item.kind !== "video") return;
    [vA.current, vB.current].forEach((v) => { if (!v) return; if (active) { v.play().catch(() => {}); } else v.pause(); });
  }, [active, item.kind]);
  useEffect(() => {
    if (item.kind !== "video") return;
    let raf = 0;
    const tick = () => {
      const a = vA.current, b = vB.current;
      const main = front === "A" ? a : b;
      const other = front === "A" ? b : a;
      if (main && active) {
        const end = item.trimEnd > 0 ? item.trimEnd : main.duration || 0;
        const start = item.trimStart || 0;
        if (item.loopMode === "reverse" && item.loop) {
          if (dirRef.current === 1 && main.currentTime >= end - 0.05) dirRef.current = -1;
          if (dirRef.current === -1) { main.currentTime = Math.max(start, main.currentTime - 1 / 30); if (main.currentTime <= start + 0.05) dirRef.current = 1; }
        } else if (item.loopMode === "seamless" && item.loop && other && end > 0) {
          const remain = end - main.currentTime;
          if (remain <= fade && remain > 0) {
            if (other.paused || other.currentTime < start) { try { other.currentTime = start; } catch { /* noop */ } other.play().catch(() => {}); }
            setXfade(1 - remain / fade);
          } else if (remain <= 0.02) { try { main.currentTime = start; } catch { /* noop */ } setFront(front === "A" ? "B" : "A"); setXfade(0); }
        } else if (end > 0 && main.currentTime >= end) {
          if (item.loop) { try { main.currentTime = start; } catch { /* noop */ } } else main.pause();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [item, active, front, fade]);
  if (item.kind === "video") {
    const common = "absolute inset-0 h-full w-full";
    const styleA: React.CSSProperties = { filter, opacity: front === "A" ? 1 : xfade, zIndex: front === "A" ? 1 : 2 };
    const styleB: React.CSSProperties = { filter, opacity: front === "B" ? 1 : xfade, zIndex: front === "B" ? 1 : 2 };
    return (<>
      <video ref={(el) => { vA.current = el; registerRef(item.id + "A", el); }} src={item.url} muted playsInline loop={item.loop && item.loopMode === "normal"} className={`${common} ${fitCls}`} style={styleA} onLoadedMetadata={(e) => { if (item.trimStart) e.currentTarget.currentTime = item.trimStart; }} />
      <video ref={(el) => { vB.current = el; registerRef(item.id + "B", el); }} src={item.url} muted playsInline className={`${common} ${fitCls}`} style={styleB} />
      {item.tintOpacity > 0 && <div className="absolute inset-0 z-[3]" style={{ background: item.tint, opacity: item.tintOpacity }} />}
    </>);
  }
  return (<>
    <img ref={(el) => registerRef(item.id, el)} src={item.url} alt={item.name} className="absolute inset-0 h-full w-full" style={{ filter, objectFit: item.fit === "stretch" ? "fill" : item.fit }} draggable={false} />
    {item.tintOpacity > 0 && <div className="absolute inset-0" style={{ background: item.tint, opacity: item.tintOpacity }} />}
  </>);
}

export default function App() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [lyricSource, setLyricSource] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [backgrounds, setBackgrounds] = useState<BgItem[]>([]);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [ts, setTs] = useState<TextStyle>(DEFAULT_STYLE);
  const [aspect, setAspect] = useState<Aspect>("16:9");
  const [tab, setTab] = useState<"text" | "background" | "presets" | "cloud">("text");
  const [safeArea, setSafeArea] = useState(false);
  const [loopPreview, setLoopPreview] = useState(true);
  const [bgFade, setBgFade] = useState(0.8);
  const [seqMode, setSeqMode] = useState<"time" | "lyrics">("time");
  const [dragging, setDragging] = useState(false);
  const [textSelected, setTextSelected] = useState(true);
  const [snapX, setSnapX] = useState(false);
  const [snapY, setSnapY] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const [hoverFont, setHoverFont] = useState<string | null>(null);
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [notice, setNotice] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [converting, setConverting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [exportQuality, setExportQuality] = useState<"1080p" | "720p">("1080p");
  const [dragOver, setDragOver] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRefs = useRef<Map<string, HTMLElement>>(new Map());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const exportStopRef = useRef<(() => void) | null>(null);
  const historyRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const [, setHistTick] = useState(0);

  const hasAudio = !!audioUrl;
  const totalDur = useMemo(() => { if (duration > 0) return duration; return lyrics.length ? lyrics[lyrics.length - 1].time + 4 : 30; }, [duration, lyrics]);
  const activeIdx = useMemo(() => { let idx = -1; lyrics.forEach((l, i) => { if (currentTime >= l.time) idx = i; }); return idx; }, [currentTime, lyrics]);
  const activeLyric = activeIdx >= 0 ? lyrics[activeIdx] : null;
  const segStart = activeLyric ? activeLyric.time : 0;
  const segEnd = activeIdx >= 0 && lyrics[activeIdx + 1] ? lyrics[activeIdx + 1].time : totalDur;
  const segP = Math.min(1, Math.max(0, (currentTime - segStart) / Math.max(0.1, segEnd - segStart)));
  const animP = Math.min(1, segP * ts.animSpeed);

  const clipStarts = useMemo(() => {
    const starts: number[] = []; let acc = 0;
    backgrounds.forEach((b) => { starts.push(acc); const len = b.kind === "image" || b.kind === "gif" ? b.duration : Math.max(1, (b.trimEnd > 0 ? b.trimEnd : b.mediaDur || b.duration) - b.trimStart); acc += len; });
    return { starts, total: acc };
  }, [backgrounds]);
  const activeBgIdx = useMemo(() => {
    if (!backgrounds.length) return -1;
    if (seqMode === "lyrics" && lyrics.length) return Math.min(backgrounds.length - 1, Math.max(0, activeIdx) % backgrounds.length);
    const total = clipStarts.total || 1; let t = currentTime; if (loopPreview) t = t % total;
    for (let i = backgrounds.length - 1; i >= 0; i--) if (t >= clipStarts.starts[i]) return i;
    return 0;
  }, [backgrounds, clipStarts, currentTime, loopPreview, seqMode, lyrics.length, activeIdx]);
  const prevBgIdx = activeBgIdx > 0 ? activeBgIdx - 1 : (loopPreview && backgrounds.length > 1 ? backgrounds.length - 1 : -1);
  const intoClip = seqMode === "time" && activeBgIdx >= 0 ? (loopPreview ? currentTime % (clipStarts.total || 1) : currentTime) - clipStarts.starts[activeBgIdx] : 99;
  const showPrev = prevBgIdx >= 0 && intoClip < bgFade && backgrounds.length > 1 && seqMode === "time";
  const prevOpacity = showPrev ? Math.max(0, 1 - intoClip / Math.max(0.05, bgFade)) : 0;

  const snapshot = useCallback(() => JSON.stringify({ lyrics, ts }), [lyrics, ts]);
  const pushHistory = useCallback(() => { historyRef.current.push(snapshot()); if (historyRef.current.length > 60) historyRef.current.shift(); futureRef.current = []; setHistTick((n) => n + 1); }, [snapshot]);
  const applySnapshot = (s: string) => { try { const v = JSON.parse(s); if (Array.isArray(v.lyrics)) setLyrics(v.lyrics); if (v.ts) setTs({ ...DEFAULT_STYLE, ...v.ts }); } catch { /* noop */ } };
  const undo = useCallback(() => { const prev = historyRef.current.pop(); if (!prev) return; futureRef.current.push(snapshot()); applySnapshot(prev); setHistTick((n) => n + 1); }, [snapshot]);
  const redo = useCallback(() => { const next = futureRef.current.pop(); if (!next) return; historyRef.current.push(snapshot()); applySnapshot(next); setHistTick((n) => n + 1); }, [snapshot]);

  const saveProject = useCallback(async (silent = false) => {
    setSaveState("saving");
    const value = { title: "Lyrics Visualizer Project", ts, aspect, bgFade, seqMode, loopPreview, lyrics: lyrics.map((l) => ({ time: l.time, text: l.text })), updated: new Date().toISOString() };
    try {
      if (projectId) { await api("records.replace", { collection: "studio_projects", id: projectId, value }); }
      else { const rec = await api("records.create", { collection: "studio_projects", value, idempotency_key: `project-${value.updated}` }); if (rec?.id) setProjectId(rec.id); }
      setSaveState("saved"); if (!silent) setNotice("Saved in this browser · บันทึกเนื้อเพลงและการตั้งค่าในเบราว์เซอร์นี้แล้ว (ไฟล์เพลงและพื้นหลังต้องเลือกใหม่)");
    } catch { setSaveState("offline"); if (!silent) setNotice("Cloud save unavailable in this preview — work stays in this session. · บันทึกออนไลน์ไม่พร้อมในพรีวิวนี้"); }
  }, [ts, aspect, bgFade, seqMode, loopPreview, lyrics, projectId]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api("records.list", { collection: "studio_projects", limit: 1 });
        const rec = data?.records?.[0];
        if (rec?.value) {
          const v = rec.value; setProjectId(rec.id);
          if (v.ts) setTs({ ...DEFAULT_STYLE, ...v.ts });
          if (v.aspect) setAspect(v.aspect);
          if (typeof v.bgFade === "number") setBgFade(v.bgFade);
          if (v.seqMode) setSeqMode(v.seqMode);
          if (Array.isArray(v.lyrics) && v.lyrics.length) { setLyrics(v.lyrics.map((l: { time: number; text: string }) => ({ id: nid("l"), time: l.time, text: l.text }))); setLyricSource("Restored project"); }
          setSaveState("saved");
        }
        const cp = await api("records.list", { collection: "custom_presets", limit: 50 });
        if (Array.isArray(cp?.records)) setCustomPresets(cp.records.map((r: { value: Preset }) => r.value).filter((p: Preset) => p && p.name && p.style));
      } catch { setSaveState("offline"); }
    })();
  }, []);
  useEffect(() => {
    if (!lyrics.length && projectId === null) return;
    const t = setTimeout(() => { void saveProject(true); }, 1800);
    return () => clearTimeout(t);
  }, [ts, lyrics, aspect]);

  const saveCustomPreset = async () => {
    const p: Preset = { name: `My Preset ${customPresets.length + 1}`, artist: "Custom · ของฉัน", dot: ts.color, style: { ...ts } };
    setCustomPresets((prev) => [p, ...prev]);
    try { await api("records.create", { collection: "custom_presets", value: p, idempotency_key: `preset-${Date.now()}` }); setNotice(`Saved "${p.name}" to your presets.`); }
    catch { setNotice("Preset kept for this session (cloud unavailable)."); }
  };

  const onAudio = (file: File) => { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioFile(file); setAudioUrl(URL.createObjectURL(file)); setAudioName(file.name); setNotice(`Audio loaded: ${file.name} · โหลดเพลงแล้ว`); };
  const transcribeAudio = async () => {
    if (!audioFile) { setNotice('เพิ่มไฟล์เพลงก่อนใช้ Whisper · Upload a song first'); return; }
    const key = localStorage.getItem('lyrics-studio-account-key');
    if (!key) { setTab('cloud'); setNotice('สร้างบัญชีในแท็บ Cloud · AI ก่อน แล้วกลับมากด Whisper อีกครั้ง'); return; }
    setTranscribing(true);
    try {
      setNotice('กำลังเตรียมเสียงเป็นโมโน 16 kHz เพื่อส่งให้ Whisper…');
      const prepared = await prepareWhisperAudio(audioFile);
      const form = new FormData(); form.append('audio', prepared.blob, 'audio-16khz-mono.wav');
      const apiOrigin = import.meta.env.VITE_STUDIO_API_URL || import.meta.env.VITE_BACKEND_URL || 'https://lyrics-studio-multitenant-preview.peich.workers.dev';
      setNotice('Whisper กำลังฟังเพลงและจับเวลาแต่ละคำ…');
      const response = await fetch(`${apiOrigin.replace(/\/$/, '')}/api/transcribe`, { method: 'POST', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15 * 60 * 1000), headers: { Authorization: `Bearer ${key}` }, body: form });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || `Whisper request failed (${response.status})`);
      if (!Array.isArray(result?.words) || !result.words.length) throw new Error('Whisper ไม่ส่งเวลาแยกระดับคำกลับมา');
      const words: WordTiming[] = result.words.map((word: { text?: unknown; start?: unknown; end?: unknown }) => ({ text: String(word.text || ''), start: Number(word.start), end: Number(word.end) })).filter((word: WordTiming) => word.text && Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start).sort((a: WordTiming, b: WordTiming) => a.start - b.start);
      const groups: WordTiming[][] = [];
      for (const word of words) {
        const group = groups[groups.length - 1];
        const currentText = group?.map(item => item.text).join('') || '';
        const gap = group ? word.start - group[group.length - 1].end : 0;
        const boundary = !!group && (/[.!?。？！]$/.test(currentText.trim()) || gap > 0.55 || group.length >= 6 || currentText.length > 30);
        if (!group || boundary) groups.push([word]); else group.push(word);
      }
      const cues: Lyric[] = groups.map(group => ({ id: nid('l'), time: group[0].start, text: group.map(word => word.text).join('').trim(), wordTimings: group }));
      pushHistory(); setLyrics(cues); setLyricSource(`${audioFile.name} · Whisper word timing`);
      setNotice(`Whisper จับเวลา ${words.length} คำ ได้ ${cues.length} ท่อน · ตรวจและแก้เวลาได้ก่อนส่งออก`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Whisper ทำงานไม่สำเร็จ');
    } finally { setTranscribing(false); }
  };
  const onLyricsFile = async (file: File) => {
    const text = await file.text(); const parsed = parseLyrics(text);
    if (!parsed.length) { setNotice("No timestamped lines found. Try LRC/SRT, or paste lyrics and auto-timestamp. · ไม่พบเนื้อเพลงที่มีเวลา"); return; }
    pushHistory(); setLyrics(parsed); setLyricSource(file.name); setNotice(`Parsed ${parsed.length} lines from ${file.name} · อ่านได้ ${parsed.length} บรรทัด`);
  };
  const onBackgrounds = (files: FileList | File[]) => {
    const items: BgItem[] = [];
    Array.from(files).forEach((f) => {
      const url = URL.createObjectURL(f);
      const kind: BgKind = f.type === "image/gif" ? "gif" : f.type.startsWith("video") ? "video" : "image";
      const item: BgItem = { id: nid("bg"), url, kind, name: f.name, duration: 5, loop: true, loopMode: "seamless", trimStart: 0, trimEnd: 0, mediaDur: 0, blur: 0, brightness: 100, contrast: 100, tint: "#8B5CF6", tintOpacity: 0, fit: "cover" };
      items.push(item);
      if (kind === "video") { const v = document.createElement("video"); v.preload = "metadata"; v.src = url; v.onloadedmetadata = () => { setBackgrounds((prev) => prev.map((b) => b.id === item.id ? { ...b, mediaDur: v.duration || 0, trimEnd: v.duration || 0 } : b)); }; }
    });
    if (items.length) { setBackgrounds((prev) => [...prev, ...items]); setSelectedBg(items[0].id); setTab("background"); setNotice(`${items.length} background(s) added · เพิ่มพื้นหลังแล้ว — drag to reorder in the list`); }
  };
  const onFontFile = async (file: File) => {
    const url = URL.createObjectURL(file); const name = file.name.replace(/\.(ttf|otf|woff2?)$/i, "");
    try { const face = new FontFace(name, `url(${url})`); await face.load(); document.fonts.add(face); setCustomFonts((prev) => [name, ...prev]); setTs((s) => ({ ...s, fontFamily: name })); setNotice(`Font "${name}" loaded · โหลดฟอนต์แล้ว`); }
    catch { setNotice("Could not load that font file."); }
  };
  const loadDemo = () => { pushHistory(); setLyrics(parseLyrics(DEMO_LRC)); setLyricSource("Demo lyrics"); setNotice("Demo lyrics loaded · โหลดเนื้อเพลงตัวอย่างแล้ว — add your song + backgrounds to begin"); };
  const autoTimestamp = () => {
    const lines = pasteText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    if (!lines.length) { setNotice("Paste some lyrics first. · วางเนื้อเพลงก่อน"); return; }
    pushHistory(); setLyrics(lines.map((text, i) => ({ id: nid("l"), time: i * 3, text }))); setLyricSource("Pasted lyrics (auto 3s)"); setNotice(`${lines.length} lines auto-timestamped every 3s · ใส่เวลาอัตโนมัติทุก 3 วิ — drag blocks in the timeline to fine-tune`);
  };
  const spreadEvenly = () => { if (!lyrics.length) return; pushHistory(); const step = totalDur / lyrics.length; setLyrics(lyrics.map((l, i) => ({ ...l, time: Math.round(i * step * 100) / 100 }))); setNotice("Lyrics spread evenly across the track · กระจายเนื้อเพลงเท่ากันทั้งเพลง"); };
  const exportLrc = () => {
    const body = lyrics.map((l) => { const m = Math.floor(l.time / 60), s = l.time - m * 60; return `[${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}] ${l.text}`; }).join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" })); const a = document.createElement("a"); a.href = url; a.download = "lyrics-edited.lrc"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000); setNotice("LRC file downloaded · ดาวน์โหลดไฟล์เนื้อเพลงแล้ว");
  };

  const togglePlay = useCallback(() => { const a = audioRef.current; if (a && audioUrl) { if (a.paused) void a.play().catch(() => {}); else a.pause(); } else setPlaying((p) => !p); }, [audioUrl]);
  useEffect(() => {
    if (!audioUrl && playing) {
      const iv = setInterval(() => setCurrentTime((t) => { const n = t + 0.1; if (n >= totalDur) { if (loopPreview && !recording) return 0; setPlaying(false); return totalDur; } return n; }), 100);
      return () => clearInterval(iv);
    }
  }, [playing, audioUrl, totalDur, loopPreview, recording]);
  useEffect(() => { if (recording && !audioUrl && currentTime >= totalDur) exportStopRef.current?.(); }, [recording, audioUrl, currentTime, totalDur]);
  useEffect(() => { let raf = 0; const loop = () => { const a = audioRef.current; if (a && audioUrl && !a.paused) setCurrentTime(a.currentTime); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, [audioUrl]);
  const seek = (t: number) => { const c = Math.max(0, Math.min(totalDur, t)); setCurrentTime(c); if (audioRef.current) audioRef.current.currentTime = c; };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight") seek(currentTime + 5);
      if (e.key === "ArrowLeft") seek(currentTime - 5);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, currentTime, totalDur, undo, redo]);

  // ---- draggable text box (pointer capture, snap, lock) ----
  const dragRef = useRef<{ mode: "move" | "scale"; startX: number; startY: number; origX: number; origY: number; origScale: number; pointerId: number } | null>(null);
  const onTextPointerDown = (e: React.PointerEvent) => {
    if (ts.locked) return;
    const stage = stageRef.current; if (!stage) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode: "move", startX: e.clientX, startY: e.clientY, origX: ts.x, origY: ts.y, origScale: ts.scale, pointerId: e.pointerId };
    setDragging(true); setTextSelected(true);
  };
  const onTextPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current; const stage = stageRef.current;
    if (!d || !stage || d.pointerId !== e.pointerId) return;
    const rect = stage.getBoundingClientRect();
    if (d.mode === "move") {
      let nx = d.origX + ((e.clientX - d.startX) / rect.width) * 100;
      let ny = d.origY + ((e.clientY - d.startY) / rect.height) * 100;
      const sx = Math.abs(nx - 50) < 3; const sy = Math.abs(ny - 50) < 3;
      if (sx) nx = 50; if (sy) ny = 50;
      setSnapX(sx); setSnapY(sy);
      setTs((s) => ({ ...s, x: Math.round(Math.max(0, Math.min(100, nx)) * 10) / 10, y: Math.round(Math.max(0, Math.min(100, ny)) * 10) / 10 }));
    } else {
      const ns = Math.max(0.4, Math.min(3.5, d.origScale + (e.clientY - d.startY) / 140));
      setTs((s) => ({ ...s, scale: Math.round(ns * 100) / 100 }));
    }
  };
  const onTextPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null; setDragging(false); setSnapX(false); setSnapY(false); pushHistory();
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onCornerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); if (ts.locked) return;
    const box = (e.currentTarget as HTMLElement).closest("[data-textbox]") as HTMLElement | null;
    box?.setPointerCapture(e.pointerId);
    dragRef.current = { mode: "scale", startX: e.clientX, startY: e.clientY, origX: ts.x, origY: ts.y, origScale: ts.scale, pointerId: e.pointerId };
    setDragging(true); setTextSelected(true);
  };
  const onStageWheel = (e: React.WheelEvent) => { if (!(e.target as HTMLElement).closest("[data-textbox]") || ts.locked) return; const ns = Math.max(0.5, Math.min(3, ts.scale - Math.sign(e.deltaY) * 0.08)); setTs((s) => ({ ...s, scale: Math.round(ns * 100) / 100 })); };
  const resetPosition = () => { pushHistory(); setTs((s) => ({ ...s, x: 50, y: 50, scale: 1 })); setNotice("Position reset to center · รีเซ็ตตำแหน่งกึ่งกลางแล้ว"); };

  const patchBg = (id: string, patch: Partial<BgItem>) => setBackgrounds((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  const moveBg = (id: string, dir: -1 | 1) => setBackgrounds((prev) => { const i = prev.findIndex((b) => b.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= prev.length) return prev; const copy = [...prev]; [copy[i], copy[j]] = [copy[j], copy[i]]; return copy; });
  const selBg = backgrounds.find((b) => b.id === selectedBg) || backgrounds[activeBgIdx] || null;

  const drawExportFrame = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.save(); ctx.scale(W, H);
    const backdrop = ctx.createRadialGradient(.5, .38, 0, .5, .38, .65);
    backdrop.addColorStop(0, '#221D38'); backdrop.addColorStop(.62, '#0B0B0F'); backdrop.addColorStop(1, '#060607');
    ctx.fillStyle = backdrop; ctx.fillRect(0, 0, 1, 1); ctx.restore();
    const drawBackground = (bg: BgItem, alpha: number) => {
      const layers = (bg.kind === 'video' ? [mediaRefs.current.get(bg.id + 'A'), mediaRefs.current.get(bg.id + 'B')] : [mediaRefs.current.get(bg.id)])
        .filter((el): el is HTMLElement => !!el)
        .sort((a, b) => Number(a.style.zIndex || 0) - Number(b.style.zIndex || 0));
      for (const el of layers) { try {
        const iw = (el as HTMLVideoElement).videoWidth || (el as HTMLImageElement).naturalWidth;
        const ih = (el as HTMLVideoElement).videoHeight || (el as HTMLImageElement).naturalHeight;
        if (!iw || !ih) continue;
        ctx.save(); ctx.globalAlpha = alpha * (el.style.opacity ? Number(el.style.opacity) : 1);
        ctx.filter = `blur(${bg.blur * W / ASPECT_BASE[aspect][0]}px) brightness(${bg.brightness}%) contrast(${bg.contrast}%)`;
        if (bg.fit === "stretch") ctx.drawImage(el as CanvasImageSource, 0, 0, W, H);
        else { const s = bg.fit === "cover" ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih); ctx.drawImage(el as CanvasImageSource, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s); }
        ctx.restore();
      } catch { /* frame not ready */ } }
      if (bg.tintOpacity > 0 && layers.length) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = hexA(bg.tint.startsWith("#") ? bg.tint : "#8B5CF6", bg.tintOpacity); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    };
    if (showPrev && backgrounds[prevBgIdx]) drawBackground(backgrounds[prevBgIdx], 1);
    if (backgrounds[activeBgIdx]) drawBackground(backgrounds[activeBgIdx], showPrev ? 1 - prevOpacity : 1);
    if (activeLyric) drawLyricFrame(ctx, W, H, { text: activeLyric.text, elapsed: currentTime - segStart, duration: segEnd - segStart, currentTime, wordTimings: activeLyric.wordTimings, style: ts, referenceWidth: ASPECT_BASE[aspect][0] });
    if (ts.grain) drawGrain(ctx, W, H);
  }, [backgrounds, activeBgIdx, activeLyric, ts, currentTime, segStart, segEnd, aspect, showPrev, prevBgIdx, prevOpacity]);
  const drawExportFrameRef = useRef(drawExportFrame);
  drawExportFrameRef.current = drawExportFrame;

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    let animationFrame = 0;
    const draw = () => {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(stage.clientWidth * ratio));
      const height = Math.max(1, Math.round(stage.clientHeight * ratio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      drawExportFrameRef.current(ctx, width, height);
      animationFrame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const startExport = () => {
    const [bw, bh] = ASPECT_BASE[aspect];
    const scaleF = exportQuality === "1080p" ? (aspect === "16:9" || aspect === "9:16" ? 1.5 : 1.125) : 1;
    const W = Math.round(bw * scaleF), H = Math.round(bh * scaleF);
    const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    if (!MediaRecorder.isTypeSupported(mime)) { setNotice("This browser cannot record video. Please try Chrome or Edge. · เบราว์เซอร์นี้ไม่รองรับการบันทึกวิดีโอ"); return; }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      cancelAnimationFrame(raf); stream.getTracks().forEach(track => track.stop());
      audioRef.current?.pause(); setPlaying(false); setRecording(false); setConverting(true);
      const blob = new Blob(chunksRef.current, { type: mime });
      void (async () => {
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        const { fetchFile } = await import('@ffmpeg/util');
        const ffmpeg = new FFmpeg();
        try {
          setNotice('กำลังเตรียมตัวแปลง MP4 และประมวลผลวิดีโอในเบราว์เซอร์ โปรดเปิดหน้านี้ไว้');
          const base = `${import.meta.env.BASE_URL}ffmpeg/`;
          const responses = await Promise.all(['core-part-0.bin', 'core-part-1.bin'].map(part => fetch(base + part)));
          if (responses.some(response => !response.ok)) throw new Error('Cannot load MP4 encoder');
          setNotice('กำลังโหลดตัวเข้ารหัส MP4…');
          const wasmURL = URL.createObjectURL(new Blob(await Promise.all(responses.map(response => response.arrayBuffer())), {type:'application/wasm'}));
          const coreURL = new URL(base + 'ffmpeg-core.js', location.href).href;
          try { await ffmpeg.load({ coreURL, wasmURL }); } finally { URL.revokeObjectURL(wasmURL); }
          setNotice('กำลังเตรียมภาพและเสียงสำหรับ MP4…');
          await ffmpeg.writeFile('video.webm', await fetchFile(blob));
          const args = ['-i', 'video.webm'];
          if (includeAudio && audioUrl) { await ffmpeg.writeFile('audio.input', await fetchFile(audioUrl)); args.push('-i', 'audio.input', '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-shortest'); }
          args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'output.mp4');
          ffmpeg.on('progress', ({progress}) => setNotice(`กำลังแปลง MP4 ${Math.min(99, Math.max(0, Math.round(progress * 100)))}% · โปรดเปิดหน้านี้ไว้`));
          setNotice('กำลังแปลง MP4 · โปรดเปิดหน้านี้ไว้');
          const result = await ffmpeg.exec(args);
          if (result !== 0) throw new Error('MP4 conversion failed');
          const data = await ffmpeg.readFile('output.mp4');
          if (typeof data === 'string') throw new Error('Invalid MP4 output');
          const url = URL.createObjectURL(new Blob([data as BlobPart], {type:'video/mp4'}));
          const a = document.createElement('a'); a.href = url; a.download = `lyrics-visualizer-${exportQuality}-${aspect.replace(':','x')}.mp4`; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          setNotice('ดาวน์โหลด MP4 แล้ว · MP4 export complete');
        } finally { ffmpeg.terminate(); }
      })().catch((error) => {
        console.error('MP4 export failed', error);
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'lyrics-visualizer-recovery.webm'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        setNotice('แปลง MP4 ไม่สำเร็จ ดาวน์โหลดวิดีโอสำรองแบบ WebM โดยไม่มีเสียงแล้ว กรุณาลองใหม่');
      }).finally(() => setConverting(false));
    };
    let raf = 0; const draw = () => { drawExportFrameRef.current(ctx, W, H); raf = requestAnimationFrame(draw); };
    recorderRef.current = rec; exportStopRef.current = () => { if (rec.state !== 'inactive') rec.stop(); };
    rec.start(250); draw(); setRecording(true); seek(0);
    if (audioRef.current && audioUrl) void audioRef.current.play().catch(() => {}); else setPlaying(true);
    setNotice("กำลังบันทึกวิดีโอแบบเรียลไทม์ เมื่อเพลงจบระบบจะแปลงเป็น MP4 อัตโนมัติ");
  };

  const set = (patch: Partial<TextStyle>) => setTs((s) => ({ ...s, ...patch }));
  const applyPreset = (p: Preset) => { pushHistory(); setTs((s) => ({ ...DEFAULT_STYLE, ...p.style, animation: p.style.animation || s.animation })); setNotice(`Preset "${p.name}" applied · ใช้พรีเซ็ต ${p.name} แล้ว`); };

  const label = "mono text-[10px] tracking-[0.16em] uppercase text-[var(--muted)]";
  const card = "rounded-2xl border border-[var(--border)] bg-[var(--surface)]";
  const btnGhost = "flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 py-1.5 text-[11px] font-semibold hover:border-[var(--accent)] transition";
  const titleAttr = (en: string, th: string) => `${en} · ${th}`;

  const Slider = ({ l, v, min, max, step = 1, on, unit = "", th = "" }: { l: string; v: number; min: number; max: number; step?: number; on: (n: number) => void; unit?: string; th?: string }) => {
    const pct = Math.min(100, Math.max(0, ((v - min) / (max - min || 1)) * 100));
    return (
      <div title={titleAttr(l, th)}>
        <div className="mb-1 flex items-center justify-between"><span className={label}>{l}</span><span className="mono rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">{v}{unit}</span></div>
        <input
          type="range" aria-label={l} min={min} max={max} step={step} value={v}
          onChange={(e) => on(parseFloat(e.target.value))}
          style={{ ["--fill" as string]: `${pct}%` }}
          className="block w-full"
        />
      </div>
    );
  };
  const Toggle = ({ l, v, on, th = "", icon }: { l: string; v: boolean; on: (b: boolean) => void; th?: string; icon?: React.ReactNode }) => (
    <button title={titleAttr(l, th)} onClick={() => on(!v)} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${v ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white" : "border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]"}`}>{icon ?? (v ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />)}{l}</button>
  );

  const displayText = ts.uppercase && activeLyric ? activeLyric.text.toUpperCase() : activeLyric?.text || "";
  const words = displayText.split(/\s+/).filter(Boolean);

  const renderLyricText = () => {
    if (!activeLyric) {
      if (lyrics.length > 0) return <span className="anim-fadeup inline-block w-full text-center" style={{ fontFamily: `'${ts.fontFamily}', sans-serif`, fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 600, color: "#FFFFFF", opacity: 0.6, textAlign: "center", textShadow: "0 2px 12px rgba(0,0,0,.8)" }}>♪ กด Play เพื่อเริ่ม · Press play</span>;
      return (<span className="block w-full text-center" style={{ fontFamily: `'${ts.fontFamily}', sans-serif`, fontSize: "clamp(30px, 3.6vw, 60px)", fontWeight: 800, lineHeight: 1.25, color: "#FFFFFF", textAlign: "center", textShadow: "0 3px 18px rgba(0,0,0,.85), 0 0 32px rgba(139,92,246,.35)" }}>ลากเพลง + พื้นหลังมาวางที่นี่ • หรือกดโหลด Demo<span className="mt-3 block" style={{ fontSize: "clamp(13px, 1.4vw, 18px)", fontWeight: 600, opacity: 0.75, letterSpacing: 0.2 }}>Drop your song + backgrounds here — lyrics will fill the stage</span></span>);
    }
    const responsiveFontSize = aspect === "9:16"
      ? `clamp(28px, ${(ts.fontSize * 0.115).toFixed(2)}vw, ${Math.max(56, Math.round(ts.fontSize * 1.17))}px)`
      : `clamp(32px, ${(ts.fontSize * 0.088).toFixed(2)}vw, ${Math.max(72, Math.round(ts.fontSize * 1.5))}px)`;
    const base: React.CSSProperties = {
      fontFamily: `'${ts.fontFamily}', sans-serif`, fontSize: responsiveFontSize as unknown as number, fontWeight: ts.weight, fontStyle: ts.italic ? "italic" : "normal",
      letterSpacing: ts.letterSpacing, lineHeight: ts.lineHeight, color: ts.color, opacity: ts.opacity,
      textAlign: ts.align, whiteSpace: "pre-wrap", wordBreak: "break-word", display: "block", width: "100%",
      textShadow: [ts.shadowOn ? `${ts.shadowX}px ${ts.shadowY}px ${ts.shadowBlur}px ${ts.shadowColor}` : "", ts.glowOn ? `0 0 ${ts.glowIntensity}px ${ts.glowColor}, 0 0 ${ts.glowIntensity * 2.2}px ${ts.glowColor}` : ""].filter(Boolean).join(", ") || undefined,
      WebkitTextStroke: ts.strokeOn ? `${ts.strokeWidth}px ${ts.strokeColor}` : undefined,
    };
    // ---- CURVED TEXT via SVG textPath (works with Thai combining marks) ----
    const curved = ts.curveMode !== "off" && ts.curve !== 0;
    if (curved) {
      const R = Math.max(60, ts.arcRadius);
      const sweep = Math.abs(ts.curve); // 0..100 → arc strength
      const up = (ts.curveMode === "arc-top" && ts.curve > 0) || (ts.curveMode === "arc-bottom" && ts.curve < 0);
      const isCircle = ts.curveMode === "circle";
      const W = 1000, H = 420, cx = W / 2;
      const chord = Math.min(920, 260 + sweep * 6.5);
      const sag = isCircle ? R : Math.max(18, (sweep / 100) * R * 0.9);
      const yBase = up ? H / 2 + sag / 2 : H / 2 - sag / 2;
      const pathD = isCircle
        ? `M ${cx - R},${H / 2} A ${R},${R} 0 1,1 ${cx + R},${H / 2} A ${R},${R} 0 1,1 ${cx - R},${H / 2}`
        : up
          ? `M ${cx - chord / 2},${yBase} Q ${cx},${yBase - sag * 2} ${cx + chord / 2},${yBase}`
          : `M ${cx - chord / 2},${yBase} Q ${cx},${yBase + sag * 2} ${cx + chord / 2},${yBase}`;
      const fs = Math.max(20, ts.fontSize * 1.9);
      return (
        <span style={{ ...base, transform: ts.rotate ? `rotate(${ts.rotate}deg)` : undefined }} className="relative block w-full">
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ overflow: "visible" }} role="img" aria-label={displayText}>
            <defs><path id={`curvePath-${activeLyric.id}`} d={pathD} fill="none" /></defs>
            <text fontFamily={`'${ts.fontFamily}', sans-serif`} fontSize={fs} fontWeight={ts.weight} fontStyle={ts.italic ? "italic" : "normal"} letterSpacing={ts.letterSpacing} fill={ts.color} opacity={ts.opacity}
              stroke={ts.strokeOn ? ts.strokeColor : "none"} strokeWidth={ts.strokeOn ? ts.strokeWidth * 2 : 0}
              style={{ filter: ts.glowOn ? `drop-shadow(0 0 ${ts.glowIntensity}px ${ts.glowColor}) drop-shadow(0 0 ${ts.glowIntensity * 1.8}px ${ts.glowColor})` : ts.shadowOn ? `drop-shadow(${ts.shadowX}px ${ts.shadowY}px ${ts.shadowBlur}px ${ts.shadowColor})` : undefined }}>
              <textPath href={`#curvePath-${activeLyric.id}`} startOffset="50%" textAnchor="middle">{displayText}</textPath>
            </text>
          </svg>
          {ts.hearts && <Hearts />}
        </span>
      );
    }
    const rot: React.CSSProperties = ts.rotate ? { transform: `rotate(${ts.rotate}deg)` } : {};
    switch (ts.animation) {
      case "Karaoke Fill": { const pct = Math.round(animP * 100); return <span style={{ ...base, ...rot, backgroundImage: `linear-gradient(to right, ${ts.glowOn ? ts.glowColor : "#C4B5FD"} ${pct}%, ${ts.color} ${pct}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", textShadow: "none" }}>{displayText}</span>; }
      case "Typewriter + Cursor": { const chars = Math.floor(animP * displayText.length); return <span style={{ ...base, ...rot }}>{displayText.slice(0, chars)}<span className="cursor-blink">|</span></span>; }
      case "Floating Handwritten": return <span key={activeLyric.id} className="anim-float relative inline-block" style={{ ...base, ...rot }}>{displayText}{ts.hearts && <Hearts />}</span>;
      case "Glitch & Scale": return <span key={activeLyric.id} className={`anim-glitch anim-popin inline-block ${ts.chroma ? "chroma" : ""}`} style={{ ...base, ...rot }}>{displayText}</span>;
      case "Center Fade": return <span key={activeLyric.id} className="anim-fadeup inline-block" style={{ ...base, ...rot }}>{displayText}</span>;
      case "Word-by-Word Pop": {
        const segDur = Math.max(0.3, (segEnd - segStart) / Math.max(0.2, ts.animSpeed));
        return (<span style={{ ...base, ...rot }}>{words.map((w, i) => (<span key={`${activeLyric.id}-${i}`} className="anim-popin inline-block" style={{ animationDelay: `${(i / Math.max(1, words.length)) * segDur}s`, color: i === Math.min(words.length - 1, Math.floor(animP * words.length)) && ts.glowOn ? ts.glowColor : ts.color }}>{w}&nbsp;</span>))}</span>);
      }
      case "Bounce Pop": {
        const segDur = Math.max(0.3, (segEnd - segStart) / Math.max(0.2, ts.animSpeed));
        return (<span style={{ ...base, ...rot }}>{words.map((w, i) => (<span key={`${activeLyric.id}-bp-${i}`} className="anim-bouncepop inline-block" style={{ animationDelay: `${(i / Math.max(1, words.length)) * segDur * 0.8}s` }}>{w}&nbsp;</span>))}</span>);
      }
      case "Wave Flow": {
        const chars = displayText.split("");
        return (<span style={{ ...base, ...rot }}>{chars.map((c, i) => (<span key={`${activeLyric.id}-wv-${i}`} className="anim-wave inline-block" style={{ animationDelay: `${i * 0.07}s` }}>{c === " " ? "\u00A0" : c}</span>))}</span>);
      }
      case "3D Flip": {
        const chars = displayText.split("");
        return (<span style={{ ...base, ...rot, perspective: "600px" }}>{chars.map((c, i) => (<span key={`${activeLyric.id}-fl-${i}`} className="anim-flip3d inline-block" style={{ animationDelay: `${i * 0.045}s` }}>{c === " " ? "\u00A0" : c}</span>))}</span>);
      }
      case "Neon Flicker": return <span key={activeLyric.id} className="anim-neon inline-block" style={{ ...base, ...rot, textShadow: `0 0 ${Math.max(6, ts.glowIntensity)}px ${ts.glowOn ? ts.glowColor : "#F9A8D4"}, 0 0 ${Math.max(14, ts.glowIntensity * 2.2)}px ${ts.glowOn ? ts.glowColor : "#EC4899"}, 0 0 42px ${ts.glowOn ? ts.glowColor : "#EC4899"}` }}>{displayText}</span>;
      case "Blur Smoke": return <span key={activeLyric.id} className="anim-smoke inline-block" style={{ ...base, ...rot }}>{displayText}</span>;
      case "Kinetic Slide": {
        const segDur = Math.max(0.3, (segEnd - segStart) / Math.max(0.2, ts.animSpeed));
        const cls = ["anim-kinetic-l", "anim-kinetic-u", "anim-kinetic-r"];
        return (<span style={{ ...base, ...rot }}>{words.map((w, i) => (<span key={`${activeLyric.id}-kn-${i}`} className={`${cls[i % 3]} inline-block`} style={{ animationDelay: `${(i / Math.max(1, words.length)) * segDur * 0.7}s` }}>{w}&nbsp;</span>))}</span>);
      }
      case "Rubber Band": return <span key={activeLyric.id} className="anim-rubber inline-block" style={{ ...base, ...rot }}>{displayText}</span>;
      case "Glitch RGB": return <span key={activeLyric.id} className="anim-glitchrgb inline-block" style={{ ...base, ...rot }}>{displayText}</span>;
      default: return <span style={{ ...base, ...rot }}>{displayText}</span>;
    }
  };

  const selBgItem = selBg;
  const [ew, eh] = ASPECT_WH[aspect];
  // text-box transform: anchor by align + vAlign so lines never jump
  const txPct = ts.align === "left" ? "0%" : ts.align === "right" ? "-100%" : "-50%";
  const tyPct = ts.vAlign === "top" ? "0%" : ts.vAlign === "bottom" ? "-100%" : "-50%";
  const boxWidthCls = ts.textWidth === "full" ? "w-[92%]" : ts.textWidth === "80" ? "w-[80%]" : ts.textWidth === "85" ? "w-[85%]" : "w-[85%] max-w-[92%]";
  // True full-fill frame: as large as the center area allows, edge-to-edge, no small floating box.
  const frameCls =
    aspect === "16:9" ? "aspect-[16/9] w-full h-auto max-w-full max-h-full" :
    aspect === "9:16" ? "aspect-[9/16] h-full w-auto max-w-full max-h-full" :
    aspect === "1:1" ? "aspect-square h-full w-auto max-w-full max-h-full" :
    "aspect-[4/5] h-full w-auto max-w-full max-h-full";
  const allFonts = [...customFonts, ...FONT_LIST];

  return (
    <div data-safe-area-inset-root className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--ink)]" style={{ boxSizing: "border-box", paddingTop: "var(--safe-area-inset-top)" }}>
      <header data-safe-area-sticky-top className="studio-header z-40 shrink-0 border-b border-[var(--border)]" style={{ top: "var(--safe-area-inset-top)" }}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] shadow-[0_0_20px_rgba(139,92,246,.5)]"><MonitorPlay className="h-5 w-5 text-white" /></div>
            <div><p className="text-[13px] font-bold leading-none">LYRICS STUDIO — BANGKOK <span className="text-[var(--muted)]">v01</span></p><p className={label}>Lyrics Visualizer Editor</p></div>
          </div>
          <div className="ml-1 hidden items-center gap-1 md:flex">
            <button onClick={undo} disabled={!historyRef.current.length} className={`${btnGhost} disabled:opacity-40`} title={titleAttr("Undo (Ctrl+Z)", "เลิกทำ")}><Undo2 className="h-3.5 w-3.5" /></button>
            <button onClick={redo} disabled={!futureRef.current.length} className={`${btnGhost} disabled:opacity-40`} title={titleAttr("Redo (Ctrl+Shift+Z)", "ทำซ้ำ")}><Redo2 className="h-3.5 w-3.5" /></button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className={label}>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Saved in browser" : saveState === "offline" ? "Save unavailable" : ""}</span>
            <button onClick={() => void saveProject()} className={btnGhost} title={titleAttr("Save project (settings + lyrics)", "บันทึกโปรเจกต์")}><Save className="h-3.5 w-3.5" /> Save</button>
            <div className="flex overflow-hidden rounded-lg border border-[var(--border)]" title={titleAttr("Aspect ratio", "อัตราส่วนภาพ")}>
              {ASPECTS.map((a) => <button key={a} onClick={() => setAspect(a)} className={`px-2.5 py-1.5 text-[11px] font-bold ${aspect === a ? "bg-[var(--accent)] text-white" : "bg-[var(--surface2)]"}`}>{a}</button>)}
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold" title={titleAttr("Include audio in export", "ใส่เสียงในวิดีโอที่ส่งออก")}><input type="checkbox" checked={includeAudio} onChange={(e) => setIncludeAudio(e.target.checked)} className="accent-[#8B5CF6]" /> Audio</label>
            <select value={exportQuality} onChange={(e) => setExportQuality(e.target.value as "1080p" | "720p")} className="!w-auto" title={titleAttr("Export quality", "คุณภาพวิดีโอ")}><option value="1080p">1080p</option><option value="720p">720p</option></select>
            {recording ? (<button onClick={() => exportStopRef.current?.()} className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white">■ Stop Export</button>) : (
              <button onClick={startExport} disabled={converting || (!lyrics.length && !backgrounds.length)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_0_16px_rgba(139,92,246,.45)] disabled:opacity-40" title={titleAttr("Record and export MP4", "ส่งออกวิดีโอ MP4")}><Download className="h-3.5 w-3.5" /> {converting ? 'Converting MP4…' : `Export MP4 ${aspect}`}</button>
            )}
          </div>
        </div>
        {notice && <div className="border-t border-[var(--border)] px-4 py-1.5"><p className="flex items-center gap-2 text-[11px] text-[var(--muted)]"><Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />{notice}</p></div>}
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT — independent scroll */}
        <aside className="studio-sidebar thin-scroll hidden w-[360px] shrink-0 overflow-y-auto overflow-x-hidden border-r border-[var(--border)] lg:block">
          <div className="space-y-3 p-3">
            <section className={`${card} p-3.5`}>
              <p className={`${label} mb-2.5 flex items-center gap-2`}><Music2 className="h-3.5 w-3.5" /> Song · เพลง</p>
              <label className="block cursor-pointer rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface2)] p-3 text-center transition hover:border-[var(--accent)]" title={titleAttr("Upload MP3/WAV", "อัพโหลดไฟล์เพลง")}>
                <Upload className="mx-auto mb-1 h-5 w-5 text-[var(--accent)]" />
                <span className="block truncate text-xs font-semibold">{audioName || "Drop your song here · ลากเพลงมาวางที่นี่"}</span>
                <span className={label}>{audioName ? `${fmt(duration)} · loaded` : "MP3 / WAV · click to browse"}</span>
                <input type="file" accept=".mp3,.wav,audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAudio(f); }} />
              </label>
              {hasAudio && <Waveform audioUrl={audioUrl} progress={duration ? currentTime / duration : 0} onSeek={(p) => seek(p * totalDur)} />}
            </section>

            <section className={`${card} p-3.5`}>
              <p className={`${label} mb-2.5 flex items-center gap-2`}><FileText className="h-3.5 w-3.5" /> Lyrics · เนื้อเพลง</p>
              <label className="block cursor-pointer rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface2)] p-3 text-center transition hover:border-[var(--accent)]" title={titleAttr("Upload .lrc / .txt / .srt", "อัพโหลดไฟล์เนื้อเพลง")}>
                <FileText className="mx-auto mb-1 h-5 w-5 text-[var(--accent)]" />
                <span className="block truncate text-xs font-semibold">{lyricSource || "Upload .lrc / .srt · อัพโหลดเนื้อเพลง"}</span>
                <span className={label}>{lyrics.length ? `${lyrics.length} lines` : "[00:12.00] timed lines"}</span>
                <input type="file" accept=".lrc,.txt,.srt,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onLyricsFile(f); }} />
              </label>
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={3} placeholder={"No timed file? Paste lyrics here, one line per row…\nไม่มีไฟล์? วางเนื้อเพลงตรงนี้ บรรทัดละท่อน…"} className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-2.5 text-xs outline-none placeholder:text-zinc-600 focus:border-[var(--accent)]" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={autoTimestamp} className={btnGhost} title={titleAttr("Auto-timestamp every 3 seconds", "ใส่เวลาอัตโนมัติทุก 3 วิ")}><Timer className="h-3.5 w-3.5" /> Auto-time 3s</button>
                <button onClick={loadDemo} className={btnGhost}><Sparkles className="h-3.5 w-3.5" /> Demo lyrics</button>
                <button onClick={spreadEvenly} disabled={!lyrics.length} className={`${btnGhost} disabled:opacity-40`} title={titleAttr("Spread lines evenly over the song", "กระจายเนื้อเพลงเท่ากัน (ไม่ได้จับเสียงร้อง)")}><Scissors className="h-3.5 w-3.5" /> Spread evenly</button>
                <button onClick={exportLrc} disabled={!lyrics.length} className={`${btnGhost} disabled:opacity-40`} title={titleAttr("Download edited .lrc", "ดาวน์โหลดไฟล์ .lrc ที่แก้แล้ว")}><FileDown className="h-3.5 w-3.5" /> Export LRC</button>
              </div>
              <button onClick={() => void transcribeAudio()} disabled={!audioFile || transcribing} className={`${btnGhost} mt-2 w-full justify-center disabled:opacity-40`} title={titleAttr("Use Whisper to detect words and their timing", "ใช้ Whisper จับคำและเวลาเพื่อทำคาราโอเกะระดับคำ")}>
                <Sparkles className="h-3.5 w-3.5" /> {transcribing ? 'Whisper กำลังฟังเพลง…' : 'Whisper · จับเวลาแยกระดับคำ'}
              </button>
              <p className="mt-1 text-[10px] text-[var(--muted)]">ส่งเสียงโมโน 16 kHz ไปประมวลผลบน Cloudflare Workers AI · โควตาฟรีรวม 180 นาที/วัน</p>
              {lyrics.length > 0 && (
                <div className="thin-scroll mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
                  {lyrics.map((l) => (
                    <div key={l.id} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${lyrics[activeIdx]?.id === l.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-transparent hover:bg-[var(--surface2)]"}`}>
                      <input defaultValue={fmtFull(l.time)} key={l.id + l.time} onBlur={(e) => { const t = parseTimeInput(e.target.value, l.time); pushHistory(); setLyrics((prev) => prev.map((x) => x.id === l.id ? { ...x, time: t, wordTimings: x.wordTimings?.map(word => ({ ...word, start: word.start + t - l.time, end: word.end + t - l.time })) } : x).sort((a, b) => a.time - b.time)); }} className="mono w-[62px] shrink-0 rounded bg-black/40 px-1 py-0.5 text-[10px] text-[var(--accent)] outline-none" title={titleAttr("Start time mm:ss.cc — click line to play from here", "เวลาเริ่ม")} />
                      <input value={l.text} onChange={(e) => setLyrics((prev) => prev.map((x) => x.id === l.id ? { ...x, text: e.target.value, wordTimings: undefined } : x))} onClick={() => seek(l.time)} className="min-w-0 flex-1 bg-transparent text-[11px] outline-none" />
                      <button onClick={() => { pushHistory(); setLyrics((prev) => prev.filter((x) => x.id !== l.id)); }} className="shrink-0 text-zinc-500 hover:text-red-400" title={titleAttr("Delete line", "ลบบรรทัด")}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => { pushHistory(); setLyrics((prev) => [...prev, { id: nid("l"), time: Math.round(currentTime * 100) / 100, text: "New line · ท่อนใหม่" }].sort((a, b) => a.time - b.time)); }} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-white"><Plus className="h-3 w-3" /> Add line at playhead · เพิ่มท่อนที่ตำแหน่งเล่น</button>
                </div>
              )}
            </section>

            <section className={`${card} p-3.5`}>
              <p className={`${label} mb-2.5 flex items-center gap-2`}><ImageIcon className="h-3.5 w-3.5" /> Backgrounds · พื้นหลัง</p>
              <label onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) onBackgrounds(e.dataTransfer.files); }}
                className={`block cursor-pointer rounded-xl border border-dashed p-3 text-center transition ${dragOver ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--accent)]"}`}
                title={titleAttr("Add images, videos or GIFs (multiple allowed)", "เพิ่มรูป วิดีโอ หรือ GIF (เลือกหลายไฟล์ได้)")}>
                <Film className="mx-auto mb-1 h-5 w-5 text-[var(--accent)]" />
                <span className="block text-xs font-semibold">Drop images / video / GIF · ลากไฟล์มาวาง</span>
                <span className={label}>jpg png webp · mp4 mov webm · gif</span>
                <input type="file" accept="image/*,video/*,.gif" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) onBackgrounds(e.target.files); }} />
              </label>
              {backgrounds.length > 0 && (<>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={label}>Sequence</span>
                  <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
                    <button onClick={() => setSeqMode("time")} className={`px-2 py-1 text-[10px] font-bold ${seqMode === "time" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface2)]"}`} title={titleAttr("Play backgrounds by their durations", "เล่นตามเวลาของแต่ละคลิป")}>By time</button>
                    <button onClick={() => setSeqMode("lyrics")} className={`px-2 py-1 text-[10px] font-bold ${seqMode === "lyrics" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface2)]"}`} title={titleAttr("Change background on every lyric line", "เปลี่ยนพื้นหลังตามท่อนเพลง")}>Per lyric</button>
                  </div>
                  <Toggle l="Loop all" v={loopPreview} on={setLoopPreview} th="วนวิดีโอทั้งหมด" />
                </div>
                <div className="mt-2"><Slider l="Background fade (s)" th="เวลาเฟดสลับพื้นหลัง" v={bgFade} min={0} max={2} step={0.1} on={setBgFade} /></div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {backgrounds.map((b, i) => (
                    <div key={b.id} className={`group relative overflow-hidden rounded-lg border ${selectedBg === b.id ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
                      <button onClick={() => { setSelectedBg(b.id); setTab("background"); }} className="block w-full">
                        {b.kind === "video" ? <video src={b.url} muted playsInline className="h-14 w-full object-cover" /> : <img src={b.url} alt={b.name} className="h-14 w-full object-cover" />}
                      </button>
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[9px] font-bold">{i + 1} · {b.kind}</span>
                      <span className="absolute bottom-0 flex w-full items-center justify-between bg-black/70 px-1 py-0.5 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => moveBg(b.id, -1)} className="px-1 text-[10px] hover:text-[var(--accent)]" title="Move earlier · เลื่อนขึ้น">↑</button>
                        <button onClick={() => moveBg(b.id, 1)} className="px-1 text-[10px] hover:text-[var(--accent)]" title="Move later · เลื่อนลง">↓</button>
                        <button onClick={() => setBackgrounds((prev) => prev.filter((x) => x.id !== b.id))} className="px-1 text-[10px] hover:text-red-400" title={titleAttr("Delete", "ลบ")}><Trash2 className="h-3 w-3" /></button>
                      </span>
                    </div>
                  ))}
                </div>
              </>)}
              {!backgrounds.length && <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--muted)]">No backgrounds yet — your video will use a clean dark stage.<br />ยังไม่มีพื้นหลัง — เวทีจะเป็นสีเข้มเรียบ ๆ</p>}
            </section>
            <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">Beginner path (2 min): ① upload song ② upload or paste lyrics → Auto-time ③ add backgrounds ④ pick a preset ⑤ drag text into place ⑥ Export. Lyrics and style save in this browser. Re-select audio and backgrounds after reopening.<br />มือใหม่: ① ใส่เพลง ② ใส่เนื้อเพลง ③ ใส่พื้นหลัง ④ เลือกพรีเซ็ต ⑤ ลากข้อความ ⑥ กด Export ได้เลย</p>
            </div>
          </div>
        </aside>

        {/* CENTER — fixed stage, never scrolls; timeline pinned at bottom */}
        <section className="studio-center relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)] px-3.5">
            <MonitorPlay className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span className={`${label} shrink-0`}>Stage</span>
            <span className="shrink-0 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-bold text-white">{exportQuality}</span>
            <span className="mono shrink-0 rounded bg-black/50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-zinc-200">{aspect} · {ew}×{eh}</span>
            <span className={`${label} truncate`}>{ts.animation}{ts.curveMode !== "off" && ts.curve !== 0 ? " · Curved" : ""}</span>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <span className="mono hidden rounded-full border border-[var(--border)] bg-[#1E1E24] px-2 py-1 text-[10px] text-[var(--muted)] md:inline">X {ts.x.toFixed(0)}% · Y {ts.y.toFixed(0)}%{dragging ? " · LIVE" : ""}</span>
              <button onClick={() => setSafeArea(!safeArea)} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${safeArea ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[#1E1E24] text-zinc-300 hover:border-[var(--accent)]"}`} title={titleAttr("Toggle safe-area guide (90%)", "แสดงขอบเขตปลอดภัย 90%")}>{safeArea ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}Safe area</button>
              <button onClick={() => setLoopPreview(!loopPreview)} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${loopPreview ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[#1E1E24] text-zinc-300 hover:border-[var(--accent)]"}`} title={titleAttr("Loop whole preview", "วนซ้ำทั้งวิดีโอ")}><Repeat className="h-3 w-3" />Loop</button>
              <button onClick={() => setTs((s) => ({ ...s, locked: !s.locked }))} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${ts.locked ? "border-amber-400 bg-amber-400/20 text-amber-200" : "border-[var(--border)] bg-[#1E1E24] text-zinc-300 hover:border-[var(--accent)]"}`} title={titleAttr("Lock text position", "ล็อกตำแหน่งข้อความ")}>{ts.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}{ts.locked ? "Locked" : "Lock"}</button>
            </div>
          </div>

          {/* STAGE — the center area IS the video canvas: full-fill frame, dark surround, no checkerboard */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0A0A0A] p-3 md:p-6" onPointerDown={() => setTextSelected(false)}>
            <div ref={stageRef} onWheel={onStageWheel}
              className={`relative overflow-hidden bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_24px_70px_rgba(0,0,0,0.65)] ${frameCls}`}
              style={{ aspectRatio: aspect.replace(":", " / ") }}>
              {aspect === "9:16" && <div className="pointer-events-none absolute left-1/2 top-1.5 z-40 h-[14px] w-[64px] -translate-x-1/2 rounded-full bg-black/80 ring-1 ring-white/10" />}
              {backgrounds.length === 0 && (
                <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 38%, #221D38 0%, #0B0B0F 62%, #060607 100%)" }} />
              )}
              {showPrev && backgrounds[prevBgIdx] && (<div className="absolute inset-0 z-0" style={{ opacity: prevOpacity }}><MediaLayer item={backgrounds[prevBgIdx]} active={false} fade={bgFade} registerRef={(id, el) => { if (el) mediaRefs.current.set(id, el); }} /></div>)}
              {backgrounds[activeBgIdx] && (<div className="absolute inset-0 z-0"><MediaLayer key={backgrounds[activeBgIdx].id} item={backgrounds[activeBgIdx]} active={playing} fade={bgFade} registerRef={(id, el) => { if (el) mediaRefs.current.set(id, el); }} /></div>)}
              <canvas ref={previewCanvasRef} className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true" />
              {safeArea && <div className="pointer-events-none absolute inset-[5%] z-20 rounded border border-dashed border-white/40"><span className="absolute left-1 top-1 text-[9px] text-white/60">SAFE 90%</span></div>}
              {(dragging || snapX) && <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-px bg-[var(--accent)]/80" />}
              {(dragging || snapY) && <div className="pointer-events-none absolute left-0 top-1/2 z-20 h-px w-full bg-[var(--accent)]/80" />}
              <div data-textbox
                onPointerDown={onTextPointerDown} onPointerMove={onTextPointerMove} onPointerUp={onTextPointerUp} onPointerCancel={onTextPointerUp}
                className={`group absolute z-30 select-none ${boxWidthCls} ${ts.locked ? "cursor-not-allowed" : "cursor-move touch-none"} ${textSelected && !ts.locked ? "outline outline-1 outline-[var(--accent)]" : textSelected ? "outline outline-1 outline-amber-400/70" : "hover:outline hover:outline-1 hover:outline-white/30"}`}
                style={{
                  left: `${ts.x}%`, top: `${ts.y}%`,
                  transform: `translate(${txPct}, ${tyPct}) scale(${ts.scale})`,
                  transformOrigin: "center center",
                  background: !activeLyric && ts.boxOpacity > 0 ? hexA(ts.boxColor, ts.boxOpacity) : "transparent",
                  padding: ts.boxOpacity > 0 ? ts.boxPadding : "8px 2%", borderRadius: ts.boxRadius,
                  backdropFilter: !activeLyric && ts.backdropBlur > 0 ? `blur(${ts.backdropBlur}px)` : undefined,
                  display: "flex", justifyContent: "center", alignItems: ts.vAlign === "top" ? "flex-start" : ts.vAlign === "bottom" ? "flex-end" : "center",
                  minHeight: ts.textWidth === "auto" ? undefined : "1em",
                }}
                title={ts.locked ? titleAttr("Position locked — unlock to drag", "ล็อกอยู่ ปลดล็อกก่อนลาก") : titleAttr("Drag to move · scroll to scale · corners scale", "ลากเพื่อย้าย · เลื่อนเมาส์เพื่อขยาย")}>
                <span style={activeLyric ? { opacity: 0 } : undefined}>{renderLyricText()}</span>
                {textSelected && !ts.locked && (<>
                  <span onPointerDown={onCornerDown} className="absolute -left-[5px] -top-[5px] z-40 h-2.5 w-2.5 cursor-nwse-resize rounded-[2px] border border-[var(--accent)] bg-white shadow" title={titleAttr("Drag to scale", "ลากเพื่อปรับขนาด")} />
                  <span onPointerDown={onCornerDown} className="absolute -right-[5px] -top-[5px] z-40 h-2.5 w-2.5 cursor-nesw-resize rounded-[2px] border border-[var(--accent)] bg-white shadow" title={titleAttr("Drag to scale", "ลากเพื่อปรับขนาด")} />
                  <span onPointerDown={onCornerDown} className="absolute -bottom-[5px] -left-[5px] z-40 h-2.5 w-2.5 cursor-nesw-resize rounded-[2px] border border-[var(--accent)] bg-white shadow" title={titleAttr("Drag to scale", "ลากเพื่อปรับขนาด")} />
                  <span onPointerDown={onCornerDown} className="absolute -bottom-[5px] -right-[5px] z-40 h-2.5 w-2.5 cursor-nwse-resize rounded-[2px] border border-[var(--accent)] bg-white shadow" title={titleAttr("Drag to scale", "ลากเพื่อปรับขนาด")} />
                </>)}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 px-3.5 py-2">
            <button onClick={togglePlay} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_0_18px_rgba(139,92,246,.5)]" title={titleAttr("Play/Pause (Space)", "เล่น/หยุด (Space)")}>{playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}</button>
            <span className="mono text-[11px] text-[var(--muted)]">{fmt(currentTime)}</span>
            <input type="range" min={0} max={totalDur || 0} step={0.05} value={currentTime} onChange={(e) => seek(parseFloat(e.target.value))} className="min-w-0 flex-1" title={titleAttr("Scrub timeline", "เลื่อนเวลา")} />
            <span className="mono text-[11px] text-[var(--muted)]">{fmt(totalDur)}</span>
            <button onClick={() => seek(0)} className={btnGhost} title={titleAttr("Back to start", "กลับไปต้นเพลง")}>⏮</button>
          </div>

          {/* Timeline pinned inside center bottom — fixed height, horizontal scroll only */}
          <div className="h-[180px] shrink-0 overflow-hidden border-t border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-2 px-3.5 pt-2">
              <Clock3 className="h-4 w-4 text-[var(--accent)]" /><span className={label}>Timeline · ไทม์ไลน์</span>
              <span className={`${label} ml-auto`}>{lyrics.length} lines · {backgrounds.length} clips</span>
            </div>
            <div className="thin-scroll h-[calc(180px-34px)] overflow-x-auto overflow-y-hidden px-3.5 pb-2 pt-1.5">
              <div className="min-w-[560px]">
                <Waveform audioUrl={audioUrl} progress={duration ? currentTime / duration : 0} onSeek={(p) => seek(p * totalDur)} tall />
                <div className="relative mt-1.5 h-12 rounded-lg bg-black/40" title={titleAttr("Drag a block left/right to retime it", "ลากบล็อกซ้าย-ขวาเพื่อปรับเวลา")}>
                  {lyrics.map((l, i) => {
                    const next = lyrics[i + 1]; const w = ((next ? next.time : totalDur) - l.time) / totalDur * 100;
                    return (
                      <div key={l.id}
                        onPointerDown={(e) => {
                          const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                          const startX = e.clientX; const orig = l.time; let moved = false;
                          const move = (ev: PointerEvent) => { if (Math.abs(ev.clientX - startX) > 3) moved = true; if (moved) { const t = Math.max(0, Math.min(totalDur - 0.1, orig + ((ev.clientX - startX) / parent.width) * totalDur)); setLyrics((prev) => prev.map((x) => x.id === l.id ? { ...x, time: Math.round(t * 100) / 100 } : x)); } };
                          const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); if (moved) { pushHistory(); setLyrics((prev) => [...prev].sort((a, b) => a.time - b.time)); } else seek(l.time); };
                          window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
                        }}
                        className={`absolute top-1 flex h-10 cursor-ew-resize items-center overflow-hidden rounded-md border px-1.5 ${i === activeIdx ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--accent)]"}`}
                        style={{ left: `${(l.time / totalDur) * 100}%`, width: `max(26px, ${w}%)` }}>
                        <span className="truncate text-[9px] font-semibold leading-tight">{l.text}</span>
                      </div>
                    );
                  })}
                  <div className="pointer-events-none absolute top-0 h-full w-px bg-[var(--accent2)]" style={{ left: `${(currentTime / totalDur) * 100}%` }} />
                </div>
                {backgrounds.length > 0 && (
                  <div className="relative mt-1.5 h-8 rounded-lg bg-black/30">
                    {backgrounds.map((b, i) => {
                      const start = seqMode === "time" ? clipStarts.starts[i] : (i / backgrounds.length) * totalDur;
                      const len = seqMode === "time" ? (clipStarts.starts[i + 1] ?? clipStarts.total) - clipStarts.starts[i] : totalDur / backgrounds.length;
                      return (<button key={b.id} onClick={() => { setSelectedBg(b.id); setTab("background"); seek(start); }} className={`absolute top-1 flex h-6 items-center overflow-hidden rounded border px-1.5 text-[9px] font-semibold ${selectedBg === b.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface2)]"}`} style={{ left: `${(start / totalDur) * 100}%`, width: `max(30px, ${(len / totalDur) * 100}%)` }}><span className="truncate">{i + 1}. {b.name}</span></button>);
                    })}
                  </div>
                )}
                <p className={`${label} mt-1.5`}>Click block = play from there · Drag = retime · แตะบล็อกเพื่อเล่น ลากเพื่อเลื่อนเวลา</p>
              </div>
            </div>
          </div>
          <p className="shrink-0 border-t border-[var(--border)] px-3.5 py-1 text-center text-[10px] text-[var(--muted)]">Drag lyric text anywhere · Scroll on text to scale · Space = play/pause · ←/→ seek 5s · Ctrl+Z undo · ลากข้อความไปวางตรงไหนก็ได้</p>
        </section>

        {/* RIGHT — independent scroll, sticky tabs */}
        <aside className="studio-sidebar flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] max-lg:w-[320px]">
          <div className="sticky top-0 z-10 flex shrink-0 border-b border-[var(--border)] bg-[var(--surface)]">
            {([["text", "Text · ตัวอักษร", Type], ["background", "Background · พื้นหลัง", Layers], ["presets", "Presets · พรีเซ็ต", Sparkles], ["cloud", "Cloud · AI", Check]] as const).map(([k, l, Icon]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-bold ${tab === k ? "bg-[var(--accent-soft)] text-white shadow-[inset_0_-2px_0_var(--accent)]" : "text-[var(--muted)] hover:text-white"}`}><Icon className="h-3.5 w-3.5" />{l}</button>
            ))}
          </div>
          <div className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3.5">
            {tab === "cloud" && <CloudPanel snapshot={() => ({title: "Lyrics Visualizer Project", revision: 0, lyrics, ts, aspect, bgFade, seqMode, loopPreview})} restore={project => {
              pushHistory(); audioRef.current?.pause(); if (audioRef.current) audioRef.current.currentTime = 0; setLyrics(project.lyrics); setCurrentTime(0); setPlaying(false);
              if (project.ts && typeof project.ts === "object") setTs({...DEFAULT_STYLE, ...project.ts});
              if (project.aspect === "16:9" || project.aspect === "9:16" || project.aspect === "1:1") setAspect(project.aspect);
              setLyricSource("Cloud project");
            }} />}
            {tab === "text" && (<>
              <div>
                <div className="mb-2 flex items-center justify-between"><p className={label}>Font · ฟอนต์ — เห็นตัวอย่างก่อนเลือก</p><span className="mono text-[10px] text-[var(--accent)]">{ts.fontFamily}</span></div>
                <input value={fontSearch} onChange={(e) => setFontSearch(e.target.value)} placeholder="Search fonts… · ค้นหาฟอนต์" className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 py-1.5 text-xs outline-none placeholder:text-zinc-600 focus:border-[var(--accent)]" />
                <div className="thin-scroll max-h-[340px] space-y-3 overflow-y-auto pr-1">
                  {customFonts.length > 0 && (
                    <div><p className={`${label} mb-1`}>Uploaded · อัปโหลดเอง</p>{customFonts.map((f) => (
                      <button key={f} onClick={() => set({ fontFamily: f })} className={`mb-1.5 flex h-16 w-full flex-col justify-center rounded-xl border px-3 py-3 text-left ${ts.fontFamily === f ? "border-2 border-[#8B5CF6] bg-[#8B5CF6]/10" : "border border-[#2A2A32] hover:bg-[var(--surface2)]"}`}>
                        <span className="flex w-full items-center gap-2"><span className="min-w-0 flex-1 truncate text-base leading-tight text-white" style={{ fontFamily: `'${f}'` }}>{f}</span>{ts.fontFamily === f && <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />}</span>
                        <span className="truncate text-xs opacity-60" style={{ fontFamily: `'${f}'` }}>สวัสดีครับ · The quick brown fox</span>
                      </button>))}
                    </div>
                  )}
                  {FONT_GROUPS.map((g) => {
                    const fonts = g.fonts.filter((f) => !fontSearch || f.toLowerCase().includes(fontSearch.toLowerCase()));
                    if (!fonts.length) return null;
                    return (
                      <div key={g.group}>
                        <p className={`${label} mb-1`}>{g.group}</p>
                        {fonts.map((f) => (
                          <button key={f} onClick={() => set({ fontFamily: f })} className={`mb-1.5 flex h-16 w-full flex-col justify-center rounded-xl px-3 py-3 text-left ${ts.fontFamily === f ? "border-2 border-[#8B5CF6] bg-[#8B5CF6]/10" : "border border-[#2A2A32] hover:bg-[var(--surface2)]"}`}>
                            <span className="flex w-full items-center gap-2"><span className="min-w-0 flex-1 truncate text-base leading-tight text-white" style={{ fontFamily: `'${f}'` }}>{f}</span>{ts.fontFamily === f && <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />}</span>
                            <span className="truncate text-xs opacity-60" style={{ fontFamily: `'${f}'` }}>สวัสดีครับ · สวัสดีชาวโลก</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <label className={`${btnGhost} mt-2 w-full justify-center`} title={titleAttr("Upload your own font (.ttf/.otf/.woff)", "อัพโหลดฟอนต์ของคุณเอง")}><Upload className="h-3.5 w-3.5" /> Upload font TTF/OTF/WOFF<input type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFontFile(f); }} /></label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Slider l="Weight" th="ความหนา" v={ts.weight} min={100} max={900} step={100} on={(n) => set({ weight: n })} />
                  <div className="flex items-end gap-2 pb-0.5"><Toggle l="Italic" v={ts.italic} on={(b) => set({ italic: b })} th="ตัวเอียง" /><Toggle l="CAPS" v={ts.uppercase} on={(b) => set({ uppercase: b })} th="ตัวพิมพ์ใหญ่ทั้งหมด" /></div>
                </div>
              </div>
              <div className="space-y-2.5">
                <p className={label}>Size &amp; Scale · ขนาด</p>
                <Slider l="Font size" th="ขนาดตัวอักษร" v={ts.fontSize} min={12} max={200} on={(n) => set({ fontSize: n })} unit="px" />
                <Slider l="Scale" th="สเกลรวม (ลากมุมข้อความก็ได้)" v={ts.scale} min={0.5} max={3} step={0.05} on={(n) => set({ scale: n })} unit="×" />
                <Slider l="Letter spacing" th="ระยะห่างตัวอักษร" v={ts.letterSpacing} min={-5} max={30} step={0.5} on={(n) => set({ letterSpacing: n })} unit="px" />
                <Slider l="Line height" th="ความสูงบรรทัด" v={ts.lineHeight} min={0.8} max={2.5} step={0.05} on={(n) => set({ lineHeight: n })} />
              </div>
              <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface2)]/50 p-2.5">
                <p className={label}>Text Shape · ตัวหนังสือโค้ง — SVG textPath (ไทยไม่เพี้ยน)</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {([["off", "Off · ปิด"], ["arc-top", "Arc Top"], ["arc-bottom", "Arc Bottom"], ["circle", "Circle"]] as [CurveMode, string][]).map(([m, l]) => (
                    <button key={m} onClick={() => set({ curveMode: m, curve: m === "off" ? 0 : ts.curve === 0 ? 55 : ts.curve })} className={`rounded-lg border px-1 py-1.5 text-[10px] font-bold ${ts.curveMode === m ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white" : "border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]"}`} title={m === "off" ? titleAttr("Straight text", "ตัวตรง") : titleAttr(`Curve mode ${m}`, "โหมดโค้ง")}>{l}</button>
                  ))}
                </div>
                <Slider l="Curve" th="ความโค้ง -180 ถึง 180 (0 = ตรง)" v={ts.curve} min={-100} max={100} step={1} on={(n) => set({ curve: n, curveMode: n === 0 ? "off" : ts.curveMode === "off" ? "arc-top" : ts.curveMode })} unit="%" />
                <Slider l="Arc radius" th="รัศมีโค้ง" v={ts.arcRadius} min={50} max={500} step={5} on={(n) => set({ arcRadius: n })} unit="px" />
                <Slider l="Rotate" th="เอียงทั้งก้อน (Doja Cat ใช้ -2°)" v={ts.rotate} min={-30} max={30} step={0.5} on={(n) => set({ rotate: n })} unit="°" />
                <div className="flex flex-wrap gap-2">
                  <Toggle l="Hearts ♥" v={ts.hearts} on={(b) => set({ hearts: b })} th="หัวใจลอย (Ariana)" />
                  <button onClick={() => set({ curve: 0, curveMode: "off", rotate: 0 })} className={btnGhost} title={titleAttr("Reset shape", "รีเซ็ตทรง")}>Reset shape</button>
                </div>
                <p className="text-[10px] leading-relaxed text-[var(--muted)]">Curve ≠ 0 → lyrics render on an SVG arc path, centered, same font/size/color/glow. Thai vowel marks stay attached. · เลื่อน Curve เพื่อโค้งขึ้น/ลง, Circle = วงกลมเต็ม</p>
              </div>
              <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface2)]/50 p-2.5">
                <p className={label}>Align &amp; Position · จัดวาง — แยก “ตำแหน่งกล่อง” ออกจาก “การจัดตัวหนังสือในกล่อง”</p>
                <p className={`${label} normal-case tracking-normal`}>Horizontal · แนวนอน (ในกล่อง)</p>
                <div className="flex gap-2">
                  {([["left", AlignLeft, "ชิดซ้าย"], ["center", AlignCenter, "กึ่งกลาง"], ["right", AlignRight, "ชิดขวา"]] as const).map(([a, Icon, th]) => (
                    <button key={a} onClick={() => set({ align: a })} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-bold ${ts.align === a ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white" : "border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]"}`} title={titleAttr(`Align ${a}`, th)}><Icon className="h-3.5 w-3.5" />{a}</button>
                  ))}
                </div>
                <p className={`${label} normal-case tracking-normal`}>Vertical anchor · จุดยึดแนวตั้ง (กันเนื้อเพลงกระโดดสูง-ต่ำ)</p>
                <div className="flex gap-2">
                  {([["top", AlignStartVertical, "บน"], ["center", AlignCenterVertical, "กลาง"], ["bottom", AlignEndVertical, "ล่าง"]] as const).map(([v, Icon, th]) => (
                    <button key={v} onClick={() => set({ vAlign: v })} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-bold ${ts.vAlign === v ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white" : "border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]"}`} title={titleAttr(`Anchor ${v}`, th)}><Icon className="h-3.5 w-3.5" />{v}</button>
                  ))}
                </div>
                <p className={`${label} normal-case tracking-normal`}>Box width · ความกว้างกล่อง (คุมการตัดบรรทัด)</p>
                <div className="flex gap-2">
                  {([["auto", "Auto"], ["85", "85%"], ["80", "80%"], ["full", "Full"]] as [TextWidthMode, string][]).map(([w, l]) => (
                    <button key={w} onClick={() => set({ textWidth: w })} className={`flex-1 rounded-lg border py-1.5 text-[11px] font-bold ${ts.textWidth === w ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white" : "border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)]"}`}>{l}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => set({ x: 50, y: 50 })} className={btnGhost} title={titleAttr("Snap to center", "จัดกึ่งกลาง")}><Crosshair className="h-3.5 w-3.5" /> Center</button>
                  <button onClick={resetPosition} className={btnGhost} title={titleAttr("Reset position & scale", "รีเซ็ตตำแหน่ง")}><RotateCcw className="h-3.5 w-3.5" /> Reset position</button>
                  <button onClick={() => set({ locked: !ts.locked })} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${ts.locked ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-[var(--border)] bg-[var(--surface2)]"}`} title={titleAttr("Lock position", "ล็อกตำแหน่ง")}>{ts.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />} {ts.locked ? "Unlock" : "Lock position"}</button>
                </div>
                <p className="mono rounded-lg bg-black/50 px-2.5 py-1.5 text-center text-[11px] font-bold text-[var(--accent)]">X: {ts.x.toFixed(1)}% &nbsp;·&nbsp; Y: {ts.y.toFixed(1)}% &nbsp;·&nbsp; Scale: {ts.scale.toFixed(2)}×{dragging ? " · LIVE" : ""}</p>
                <Slider l="Position X" th="ตำแหน่งแนวนอน" v={ts.x} min={0} max={100} step={0.5} on={(n) => set({ x: n })} unit="%" />
                <Slider l="Position Y" th="ตำแหน่งแนวตั้ง" v={ts.y} min={0} max={100} step={0.5} on={(n) => set({ y: n })} unit="%" />
                <p className="flex items-center gap-1.5 text-[10px] leading-relaxed text-[var(--muted)]"><Move className="h-3 w-3 shrink-0" /> Drag the text on stage, drag corners to scale. Near center it snaps (3%). Lock stops accidental drags. · ลากบนเวทีได้เลย ใกล้กลางจะดูดเข้ากึ่งกลาง</p>
              </div>
              <div className="space-y-2.5">
                <p className={label}>Color &amp; Box · สีและกล่องข้อความ</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold"><input type="color" value={ts.color} onChange={(e) => set({ color: e.target.value })} /> Text</label>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold"><input type="color" value={ts.boxColor} onChange={(e) => set({ boxColor: e.target.value })} /> Box</label>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold"><input type="color" value={ts.glowColor} onChange={(e) => set({ glowColor: e.target.value })} /> Glow</label>
                </div>
                <Slider l="Text opacity" th="ความทึบข้อความ" v={Math.round(ts.opacity * 100)} min={0} max={100} on={(n) => set({ opacity: n / 100 })} unit="%" />
                <Slider l="Box opacity" th="ความทึบกล่องหลังข้อความ (0 = ไม่มีกล่อง)" v={Math.round(ts.boxOpacity * 100)} min={0} max={100} on={(n) => set({ boxOpacity: n / 100 })} unit="%" />
                <div className="grid grid-cols-2 gap-2">
                  <Slider l="Box padding" th="ระยะขอบในกล่อง" v={ts.boxPadding} min={0} max={60} on={(n) => set({ boxPadding: n })} unit="px" />
                  <Slider l="Box radius" th="ความโค้งมุมกล่อง" v={ts.boxRadius} min={0} max={60} on={(n) => set({ boxRadius: n })} unit="px" />
                </div>
                <Slider l="Backdrop blur" th="เบลอพื้นหลังหลังข้อความ" v={ts.backdropBlur} min={0} max={20} on={(n) => set({ backdropBlur: n })} unit="px" />
              </div>
              <div className="space-y-2.5">
                <p className={label}>Stroke · Shadow · Glow</p>
                <div className="flex flex-wrap gap-2">
                  <Toggle l="Stroke" v={ts.strokeOn} on={(b) => set({ strokeOn: b })} th="ขอบตัวอักษร" />
                  <Toggle l="Shadow" v={ts.shadowOn} on={(b) => set({ shadowOn: b })} th="เงา" />
                  <Toggle l="Glow" v={ts.glowOn} on={(b) => set({ glowOn: b })} th="เรืองแสงนีออน" />
                  <Toggle l="Grain" v={ts.grain} on={(b) => set({ grain: b })} th="เกรนฟิล์ม" />
                  <Toggle l="Chroma" v={ts.chroma} on={(b) => set({ chroma: b })} th="ขอบสี RGB แยก" />
                </div>
                {ts.strokeOn && (<div className="grid grid-cols-2 gap-2"><Slider l="Stroke width" th="ความหนาขอบ" v={ts.strokeWidth} min={0} max={10} step={0.5} on={(n) => set({ strokeWidth: n })} unit="px" /><label className="flex items-center gap-1.5 text-[11px] font-semibold"><input type="color" value={ts.strokeColor} onChange={(e) => set({ strokeColor: e.target.value })} /> Stroke color</label></div>)}
                {ts.shadowOn && (<div className="grid grid-cols-2 gap-2"><Slider l="Shadow X" th="เงาแนวนอน" v={ts.shadowX} min={-20} max={20} on={(n) => set({ shadowX: n })} /><Slider l="Shadow Y" th="เงาแนวตั้ง" v={ts.shadowY} min={-20} max={20} on={(n) => set({ shadowY: n })} /><Slider l="Shadow blur" th="ความฟุ้งของเงา" v={ts.shadowBlur} min={0} max={40} on={(n) => set({ shadowBlur: n })} /><label className="flex items-center gap-1.5 text-[11px] font-semibold"><input type="color" value={ts.shadowColor} onChange={(e) => set({ shadowColor: e.target.value })} /> Shadow color</label></div>)}
                {ts.glowOn && <Slider l="Glow intensity" th="ความแรงเรืองแสง" v={ts.glowIntensity} min={0} max={60} on={(n) => set({ glowIntensity: n })} unit="px" />}
              </div>
              <div className="space-y-2.5">
                <p className={label}>Animation · แอนิเมชันข้อความ</p>
                <div className="grid grid-cols-2 gap-2">{ANIMATIONS.map((a) => (<button key={a} onClick={() => set({ animation: a })} className={`rounded-lg border px-2 py-2 text-left text-[11px] font-bold ${ts.animation === a ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface2)]"}`}>{a}</button>))}</div>
                <Slider l="Anim speed" th="ความเร็วแอนิเมชัน" v={ts.animSpeed} min={0.2} max={3} step={0.1} on={(n) => set({ animSpeed: n })} unit="×" />
                <div className="grid grid-cols-2 gap-2"><Slider l="Fade in (s)" th="เวลาเฟดเข้า" v={ts.fadeIn} min={0} max={2} step={0.1} on={(n) => set({ fadeIn: n })} /><Slider l="Fade out (s)" th="เวลาเฟดออก" v={ts.fadeOut} min={0} max={2} step={0.1} on={(n) => set({ fadeOut: n })} /></div>
              </div>
            </>)}

            {tab === "background" && (<>
              {!selBgItem && <p className="py-8 text-center text-xs leading-relaxed text-[var(--muted)]">Select a background from the library first.<br />เลือกพื้นหลังจากคลังด้านซ้ายก่อน</p>}
              {selBgItem && (<div className="space-y-3.5">
                <div><p className="truncate text-xs font-bold">{selBgItem.name}</p><p className={label}>{selBgItem.kind} · {selBgItem.mediaDur ? `${fmt(selBgItem.mediaDur)} long` : "—"}</p></div>
                {(selBgItem.kind === "image" || selBgItem.kind === "gif") && <Slider l="Show duration (s)" th="แสดงกี่วินาที" v={selBgItem.duration} min={1} max={30} step={0.5} on={(n) => patchBg(selBgItem.id, { duration: n })} />}
                <div>
                  <p className={`${label} mb-2`}>Loop · การวนซ้ำ</p>
                  <div className="flex flex-wrap gap-2"><Toggle l="Loop" v={selBgItem.loop} on={(b) => patchBg(selBgItem.id, { loop: b })} th="วนคลิปนี้ซ้ำ" /></div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {([["normal", "Normal"], ["seamless", "Seamless Fade"], ["reverse", "Ping-Pong"]] as [LoopMode, string][]).map(([m, l]) => (
                      <button key={m} onClick={() => patchBg(selBgItem.id, { loopMode: m })} className={`rounded-lg border px-1.5 py-1.5 text-[10px] font-bold ${selBgItem.loopMode === m ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface2)]"}`} title={m === "seamless" ? titleAttr("Cuts the tail and crossfades into the head — no black frame", "ตัดท้ายคลิปแล้วเฟดเข้าหัวคลิป วนเนียนไม่มีจอดำ") : m === "reverse" ? titleAttr("Plays forward then backward", "เล่นไปหน้าแล้วถอยหลัง") : titleAttr("Jump back to start", "กระโดดกลับไปเริ่มใหม่")}>{l}</button>
                    ))}
                  </div>
                </div>
                {selBgItem.kind === "video" && (<div className="space-y-2.5"><p className={label}>Trim · ตัดคลิป</p><Slider l="Trim start (s)" th="เริ่มที่วินาที" v={selBgItem.trimStart} min={0} max={Math.max(0, selBgItem.mediaDur - 0.5)} step={0.1} on={(n) => patchBg(selBgItem.id, { trimStart: n })} /><Slider l="Trim end (s)" th="จบที่วินาที" v={selBgItem.trimEnd} min={0.5} max={Math.max(1, selBgItem.mediaDur)} step={0.1} on={(n) => patchBg(selBgItem.id, { trimEnd: n })} /></div>)}
                <div className="space-y-2.5">
                  <p className={label}>Filters · ฟิลเตอร์</p>
                  <Slider l="Blur" th="เบลอ" v={selBgItem.blur} min={0} max={30} on={(n) => patchBg(selBgItem.id, { blur: n })} unit="px" />
                  <Slider l="Brightness" th="ความสว่าง" v={selBgItem.brightness} min={0} max={200} on={(n) => patchBg(selBgItem.id, { brightness: n })} unit="%" />
                  <Slider l="Contrast" th="คอนทราสต์" v={selBgItem.contrast} min={0} max={200} on={(n) => patchBg(selBgItem.id, { contrast: n })} unit="%" />
                  <div className="flex items-center gap-3"><label className="flex items-center gap-1.5 text-[11px] font-semibold"><input type="color" value={selBgItem.tint} onChange={(e) => patchBg(selBgItem.id, { tint: e.target.value })} /> Tint</label><div className="min-w-0 flex-1"><Slider l="Tint opacity" th="ความทึบสีทินต์" v={Math.round(selBgItem.tintOpacity * 100)} min={0} max={100} on={(n) => patchBg(selBgItem.id, { tintOpacity: n / 100 })} unit="%" /></div></div>
                </div>
                <div>
                  <p className={`${label} mb-2`}>Fit · การจัดภาพ</p>
                  <div className="grid grid-cols-3 gap-2">{(["cover", "contain", "stretch"] as const).map((f) => (<button key={f} onClick={() => patchBg(selBgItem.id, { fit: f })} className={`rounded-lg border py-1.5 text-[11px] font-bold capitalize ${selBgItem.fit === f ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface2)]"}`}>{f}</button>))}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => moveBg(selBgItem.id, -1)} className={`${btnGhost} flex-1 justify-center`}>↑ Earlier</button>
                  <button onClick={() => moveBg(selBgItem.id, 1)} className={`${btnGhost} flex-1 justify-center`}>↓ Later</button>
                  <button onClick={() => setBackgrounds((prev) => prev.filter((x) => x.id !== selBgItem.id))} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-900 bg-red-950/40 px-2 py-1.5 text-[11px] font-semibold text-red-300"><Trash2 className="h-3 w-3" /> Delete</button>
                </div>
              </div>)}
            </>)}

            {tab === "presets" && (<>
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">One click applies font + color + animation + position, inspired by iconic lyric videos. Tweak anything after.<br />คลิกเดียวเปลี่ยนฟอนต์ สี แอนิเมชัน และตำแหน่ง — ปรับต่อได้ทุกอย่าง</p>
              <p className={`${label} pt-1`}>Thai · เพลงไทย — T-Pop / ลูกทุ่ง / หมอลำ</p>
              <div className="grid grid-cols-2 gap-2">
                {THAI_PRESETS.map((p) => (
                  <button key={p.name} onClick={() => applyPreset(p)} className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-2.5 text-left transition hover:border-[var(--accent)]" title={titleAttr(`Apply ${p.name} style`, `ใช้สไตล์ ${p.name}`)}>
                    <span className="block truncate text-base leading-tight" style={{ fontFamily: `'${p.style.fontFamily || "Prompt"}'`, fontWeight: p.style.weight || 700, fontStyle: p.style.italic ? "italic" : "normal", color: p.style.color || "#fff", textShadow: p.style.glowOn ? `0 0 10px ${p.style.glowColor}` : undefined }}>สวัสดี</span>
                    <span className="mt-1.5 flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.dot }} /><span className="min-w-0"><span className="block truncate text-[10px] font-bold leading-tight">{p.name}</span><span className="block truncate text-[9px] leading-tight text-[var(--muted)]">{p.artist}</span></span></span>
                  </button>
                ))}
              </div>
              <p className={`${label} pt-1`}>International · สากล</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button key={p.name} onClick={() => applyPreset(p)} className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-2.5 text-left transition hover:border-[var(--accent)]" title={titleAttr(`Apply ${p.name} style`, `ใช้สไตล์ ${p.name}`)}>
                    <span className="block truncate text-base leading-tight" style={{ fontFamily: `'${p.style.fontFamily || "Inter"}'`, fontWeight: p.style.weight || 700, fontStyle: p.style.italic ? "italic" : "normal", color: p.style.color || "#fff", textShadow: p.style.glowOn ? `0 0 10px ${p.style.glowColor}` : undefined }}>Lyric</span>
                    <span className="mt-1.5 flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.dot }} /><span className="min-w-0"><span className="block truncate text-[10px] font-bold leading-tight">{p.name}</span><span className="block truncate text-[9px] leading-tight text-[var(--muted)]">{p.artist}</span></span></span>
                  </button>
                ))}
              </div>
              {customPresets.length > 0 && (<>
                <p className={`${label} pt-1`}>My presets · พรีเซ็ตของฉัน</p>
                <div className="grid grid-cols-2 gap-2">{customPresets.map((p, i) => (<button key={p.name + i} onClick={() => applyPreset(p)} className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-2.5 text-left"><span className="block truncate text-sm font-bold" style={{ color: p.style.color || "#fff", fontFamily: `'${p.style.fontFamily || "Inter"}'` }}>Lyric</span><span className="mt-1 block truncate text-[10px] font-semibold">{p.name}</span></button>))}</div>
              </>)}
              <button onClick={() => void saveCustomPreset()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-xs font-bold text-white" title={titleAttr("Save current text style as a preset", "บันทึกสไตล์ปัจจุบันเป็นพรีเซ็ต")}><Save className="h-3.5 w-3.5" /> Save as Custom Preset · บันทึกพรีเซ็ตของฉัน</button>
            </>)}
          </div>
        </aside>
      </main>

      <footer className="shrink-0 border-t border-[var(--border)] px-4 py-1.5"><p className={`${label} text-center`}>LV Pro Studio V2 — you bring the media, we bring the stage · ไม่ใช้ AI สร้างภาพ ทุกอย่างมาจากไฟล์ของคุณ</p></footer>
      <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { if (recording) { exportStopRef.current?.(); } else if (loopPreview) { seek(0); void audioRef.current?.play().catch(() => {}); } else setPlaying(false); }} className="hidden" />
    </div>
  );
}

function Hearts() {
  const hearts = ["12%", "30%", "52%", "70%", "86%"];
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {hearts.map((left, i) => (
        <span key={i} className="heart-particle absolute bottom-1 text-pink-300" style={{ left, fontSize: 13 + (i % 3) * 4, animationDelay: `${i * 0.65}s`, textShadow: "0 0 8px rgba(249,168,212,.9)" }}>♥</span>
      ))}
    </span>
  );
}

function Waveform({ audioUrl, progress, onSeek, tall = false }: { audioUrl: string | null; progress: number; onSeek: (p: number) => void; tall?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<number[]>([]);
  useEffect(() => {
    peaksRef.current = Array.from({ length: 100 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 1.7)) * 0.6 + ((i * 37) % 13) / 40);
    if (!audioUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const buf = await (await fetch(audioUrl)).arrayBuffer();
        const AC = new AudioContext(); const decoded = await AC.decodeAudioData(buf);
        if (cancelled) return;
        const ch = decoded.getChannelData(0); const peaks: number[] = []; const block = Math.floor(ch.length / 100) || 1;
        for (let i = 0; i < 100; i++) { let max = 0; for (let j = 0; j < block; j += Math.ceil(block / 60)) max = Math.max(max, Math.abs(ch[i * block + j] || 0)); peaks.push(Math.max(0.06, max)); }
        peaksRef.current = peaks; void AC.close();
      } catch { /* keep synthetic peaks */ }
    })();
    return () => { cancelled = true; };
  }, [audioUrl]);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.width, H = c.height; ctx.clearRect(0, 0, W, H);
    peaksRef.current.forEach((p, i) => { const h = Math.max(3, p * (H - 6)); ctx.fillStyle = (i / 100) <= progress ? "#8B5CF6" : "#3A3A46"; ctx.fillRect(i * (W / 100) + 1, (H - h) / 2, 2.6, h); });
  }, [progress, audioUrl]);
  return (<canvas ref={ref} width={560} height={tall ? 64 : 44} className={`mt-2 w-full cursor-pointer rounded-lg bg-black/40 ${tall ? "h-12" : "h-10"}`} onClick={(e) => { const r = (e.target as HTMLCanvasElement).getBoundingClientRect(); onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); }} title="Waveform — click to seek · คลิกเพื่อเลื่อนเวลา" />);
}

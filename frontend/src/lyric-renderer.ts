import type { TextStyle } from './App';

export type LyricFrame = {
  text: string;
  elapsed: number;
  duration: number;
  style: TextStyle;
  referenceWidth: number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const units = (text: string): string[] => {
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(item => item.segment);
  }
  return Array.from(text);
};
const words = (text: string): string[] => {
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(undefined, {granularity:'word'}).segment(text)].map(item => item.segment);
  }
  return text.split(/(\s+)/).filter(Boolean);
};

/** Draw the same deterministic lyric frame in the editor and in the export. */
export function drawLyricFrame(ctx: CanvasRenderingContext2D, width: number, height: number, frame: LyricFrame): void {
  const { style: s } = frame;
  const scale = width / frame.referenceWidth;
  const fontSize = s.fontSize * 1.6 * scale * s.scale;
  const text = s.uppercase ? frame.text.toUpperCase() : frame.text;
  const time = Math.max(0, frame.elapsed);
  const duration = Math.max(.05, frame.duration);
  const progress = clamp(time / duration * s.animSpeed);
  const letterSpacing = s.letterSpacing * scale * s.scale;
  const maxWidth = width * (s.textWidth === 'full' ? .92 : s.textWidth === '80' ? .8 : .85) * s.scale;
  const padding = (s.boxOpacity ? s.boxPadding : 8) * scale * s.scale;
  const lineHeight = fontSize * s.lineHeight;

  ctx.save();
  ctx.font = `${s.italic ? 'italic ' : ''}${s.weight} ${fontSize}px '${s.fontFamily}', sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = `${letterSpacing}px`;
  const measure = (value: string) => ctx.measureText(value).width;
  const graphemes = units(text);
  const lines: string[] = [];
  let line = '';
  // Grapheme wrapping keeps Thai vowel marks and emoji attached to their base characters.
  for (const char of graphemes) {
    if (char === '\n') { lines.push(line); line = ''; continue; }
    if (line && measure(line + char) > Math.max(1, maxWidth - 2 * padding)) {
      lines.push(line.trimEnd()); line = char.trimStart();
    } else line += char;
  }
  if (line || !lines.length) lines.push(line);
  const blockHeight = lines.length * lineHeight;
  const boxHeight = blockHeight + padding * 2;
  const boxWidth = maxWidth;
  const x = width * s.x / 100;
  const y = height * s.y / 100;
  const left = s.align === 'left' ? 0 : s.align === 'right' ? -boxWidth : -boxWidth / 2;
  const top = s.vAlign === 'top' ? 0 : s.vAlign === 'bottom' ? -boxHeight : -boxHeight / 2;
  ctx.translate(x, y);
  ctx.rotate(s.rotate * Math.PI / 180);

  const intro = clamp(time * s.animSpeed / .6);
  const fadeIn = s.fadeIn > 0 ? clamp(time / s.fadeIn) : 1;
  const fadeOut = s.fadeOut > 0 ? clamp((duration - time) / s.fadeOut) : 1;
  ctx.globalAlpha = s.opacity * Math.min(fadeIn, fadeOut);
  if (s.animation === 'Center Fade' || s.animation === 'Blur Smoke') ctx.globalAlpha *= intro;
  if (s.animation === 'Floating Handwritten') ctx.translate(0, Math.sin(time * 1.5) * fontSize * .10);
  if (s.animation === 'Glitch & Scale' || s.animation === 'Glitch RGB') {
    if (Math.floor(time * 12) % 19 === 0) ctx.translate(fontSize * .06, 0);
  }
  if (s.animation === 'Neon Flicker' && Math.floor(time * 12) % 23 === 0) ctx.globalAlpha *= .45;
  if (s.animation === 'Blur Smoke') ctx.filter = `blur(${(1 - intro) * fontSize * .16}px)`;
  if (s.animation === 'Rubber Band') ctx.scale(1 + Math.sin(intro * Math.PI * 4) * (1 - intro) * .2, 1 - Math.sin(intro * Math.PI * 4) * (1 - intro) * .12);
  if (s.animation === '3D Flip') ctx.scale(1, Math.max(.05, intro));
  if (s.animation === 'Kinetic Slide') ctx.translate((1 - intro) * -fontSize, 0);

  if (s.backdropBlur > 0) {
    const copy = document.createElement('canvas');
    copy.width = width; copy.height = height;
    copy.getContext('2d')?.drawImage(ctx.canvas, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.roundRect(left, top, boxWidth, boxHeight, s.boxRadius * scale); ctx.clip();
    ctx.resetTransform(); ctx.globalAlpha = 1; ctx.filter = `blur(${s.backdropBlur * scale}px)`;
    ctx.drawImage(copy, 0, 0); ctx.restore();
  }
  if (s.boxOpacity > 0) {
    ctx.save(); ctx.globalAlpha *= s.boxOpacity; ctx.fillStyle = s.boxColor;
    ctx.beginPath(); ctx.roundRect(left, top, boxWidth, boxHeight, s.boxRadius * scale); ctx.fill(); ctx.restore();
  }
  if (s.shadowOn || s.glowOn) {
    ctx.shadowColor = s.glowOn ? s.glowColor : s.shadowColor;
    ctx.shadowBlur = (s.glowOn ? s.glowIntensity : s.shadowBlur) * scale;
    ctx.shadowOffsetX = s.glowOn ? 0 : s.shadowX * scale;
    ctx.shadowOffsetY = s.glowOn ? 0 : s.shadowY * scale;
  }
  ctx.fillStyle = s.color;
  ctx.strokeStyle = s.strokeColor;
  ctx.lineWidth = s.strokeWidth * scale * 2;
  const paint = (value: string, px: number, py: number) => {
    if (s.chroma || s.animation === 'Glitch RGB') {
      ctx.save(); ctx.globalAlpha *= .55; ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff2050'; ctx.fillText(value, px + 2 * scale, py);
      ctx.fillStyle = '#00dfff'; ctx.fillText(value, px - 2 * scale, py); ctx.restore();
    }
    if (s.strokeOn) ctx.strokeText(value, px, py);
    ctx.fillText(value, px, py);
  };
  const textProgressCount = Math.floor(progress * graphemes.length);
  const wordCount = Math.max(1, lines.flatMap(words).filter(word => word.trim()).length);
  let wordIndex = 0;
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    const full = lines[i];
    const lineUnits = units(full);
    let visible = full;
    if (s.animation === 'Typewriter + Cursor') {
      visible = lineUnits.slice(0, Math.max(0, textProgressCount - seen)).join('');
    }
    const lineWidth = measure(full);
    const lineX = s.align === 'left' ? left + padding : s.align === 'right' ? left + boxWidth - padding - lineWidth : left + (boxWidth - lineWidth) / 2;
    const lineY = top + padding + lineHeight * (i + .5);
    if (s.curveMode !== 'off' && s.curve !== 0) {
      let cursor = -lineWidth / 2;
      const radius = Math.max(fontSize, s.arcRadius * scale);
      const direction = (s.curveMode === 'arc-bottom' ? -1 : 1) * Math.sign(s.curve);
      for (const char of lineUnits) {
        const charWidth = measure(char);
        const theta = s.curveMode === 'circle'
          ? (cursor + charWidth / 2) / Math.max(1, lineWidth) * 2 * Math.PI
          : (cursor + charWidth / 2) / radius * Math.min(1.8, Math.abs(s.curve) / 100);
        ctx.save();
        ctx.translate(lineX + lineWidth / 2 + Math.sin(theta) * radius, lineY + direction * (1 - Math.cos(theta)) * radius);
        ctx.rotate(direction * theta);
        paint(char, -charWidth / 2, 0);
        ctx.restore();
        cursor += charWidth;
      }
    } else if (s.animation === 'Word-by-Word Pop' || s.animation === 'Bounce Pop' || s.animation === 'Kinetic Slide') {
      let cursor = lineX;
      for (const word of words(full)) {
        const wordWidth = measure(word);
        if (!word.trim()) { cursor += wordWidth; continue; }
        const phase = clamp((time * s.animSpeed - wordIndex * duration / wordCount) / .35);
        if (phase > 0) {
          const bounce = s.animation === 'Bounce Pop' ? 1 + Math.sin(phase * Math.PI) * .25 : .8 + .2 * phase;
          ctx.save();
          ctx.translate(cursor + wordWidth / 2, lineY);
          if (s.animation === 'Kinetic Slide') ctx.translate((1 - phase) * (wordIndex % 2 ? fontSize : -fontSize), 0);
          ctx.scale(bounce, bounce);
          ctx.globalAlpha *= phase;
          if (s.glowOn && progress >= wordIndex / wordCount && progress < (wordIndex + 1) / wordCount) ctx.fillStyle = s.glowColor;
          paint(word, -wordWidth / 2, 0);
          ctx.restore();
        }
        cursor += wordWidth; wordIndex++;
      }
    } else if (s.animation === 'Wave Flow') {
      let cursor = lineX;
      for (let j = 0; j < lineUnits.length; j++) {
        const char = lineUnits[j]; const offset = Math.sin(time * 5 - (seen + j) * .5) * fontSize * .1;
        paint(char, cursor, lineY + offset); cursor += measure(char);
      }
    } else {
      paint(visible, lineX, lineY);
      if (s.animation === 'Karaoke Fill') {
        ctx.save(); ctx.beginPath(); ctx.rect(lineX, lineY - lineHeight, lineWidth * progress, lineHeight * 2); ctx.clip();
        ctx.fillStyle = s.glowOn ? s.glowColor : '#C4B5FD'; ctx.shadowBlur = 0; ctx.fillText(full, lineX, lineY); ctx.restore();
      }
      if (s.animation === 'Typewriter + Cursor' && Math.floor(time * 2) % 2 === 0 && textProgressCount >= seen && textProgressCount <= seen + lineUnits.length) ctx.fillText('|', lineX + measure(visible), lineY);
    }
    seen += lineUnits.length;
  }
  if (s.hearts) {
    ctx.save(); ctx.fillStyle = s.glowOn ? s.glowColor : '#f9a8d4'; ctx.shadowBlur = 0;
    ctx.font = `${Math.max(8, fontSize * .35)}px sans-serif`;
    for (let i = 0; i < 6; i++) {
      const phase = (time * .32 + i / 6) % 1;
      ctx.globalAlpha *= .9;
      ctx.fillText('♥', left + (i + .5) * boxWidth / 6, top - phase * fontSize * 1.8);
    }
    ctx.restore();
  }
  ctx.restore();
}

export function drawGrain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save(); ctx.globalAlpha = .06; ctx.fillStyle = '#ffffff';
  let seed = 23917;
  for (let i = 0; i < 1400; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed / 4294967296 * width;
    seed = (seed * 1664525 + 1013904223) >>> 0; const y = seed / 4294967296 * height;
    ctx.fillRect(x, y, Math.max(1, width / 1280), Math.max(1, height / 720));
  }
  ctx.restore();
}

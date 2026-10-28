import assert from 'node:assert/strict';
import { drawLyricFrame } from './lyric-renderer.ts';

function frameAt(time, animation, text = 'Hello test') {
  const drawn = [];
  const ctx = {
    canvas: {}, globalAlpha: 1,
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, beginPath() {}, roundRect() {}, clip() {}, rect() {}, fill() {},
    measureText(value) { return {width: [...value].length * 10}; },
    fillText(value) { drawn.push(value); }, strokeText() {},
  };
  const style = {
    fontSize: 48, scale: 1, fontFamily: 'Inter', weight: 700, italic: false,
    letterSpacing: 0, lineHeight: 1.25, textWidth: '85', boxOpacity: 0,
    boxPadding: 0, boxRadius: 0, x: 50, y: 50, align: 'center', vAlign: 'center',
    uppercase: false, animSpeed: 1, animation, rotate: 0, opacity: 1, fadeIn: 0, fadeOut: 0,
    shadowOn: false, glowOn: false, chroma: false, strokeOn: false, color: '#fff',
    strokeColor: '#000', strokeWidth: 0, curveMode: 'off', curve: 0, backdropBlur: 0, hearts: false,
  };
  drawLyricFrame(ctx, 1280, 720, {text, elapsed: time, duration: 4, style, referenceWidth: 1280});
  return drawn;
}

const early = frameAt(.5, 'Typewriter + Cursor')[0];
const late = frameAt(3, 'Typewriter + Cursor')[0];
assert.ok(late.length > early.length && 'Hello test'.startsWith(late));
assert.ok(frameAt(1, 'Karaoke Fill').includes('Hello test'));
const thai = frameAt(2, 'Wave Flow', 'ท้องฟ้า');
assert.equal(thai.join(''), 'ท้องฟ้า');
assert.ok(thai.some(cluster => cluster.length > 1), 'Thai combining marks stay with their base');
assert.deepEqual(frameAt(1, 'Word-by-Word Pop', 'one two three').filter(Boolean), ['one']);

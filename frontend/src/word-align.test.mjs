import assert from 'node:assert/strict';
import { alignLyricWords } from './word-align.mjs';

const source = [
  { id: 'a', time: 1, text: 'Lights out on the city,' },
  { id: 'b', time: 3, text: 'cold rain on Sukhumvit,' },
];
const recognized = [
  { text: 'Lights', start: 0.9, end: 1.15 },
  { text: 'out', start: 1.16, end: 1.4 },
  { text: 'city', start: 1.7, end: 2.0 },
  { text: 'cold', start: 3.05, end: 3.3 },
  { text: 'rain', start: 3.31, end: 3.6 },
  { text: 'on', start: 3.61, end: 3.78 },
  { text: 'Sukhumvit', start: 3.8, end: 4.3 },
];
const aligned = alignLyricWords(source, recognized);
assert.deepEqual(aligned.map(line => line.text), source.map(line => line.text), 'original lyrics must stay intact');
assert.deepEqual(aligned.map(line => line.time), source.map(line => line.time), 'original line timing must stay intact');
assert.deepEqual(aligned.map(line => line.wordTimings.length), [5, 4]);
assert.equal(aligned[0].wordTimings[0].start, 0.9);
assert.equal(aligned[0].wordTimings[4].start, 1.7);
for (const line of aligned) {
  for (const word of line.wordTimings) assert.ok(word.end > word.start, 'every lyric word needs a valid time span');
}

const noTranscript = alignLyricWords([{ id: 'c', time: 10, text: 'A quiet night' }], []);
assert.equal(noTranscript[0].wordTimings.length, 3, 'missing transcript words still get editable estimated timing');
console.log('LRC text preserved and Whisper word timings aligned');

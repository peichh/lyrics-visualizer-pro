import { strict as assert } from 'node:assert';
import { parseTimestampedLyrics } from './lyrics-parser.mjs';

assert.deepEqual(parseTimestampedLyrics('[00:01.11]Lights out\n[00:03.11]cold rain'), [
  { time: 1.11, text: 'Lights out' }, { time: 3.11, text: 'cold rain' }
]);
assert.deepEqual(parseTimestampedLyrics('[offset:-500]\n[00:02.0][00:04.25] ใช่'), [
  { time: 1.5, text: 'ใช่' }, { time: 3.75, text: 'ใช่' }
]);
assert.deepEqual(parseTimestampedLyrics('1\n00:00:01,100 --> 00:00:02,000\nHello'), [
  { time: 1.1, text: 'Hello' }
]);

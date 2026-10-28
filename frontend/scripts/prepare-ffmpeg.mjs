import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const base = join(dirname(require.resolve('@ffmpeg/core')), '..', 'esm');
const destination = new URL('../public/ffmpeg/', import.meta.url);
await mkdir(destination, { recursive: true });
await copyFile(join(base, 'ffmpeg-core.js'), new URL('ffmpeg-core.js', destination));
const wasm = await readFile(join(base, 'ffmpeg-core.wasm'));
const midpoint = Math.ceil(wasm.length / 2);
await Promise.all([
  writeFile(new URL('core-part-0.bin', destination), wasm.subarray(0, midpoint)),
  writeFile(new URL('core-part-1.bin', destination), wasm.subarray(midpoint)),
]);

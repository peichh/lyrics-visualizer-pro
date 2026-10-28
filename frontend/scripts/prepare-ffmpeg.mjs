import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const base = join(dirname(require.resolve('@ffmpeg/core')), '..', 'esm');
const destination = new URL('../public/ffmpeg/', import.meta.url);
await mkdir(destination, { recursive: true });
await copyFile(join(base, 'ffmpeg-core.js'), new URL('ffmpeg-core.js', destination));
const wasm = await readFile(join(base, 'ffmpeg-core.wasm'));
const gzipAsync = promisify(gzip);
await writeFile(new URL('ffmpeg-core.wasm.gz', destination), await gzipAsync(wasm, { level: 9 }));
await Promise.all(['core-part-0.bin', 'core-part-1.bin'].map(name => rm(new URL(name, destination), { force: true })));

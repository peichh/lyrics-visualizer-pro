
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../../database/projects.json');

type LyricCue = {
  id: string; time: number; endTime: number; text: string;
  x: number; y: number; scale: number; rotation: number;
  preset: string; style: any;
};

type Project = {
  id: string; title: string; artist: string; audioUrl: string; duration: number;
  lyrics: LyricCue[]; backgrounds: any[]; camera: any[]; visualizer: any;
};

type Data = { projects: Project[] };

const adapter = new JSONFile<Data>(dbPath);
export const db = new Low<Data>(adapter, { projects: [] });

export async function initDB() {
  await db.read();
  if (!db.data) db.data = { projects: [] };
  await db.write();
  console.log('DB ready:', dbPath);
}

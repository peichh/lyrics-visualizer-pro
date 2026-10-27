
import express from 'express';
import { db } from '../db/database.js';
import { v4 as uuid } from 'uuid';

const router = express.Router();

router.get('/', async (req, res) => {
  await db.read();
  res.json(db.data.projects);
});

router.get('/:id', async (req, res) => {
  await db.read();
  const p = db.data.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

router.post('/', async (req, res) => {
  await db.read();
  const newProject = { id: uuid(), ...req.body };
  db.data.projects.push(newProject);
  await db.write();
  res.json(newProject);
});

router.put('/:id', async (req, res) => {
  await db.read();
  const idx = db.data.projects.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  db.data.projects[idx] = { ...db.data.projects[idx], ...req.body };
  await db.write();
  res.json(db.data.projects[idx]);
});

router.delete('/:id', async (req, res) => {
  await db.read();
  db.data.projects = db.data.projects.filter(x => x.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

export default router;

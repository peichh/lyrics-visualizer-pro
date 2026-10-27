
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectRoutes from './routes/project.js';
import { mcpRouter } from './mcpServer.js';
import { initDB } from './db/database.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));

await initDB();

app.use('/api/projects', projectRoutes);
app.use('/mcp', mcpRouter);

app.get('/', (req, res) => {
  res.json({ status: 'Lyrics Visualizer Pro Backend Running', mcp: '/mcp/tools', api: '/api/projects' });
});

app.listen(PORT, () => {
  console.log(`Backend running http://localhost:${PORT}`);
  console.log(`MCP endpoint http://localhost:${PORT}/mcp/tools`);
});

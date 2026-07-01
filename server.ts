import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json({ limit: '50mb' }));

  // Manual CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Data directory setup
  const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const STATE_FILE_PATH = path.join(DATA_DIR, 'state.json');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // GET /api/state -> returns state.json
  app.get('/api/state', (req, res) => {
    try {
      if (fs.existsSync(STATE_FILE_PATH)) {
        const data = fs.readFileSync(STATE_FILE_PATH, 'utf8');
        res.json(JSON.parse(data));
      } else {
        res.json({ success: true, data: null });
      }
    } catch (error) {
      console.error('Error reading state file:', error);
      res.status(500).json({ success: false, error: 'Failed to read state.' });
    }
  });

  // POST /api/state -> saves state.json
  app.post('/api/state', (req, res) => {
    try {
      const stateData = req.body;
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(stateData, null, 2), 'utf8');
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving state file:', error);
      res.status(500).json({ success: false, error: 'Failed to save state.' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sabush POS] Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();

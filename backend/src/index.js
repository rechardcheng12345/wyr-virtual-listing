import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import listingsRouter from './routes/listings.js';
import sendRouter from './routes/send.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:5174',
  'http://localhost:3001',
  'https://darkgrey-porpoise-284218.hostingersite.com',
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/listings', listingsRouter);
app.use('/api/send', sendRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Serve built frontend from frontend/dist
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  console.warn(`[warn] frontend build not found at ${FRONTEND_DIST} — run "npm run client:build" first`);
}

app.listen(PORT, () => {
  console.log(`Virtual Listing backend running on http://localhost:${PORT}`);
});

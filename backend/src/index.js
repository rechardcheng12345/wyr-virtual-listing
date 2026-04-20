import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import listingsRouter from './routes/listings.js';
import sendRouter from './routes/send.js';
import authRouter from './routes/auth.js';
import emailHistoryRouter from './routes/emailHistory.js';

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

app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/send', sendRouter);
app.use('/api/email-history', emailHistoryRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Serve built frontend from frontend/dist (production only)
// In dev mode, the frontend runs separately via Vite on FRONTEND_PORT.
const isDev = process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development';
if (!isDev) {
  const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    });
  } else {
    console.warn(`[warn] frontend build not found at ${FRONTEND_DIST} — run "npm run client:build" first`);
  }
} else {
  console.log(`[dev] skipping frontend/dist; frontend served by Vite on port ${process.env.FRONTEND_PORT || 5174}`);
}

app.listen(PORT, () => {
  console.log(`Virtual Listing backend running on http://localhost:${PORT}`);
});

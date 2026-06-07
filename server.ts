import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust the first proxy (e.g. Cloud Run, Nginx) so that rate limiters can correctly read X-Forwarded-For
  app.set('trust proxy', 1);

  // Modern Network Protection via Helmet (SaaS standards)
  app.use(helmet({
    contentSecurityPolicy: false, // disabled for vite HMR in dev
  }));

  // Rate Limiter to prevent Brute-Force & DDoS
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per `window`
    standardHeaders: true, 
    legacyHeaders: false,
    message: { error: 'Too many API requests, please try again later.' }
  });

  app.use('/api', apiLimiter);

  // Express JSON parser body middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API routers
  app.use('/api', apiRouter);

  // Health probe
  app.get('/api/health', (req, res) => {
    res.json({ status: "ok", service: "Nexus Core Relational API Manager" });
  });

  // Hot Module Replacement (HMR) and dev assets via Vite
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Render static production assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexus core full-stack engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("FATAL: Failed to boot Express application backend.", err);
});

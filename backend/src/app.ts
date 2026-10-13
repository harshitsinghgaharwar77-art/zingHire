import express from 'express';
import type { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import jobRoutes from './routes/job.routes.js';
import eligibilityRoutes from './routes/eligibility.routes.js';
import chatRoutes from './routes/chat.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import passport from './config/passport.js';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app: Application = express();

// Trust the first proxy hop (Render's load balancer).
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// because it sees the X-Forwarded-For header but the proxy isn't trusted.
app.set('trust proxy', 1);

// =============================================================================
// Security Middlewares
// =============================================================================
app.use(helmet());

// CORS: allow local dev, production frontend, and all Vercel deployments (previews & production)
const rawFrontendUrls = [
  process.env['FRONTEND_URL'],
  process.env['CLIENT_URL'],
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

// Support comma-separated URLs and strip any trailing slashes
const allowedOrigins = rawFrontendUrls.flatMap((u) =>
  u.split(',').map((url) => url.trim().replace(/\/$/, ''))
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');

      // 1. Direct match with configured origins
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // 2. Allow any Vercel domain (*.vercel.app - matches production and preview branches)
      if (
        normalizedOrigin.endsWith('.vercel.app') ||
        /^https:\/\/.*\.vercel\.app$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      // 3. Allow localhost on any port
      if (
        /^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      // 4. In development mode, allow any origin
      if (process.env['NODE_ENV'] !== 'production') {
        return callback(null, true);
      }

      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

app.use(express.json());
app.use(morgan('dev'));

// =============================================================================
// Session — Required by Passport internals even in stateless JWT mode
// =============================================================================
// The session is ephemeral (no persistent store) and used only during the OAuth
// redirect handshake. After googleCallback fires and issues a JWT, the session
// is no longer needed — all subsequent API calls are authenticated via Bearer token.
// =============================================================================
app.use(
  session({
    secret:            process.env['JWT_SECRET'] ?? 'zinghire-session-secret',
    resave:            false,
    saveUninitialized: false,
    cookie: { secure: process.env['NODE_ENV'] === 'production', maxAge: 5 * 60 * 1000 }, // 5-min TTL
  }),
);

// =============================================================================
// Passport — OAuth Strategy Initialization
// =============================================================================
app.use(passport.initialize());
app.use(passport.session());

// Global rate limiter — applied before any route is processed
app.use(globalRateLimiter);

// =============================================================================
// Static File Serving — /uploads
// =============================================================================
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// =============================================================================
// Health Check
// =============================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// =============================================================================
// API Routes
// =============================================================================
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

export default app;

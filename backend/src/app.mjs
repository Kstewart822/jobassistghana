import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.mjs';
import logger from './utils/logger.mjs';
import { errorHandler, asyncHandler, notFoundHandler } from './middleware/errorHandler.mjs';

const app = express();

// ===== Security & Parsing Middleware =====
app.use(helmet());
app.use(cors(config.cors));
app.use(compression());
app.use(mongoSanitize());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.',
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ===== Logging Middleware =====
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ===== Health Check =====
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ===== API Routes =====
// TODO: Import and register module routes
// Example: app.use('/api/auth', authRoutes);
// Example: app.use('/api/users', userRoutes);
// Example: app.use('/api/jobs', jobRoutes);

// ===== Serve Static Files =====
if (config.isDevelopment) {
  app.use('/uploads', express.static('./storage/uploads'));
}

// ===== Error Handling & 404 =====
app.use(notFoundHandler);
app.use(errorHandler);

export default app;


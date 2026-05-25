import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 5000,
  host: process.env.HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  database: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/jobassist',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
    maxIdleTime: parseInt(process.env.DB_MAX_IDLE_TIME || '60000'),
    options: {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // CORS
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },

  // File uploads
  uploads: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880'),
    uploadDir: process.env.UPLOAD_DIR || './storage/uploads',
    allowedMimes: (process.env.ALLOWED_MIMES || 'image/jpeg,image/png,application/pdf').split(','),
  },

  // Cloud storage (AWS S3)
  cloud: {
    provider: process.env.CLOUD_PROVIDER || 'local',
    aws: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      bucket: process.env.AWS_S3_BUCKET,
    },
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15000000'), // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Email (optional)
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    apiKey: process.env.EMAIL_API_KEY,
    fromEmail: process.env.EMAIL_FROM,
  },

  // Payment (optional)
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'stripe',
    apiKey: process.env.PAYMENT_API_KEY,
  },
};

// Validate required environment variables
export function validateConfig() {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default config;

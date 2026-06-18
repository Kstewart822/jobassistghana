import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/environment.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../logs');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  // Console output
  new winston.transports.Console(),
  
  // Error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: winston.format.uncolorize(),
  }),
  
  // All logs
  new winston.transports.File({
    filename: path.join(logsDir, 'all.log'),
    format: winston.format.uncolorize(),
  }),
];

const logger = winston.createLogger({
  level: config.logging.level || 'debug',
  levels,
  format,
  transports,
});

export default logger;

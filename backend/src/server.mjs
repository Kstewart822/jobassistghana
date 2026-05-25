import http from 'http';
import app from './app.mjs';
import { config, validateConfig } from './config/environment.mjs';
import { connectDatabase, disconnectDatabase } from './database/mongoose.mjs';
import logger from './utils/logger.mjs';

const server = http.createServer(app);
const PORT = config.port || 5000;
const HOST = config.host || 'localhost';

async function startServer() {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated successfully');

    // Connect to database
    await connectDatabase();
    logger.info('Database connection established');

    // Start server
    server.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`, {
        environment: config.nodeEnv,
        port: PORT,
        host: HOST,
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.info('Received shutdown signal. Closing connections...');
  
  try {
    // Disconnect database
    await disconnectDatabase();
    
    // Close server
    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

startServer();

export { server };

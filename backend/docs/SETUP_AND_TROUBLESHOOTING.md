# Backend Setup & Troubleshooting Guide

## Initial Setup

### Prerequisites
- Node.js 18+ installed
- MongoDB 6.0+ (local or Atlas cloud)
- npm 9+ or yarn

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

Should complete with ~397 packages. If you see errors, try:
```bash
npm cache clean --force
npm install
```

### Step 2: Configure Environment

Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

**Required variables:**
```env
MONGODB_URL=mongodb://localhost:27017/job_assist
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
```

**Optional with defaults:**
```env
NODE_ENV=development
PORT=5000
HOST=localhost
LOG_LEVEL=info
```

### Step 3: Set Up MongoDB

#### Option A: Local MongoDB (Development)
```bash
# macOS (via Homebrew)
brew services start mongodb-community

# Windows (via Docker)
docker run -d -p 27017:27017 --name mongodb mongo:6.0

# Linux (via systemctl)
sudo systemctl start mongodb
```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/database`
4. Add to `.env` as `MONGODB_URL`

### Step 4: Verify Setup

```bash
# Check health endpoint
curl http://localhost:5000/health

# Should return:
# {"status":"OK","timestamp":"2024-01-01T00:00:00.000Z","uptime":123.45}
```

## Running the Application

### Development Mode (with auto-restart)
```bash
npm run dev
```

Watches files in `src/` and restarts server on changes.

### Production Mode
```bash
npm start
```

### With Custom Port
```bash
PORT=3001 npm run dev
```

## Common Issues & Solutions

### Issue 1: MongoDB Connection Refused

**Error**: `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**Solutions**:
1. Start MongoDB locally:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Docker
   docker run -d -p 27017:27017 mongo:6.0
   
   # Windows (if installed as service)
   net start MongoDB
   ```

2. Or use MongoDB Atlas:
   - Sign up at https://www.mongodb.com/cloud/atlas
   - Get connection string
   - Update `.env` with connection string

### Issue 2: Missing Environment Variables

**Error**: 
```
Error: Configuration validation failed
Missing required environment variables: JWT_SECRET, JWT_REFRESH_SECRET
```

**Solution**:
1. Copy `.env.example`:
   ```bash
   cp .env.example .env
   ```
2. Fill in required variables
3. Restart server

### Issue 3: Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solutions**:
1. Kill process on port:
   ```bash
   # macOS/Linux
   lsof -ti:5000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID [PID] /F
   ```

2. Or use different port:
   ```bash
   PORT=3001 npm run dev
   ```

### Issue 4: npm install Fails

**Error**: `npm ERR! code ERESOLVE` or dependency conflicts

**Solutions**:
```bash
# Clear cache
npm cache clean --force

# Remove node_modules and package-lock
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Or use legacy dependency resolver
npm install --legacy-peer-deps
```

### Issue 5: Mongoose Connection Warning

**Warning**: `DeprecationWarning: useNewUrlParser deprecated`

**Solution**: Already handled in `src/database/mongoose.mjs`. This is just a warning and can be ignored.

### Issue 6: Bcryptjs Compilation Issues

**Error**: `gyp ERR! build error` or `node-gyp rebuild failed`

**Solution**:
If you don't need Argon2, bcryptjs will fallback to pure JS implementation:
```env
USE_ARGON2=false
BCRYPT_ROUNDS=10
```

If you need Argon2:
```bash
# Install build tools
# macOS
brew install python3

# Windows (Visual Studio Build Tools needed)
npm install --global windows-build-tools

# Then reinstall
npm install
```

### Issue 7: Winston Logger Not Creating Files

**Error**: Log files not created in `src/logs/`

**Solution**:
The logs directory is created automatically, but ensure permissions:
```bash
# Create logs directory
mkdir -p src/logs
chmod 755 src/logs

# Restart server
npm run dev
```

## Testing Endpoints

### Health Check
```bash
curl http://localhost:5000/health
```

### With Authentication Headers
```bash
# Replace TOKEN with actual JWT token
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/users/profile
```

### POST Request with Data
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Secure@1234",
    "name": "John Doe",
    "role": "candidate"
  }'
```

## Debugging

### Enable Debug Logging
```bash
LOG_LEVEL=debug npm run dev
```

### View Logs in Real-time
```bash
# Error logs
tail -f src/logs/error.log

# All logs
tail -f src/logs/all.log

# Or use nodemon to watch
nodemon --exec "cat src/logs/all.log" 2>/dev/null
```

### Inspect Database
```bash
# Using MongoDB shell
mongo

# Or with Atlas
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/database"

# Then query
use job_assist
db.users.find()
```

## Performance Tuning

### Database Connection Pool
Adjust in `.env`:
```env
# Default: 10
DB_POOL_SIZE=20
```

Then restart server for changes to take effect.

### Logging Level
For production, reduce logging:
```env
LOG_LEVEL=info
NODE_ENV=production
```

### Rate Limiting
Adjust in `src/config/environment.mjs`:
```javascript
rateLimit: {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // 100 requests per window
}
```

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production` in environment
- [ ] Use strong JWT secrets (min 32 characters)
- [ ] Set up MongoDB Atlas for database
- [ ] Configure AWS S3 if using cloud storage
- [ ] Set `LOG_LEVEL=info` to reduce logging overhead
- [ ] Update CORS_ORIGIN to your frontend domain
- [ ] Set up HTTPS/SSL certificate
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Configure automated backups
- [ ] Review security settings in environment
- [ ] Test all endpoints in staging
- [ ] Set up log aggregation (e.g., ELK, Loggly)

## Useful Commands

### Development
```bash
npm run dev          # Start with auto-reload
npm run lint         # Check code quality
npm run lint:fix     # Fix linting issues
```

### Testing
```bash
npm test            # Run tests once
npm run test:watch  # Run tests in watch mode
```

### Database
```bash
# Backup MongoDB
mongodump --uri "mongodb://localhost:27017/job_assist" -o ./backup

# Restore MongoDB
mongorestore --uri "mongodb://localhost:27017/job_assist" ./backup/job_assist
```

### Process Management
```bash
# Using PM2 for production
npm install -g pm2

# Start
pm2 start src/server.mjs --name job-assist-api

# Monitor
pm2 monit

# View logs
pm2 logs job-assist-api

# Restart
pm2 restart job-assist-api
```

## Architecture Decision Log

### Why Mongoose over Native Driver?
- Schema validation
- Built-in transaction support
- Better error handling
- Easier to work with
- Large community and ecosystem

### Why Winston for Logging?
- Multiple transports (console, file, etc.)
- Structured logging support
- Easy rotation and archiving
- Production-proven
- Good performance

### Why Zod for Validation?
- Type-safe schema validation
- Detailed error messages
- Composable schemas
- Better performance than JOI
- Smaller bundle size

### Why Service Layer Pattern?
- Separation of concerns
- Reusable business logic
- Easier testing
- Better maintainability
- Scalable architecture

## Further Help

### Documentation
- [Architecture Guide](./ARCHITECTURE.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [API Documentation](./API.md) (To be created)

### External Resources
- [Express.js Docs](https://expressjs.com/)
- [Mongoose Guide](https://mongoosejs.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [JWT Guide](https://jwt.io/)
- [Zod Docs](https://zod.dev/)

### Community
- [Stack Overflow: expressjs](https://stackoverflow.com/questions/tagged/express)
- [Stack Overflow: mongodb](https://stackoverflow.com/questions/tagged/mongodb)

---

**Last Updated**: January 2024
**Backend Version**: 1.0.0
**Node Version Requirement**: 18.0.0+

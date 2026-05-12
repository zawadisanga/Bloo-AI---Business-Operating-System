// server.js - Bloo AI Enterprise Main Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Import routes
const authRoutes = require('./api/routes/auth');
const ceoRoutes = require('./api/routes/ceo');
const hrRoutes = require('./api/routes/hr');
const supportRoutes = require('./api/routes/support');
const salesRoutes = require('./api/routes/sales');
const accountantRoutes = require('./api/routes/accountant');
const automationRoutes = require('./api/routes/automation');
const marketplaceRoutes = require('./api/routes/marketplace');
const dashboardRoutes = require('./api/routes/dashboard');

// Import middleware
const { authMiddleware } = require('./api/middleware/auth');
const { globalRateLimiter, apiRateLimiter } = require('./api/middleware/rateLimit');
const { validateRequest } = require('./api/middleware/validation');

// Import services
const { initializeSystem } = require('./services/systemService');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// ============ LOGGING SETUP ============
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// ============ MIDDLEWARE ============
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting
app.use(globalRateLimiter);
app.use('/api/', apiRateLimiter);

// ============ API DOCUMENTATION ============
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '3.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

app.get('/health/detailed', async (req, res) => {
  const fs = require('fs').promises;
  const dataPath = path.join(__dirname, 'data');
  let dataStatus = 'ok';
  try {
    await fs.access(dataPath);
  } catch {
    dataStatus = 'missing';
  }
  
  res.json({
    status: 'healthy',
    services: {
      database: dataStatus,
      api: 'operational',
      memory: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB'
    },
    timestamp: new Date().toISOString()
  });
});

// ============ API ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/ceo', ceoRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/accountant', accountantRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ============ FRONTEND ROUTES ============
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ============ ERROR HANDLING ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: err.code || 'INTERNAL_ERROR'
  });
});

// ============ INITIALIZE SYSTEM ============
async function startServer() {
  try {
    await initializeSystem();
    logger.info('System initialized successfully');
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Bloo AI Enterprise Server running on port ${PORT}`);
      logger.info(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌍 Access at: http://localhost:${PORT}`);
      logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`🤖 AI Agents: CEO | HR | Support | Sales | Accountant`);
    });
  } catch (error) {
    logger.error('Failed to initialize system:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;

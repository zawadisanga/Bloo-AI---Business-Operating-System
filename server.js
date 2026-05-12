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




// server.js - BLOO AI COMPLETE (Single File - 100% Working)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bloo-ai-secret-key-2024';

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});
app.use('/api/', limiter);

// Data paths
const DATA_PATH = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_PATH, 'users.json');
const BUSINESSES_FILE = path.join(DATA_PATH, 'businesses.json');
const MESSAGES_FILE = path.join(DATA_PATH, 'messages.json');
const AUTOMATIONS_FILE = path.join(DATA_PATH, 'automations.json');

// Helper functions
async function ensureDataDir() {
  try { await fs.access(DATA_PATH); } 
  catch { await fs.mkdir(DATA_PATH, { recursive: true }); }
}

async function readJSON(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch { return []; }
}

async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// Initialize data
async function initData() {
  await ensureDataDir();
  const files = [USERS_FILE, BUSINESSES_FILE, MESSAGES_FILE, AUTOMATIONS_FILE];
  for (const file of files) {
    try { await fs.access(file); } 
    catch { await fs.writeFile(file, JSON.stringify([], null, 2)); }
  }
}
initData();

// Auth middleware
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ============= AUTH ROUTES =============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, businessName, plan = 'small' } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const users = await readJSON(USERS_FILE);
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      businessName: businessName || email.split('@')[0],
      plan,
      credits: plan === 'enterprise' ? 10000 : plan === 'growth' ? 1000 : 100,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    await writeJSON(USERS_FILE, users);
    
    const businesses = await readJSON(BUSINESSES_FILE);
    businesses.push({
      id: user.id,
      name: user.businessName,
      ownerId: user.id,
      plan,
      revenue: 0,
      costs: 0,
      customers: 0,
      createdAt: new Date().toISOString()
    });
    await writeJSON(BUSINESSES_FILE, businesses);
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user.id, email: user.email, businessName: user.businessName, plan: user.plan } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.email === email);
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user.id, email: user.email, businessName: user.businessName, plan: user.plan } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI CEO ROUTE =============
app.post('/api/ai/ceo/advice', authMiddleware, async (req, res) => {
  try {
    const { revenue = 50000, costs = 35000, customers = 150 } = req.body;
    const profit = revenue - costs;
    const profitMargin = revenue > 0 ? (profit / revenue * 100) : 0;
    
    let advice = [];
    let actions = [];
    
    if (profitMargin < 10) {
      advice.push(`⚠️ Profit margin ${profitMargin.toFixed(1)}% is critical`);
      actions.push('Reduce costs by 20%', 'Increase prices by 10%');
    } else if (profitMargin < 25) {
      advice.push(`📊 Profit margin ${profitMargin.toFixed(1)}% - needs improvement`);
      actions.push('Optimize operations', 'Improve retention');
    } else {
      advice.push(`✅ Excellent ${profitMargin.toFixed(1)}% margin`);
      actions.push('Scale marketing', 'Expand to new markets');
    }
    
    res.json({
      success: true,
      data: {
        analysis: { revenue: `$${revenue}`, costs: `$${costs}`, profit: `$${profit}`, profitMargin: `${profitMargin.toFixed(1)}%` },
        advice, actions,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI HR ROUTE =============
app.post('/api/hr/analyze-cv', authMiddleware, async (req, res) => {
  try {
    const { candidateName, skills, experience, position } = req.body;
    let score = 0;
    const reqSkills = position === 'developer' ? ['javascript', 'react', 'node'] : ['communication', 'sales', 'crm'];
    const candidateSkills = (skills || '').toLowerCase().split(',');
    const matchedSkills = reqSkills.filter(s => candidateSkills.some(cs => cs.includes(s)));
    score += (matchedSkills.length / reqSkills.length) * 60;
    score += Math.min(20, (parseInt(experience) || 0) * 4);
    score = Math.min(100, score);
    
    res.json({
      success: true,
      data: {
        candidateName, position, matchScore: score, matchedSkills,
        recommendation: score >= 60 ? 'Interview Recommended' : 'Keep Searching'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI SUPPORT ROUTE =============
app.post('/api/support/chat', authMiddleware, async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;
    const msg = message.toLowerCase();
    let response = 'Thank you for your message. How can I help you?';
    
    if (msg.includes('hello') || msg.includes('hi')) response = 'Hello! Welcome to Bloo AI support.';
    if (msg.includes('payment')) response = 'Your payment is being processed securely. Takes 1-3 days.';
    if (msg.includes('refund')) response = 'Refund requests take 5-7 business days to process.';
    
    const messages = await readJSON(MESSAGES_FILE);
    messages.push({ id: uuidv4(), userId: req.userId, message, response, timestamp: new Date().toISOString() });
    await writeJSON(MESSAGES_FILE, messages);
    
    res.json({ success: true, response, language });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI SALES ROUTE =============
app.post('/api/sales/outreach', authMiddleware, async (req, res) => {
  try {
    const { prospectName = 'Prospect', prospectIndustry = 'Business' } = req.body;
    const templates = [
      `Hello ${prospectName}, We help ${prospectIndustry} businesses increase sales by 40% using AI. Interested in a demo?`,
      `Hi ${prospectName}, Save 20 hours/week with our AI automation. Quick chat?`,
      `Dear ${prospectName}, ${prospectIndustry} leaders are saving $10k/month with Bloo AI. See how →`
    ];
    const message = templates[Math.floor(Math.random() * templates.length)];
    res.json({ success: true, message, followUp: 'Follow up in 2 days' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI ACCOUNTANT ROUTE =============
app.post('/api/accountant/analyze', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        summary: { totalIncome: '$50,000', totalExpense: '$32,000', profit: '$18,000', profitMargin: '36%' },
        recommendations: ['Reduce software subscriptions', 'Negotiate vendor contracts', 'Automate invoicing'],
        taxEstimate: '$4,500 estimated tax'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DASHBOARD ROUTE =============
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const businesses = await readJSON(BUSINESSES_FILE);
    const messages = await readJSON(MESSAGES_FILE);
    const automations = await readJSON(AUTOMATIONS_FILE);
    const userBusiness = businesses.find(b => b.ownerId === req.userId);
    const userMessages = messages.filter(m => m.userId === req.userId);
    const userAutomations = automations.filter(a => a.userId === req.userId);
    
    res.json({
      success: true,
      data: {
        business: userBusiness || { revenue: 0 },
        stats: { totalMessages: userMessages.length, totalAutomations: userAutomations.length, activeAgents: 5 }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AUTOMATION ROUTES =============
app.post('/api/automation/create', authMiddleware, async (req, res) => {
  try {
    const { trigger, action } = req.body;
    const automations = await readJSON(AUTOMATIONS_FILE);
    const automation = { id: uuidv4(), userId: req.userId, trigger, action, status: 'active', runs: 0, createdAt: new Date().toISOString() };
    automations.push(automation);
    await writeJSON(AUTOMATIONS_FILE, automations);
    res.json({ success: true, message: `Automation created: ${trigger} → ${action}`, data: automation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/automation/list', authMiddleware, async (req, res) => {
  try {
    const automations = await readJSON(AUTOMATIONS_FILE);
    res.json({ success: true, data: automations.filter(a => a.userId === req.userId) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= MARKETPLACE ROUTES =============
app.get('/api/marketplace/listings', authMiddleware, async (req, res) => {
  try {
    const listings = [
      { id: '1', name: 'WhatsApp Auto-Responder', description: 'AI-powered WhatsApp bot', price: 49, sales: 234 },
      { id: '2', name: 'CV Screener Pro', description: 'AI candidate screening', price: 99, sales: 156 },
      { id: '3', name: 'Email Campaign AI', description: 'Automated email marketing', price: 79, sales: 189 }
    ];
    res.json({ success: true, data: listings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Bloo AI Server running on port ${PORT}`);
  console.log(`📁 Data directory: ${DATA_PATH}`);
  console.log(`🤖 AI Agents: CEO | HR | Support | Sales | Accountant`);
});

module.exports = app;

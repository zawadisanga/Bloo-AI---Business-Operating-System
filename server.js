// server.js - Bloo AI for Heroku (SAHIHI KAMILI)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bloo-ai-super-secret-key-2024';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Data paths
const DATA_PATH = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_PATH, 'users.json');
const BUSINESSES_FILE = path.join(DATA_PATH, 'businesses.json');
const MESSAGES_FILE = path.join(DATA_PATH, 'messages.json');
const AUTOMATIONS_FILE = path.join(DATA_PATH, 'automations.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(DATA_PATH, { recursive: true });
  }
}

// Initialize JSON files
async function initDataFiles() {
  await ensureDataDir();
  const files = [USERS_FILE, BUSINESSES_FILE, MESSAGES_FILE, AUTOMATIONS_FILE];
  for (const file of files) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify([], null, 2));
    }
  }
}
initDataFiles();

// Helper functions
async function readJSON(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ============= AUTHENTICATION =============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, businessName, plan = 'small' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const users = await readJSON(USERS_FILE);
    const existing = users.find(u => u.email === email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      businessName: businessName || email.split('@')[0],
      plan,
      createdAt: new Date().toISOString(),
      credits: plan === 'enterprise' ? 10000 : plan === 'growth' ? 1000 : 100
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
    
    res.json({ 
      success: true,
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        businessName: user.businessName, 
        plan: user.plan 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error: ' + error.message });
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
    
    res.json({ 
      success: true,
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        businessName: user.businessName, 
        plan: user.plan 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Auth middleware
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ============= AI CEO AGENT =============
app.post('/api/ai/ceo/advice', authMiddleware, async (req, res) => {
  try {
    const { revenue, costs, customers } = req.body;
    
    const profit = revenue - costs;
    const profitMargin = revenue > 0 ? (profit / revenue * 100) : 0;
    
    let advice = [];
    let actions = [];
    
    if (profitMargin < 10) {
      advice.push(`⚠️ Critical: Your profit margin is only ${profitMargin.toFixed(1)}%`);
      actions.push('Reduce operational costs by 15-20% through automation');
      actions.push('Increase prices by 5-10% for top customers');
    } else if (profitMargin < 25) {
      advice.push(`📊 Your profit margin is ${profitMargin.toFixed(1)}%. Room for improvement.`);
      actions.push('Optimize supply chain to save 5-8% on costs');
      actions.push('Introduce loyalty program to increase retention');
    } else {
      advice.push(`✅ Excellent profit margin at ${profitMargin.toFixed(1)}%. Time to scale.`);
      actions.push('Invest 30% of profits into aggressive marketing');
      actions.push('Expand to 2 new regions');
    }
    
    res.json({
      success: true,
      data: {
        analysis: {
          revenue: `$${revenue.toLocaleString()}`,
          costs: `$${costs.toLocaleString()}`,
          profit: `$${profit.toLocaleString()}`,
          profitMargin: `${profitMargin.toFixed(1)}%`
        },
        advice,
        actions,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI SUPPORT AGENT =============
const supportResponses = {
  'sw': {
    'greeting': 'Karibu! Ninafurahi kukusaidia leo.',
    'payment': 'Malipo yako yanachakatwa kwa usalama.',
    'default': 'Asante kwa kuwasiliana nasi.'
  },
  'en': {
    'greeting': 'Welcome! How can I help you today?',
    'payment': 'Your payment is being processed securely.',
    'default': 'Thank you for contacting us.'
  }
};

app.post('/api/ai/support/chat', authMiddleware, async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;
    const msg = message.toLowerCase();
    
    const messages = await readJSON(MESSAGES_FILE);
    messages.push({
      id: uuidv4(),
      userId: req.userId,
      message,
      language,
      timestamp: new Date().toISOString(),
      response: ''
    });
    
    let response = supportResponses[language]?.default || supportResponses['en'].default;
    
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('karibu')) {
      response = supportResponses[language]?.greeting || supportResponses['en'].greeting;
    } else if (msg.includes('payment') || msg.includes('pay') || msg.includes('malipo')) {
      response = supportResponses[language]?.payment || supportResponses['en'].payment;
    }
    
    messages[messages.length - 1].response = response;
    await writeJSON(MESSAGES_FILE, messages);
    
    res.json({
      success: true,
      response,
      language,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AUTOMATION ENGINE =============
app.post('/api/automation/create', authMiddleware, async (req, res) => {
  try {
    const { trigger, action } = req.body;
    
    const automations = await readJSON(AUTOMATIONS_FILE);
    const automation = {
      id: uuidv4(),
      userId: req.userId,
      trigger,
      action,
      status: 'active',
      runs: 0,
      createdAt: new Date().toISOString()
    };
    
    automations.push(automation);
    await writeJSON(AUTOMATIONS_FILE, automations);
    
    res.json({
      success: true,
      message: `Automation created: When ${trigger} → Then ${action}`,
      data: automation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/automation/list', authMiddleware, async (req, res) => {
  try {
    const automations = await readJSON(AUTOMATIONS_FILE);
    const userAutomations = automations.filter(a => a.userId === req.userId);
    res.json({ success: true, data: userAutomations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DASHBOARD STATS =============
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
        business: userBusiness || {},
        stats: {
          totalMessages: userMessages.length,
          totalAutomations: userAutomations.length,
          activeAgents: 3
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(), 
    timestamp: new Date().toISOString()
  });
});

// Serve HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Bloo AI Server running on port ${PORT}`);
  console.log(`📁 Data directory: ${DATA_PATH}`);
  console.log(`🌍 Access at: http://localhost:${PORT}`);
});

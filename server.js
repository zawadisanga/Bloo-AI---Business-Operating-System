// server.js - Bloo AI for Heroku
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
  contentSecurityPolicy: false, // For inline scripts in HTML
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting for Heroku
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Data paths (Heroku compatible)
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_PATH, 'users.json');
const BUSINESSES_FILE = path.join(DATA_PATH, 'businesses.json');
const MESSAGES_FILE = path.join(DATA_PATH, 'messages.json');
const AGENTS_FILE = path.join(DATA_PATH, 'agents.json');
const AUTOMATIONS_FILE = path.join(DATA_PATH, 'automations.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_PATH, 'subscriptions.json');
const INTERVIEWS_FILE = path.join(DATA_PATH, 'interviews.json');
const OUTREACH_FILE = path.join(DATA_PATH, 'outreach.json');
const MARKETPLACE_FILE = path.join(DATA_PATH, 'marketplace.json');

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
  const files = [USERS_FILE, BUSINESSES_FILE, MESSAGES_FILE, AGENTS_FILE, AUTOMATIONS_FILE, 
                 SUBSCRIPTIONS_FILE, INTERVIEWS_FILE, OUTREACH_FILE, MARKETPLACE_FILE];
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
    
    // Create business record
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
    const { revenue, costs, customers, industry = 'general' } = req.body;
    
    const profit = revenue - costs;
    const profitMargin = revenue > 0 ? (profit / revenue * 100) : 0;
    
    let advice = [];
    let actions = [];
    
    if (profitMargin < 10) {
      advice.push(`⚠️ Critical: Your profit margin is only ${profitMargin.toFixed(1)}%`);
      actions.push('Reduce operational costs by 15-20% through automation');
      actions.push('Increase prices by 5-10% for top customers');
      actions.push('Cut non-performing marketing channels immediately');
    } else if (profitMargin < 25) {
      advice.push(`📊 Your profit margin is ${profitMargin.toFixed(1)}%. Room for improvement.`);
      actions.push('Optimize supply chain to save 5-8% on costs');
      actions.push('Introduce loyalty program to increase retention');
      actions.push('Automate 3 repetitive tasks this month');
    } else {
      advice.push(`✅ Excellent profit margin at ${profitMargin.toFixed(1)}%. Time to scale.`);
      actions.push('Invest 30% of profits into aggressive marketing');
      actions.push('Hire 2 new AI agents or sales people');
      actions.push('Expand to 2 new regions/cities');
    }
    
    const avgRevenuePerCustomer = customers > 0 ? revenue / customers : 0;
    if (avgRevenuePerCustomer < 50) {
      actions.push(`Increase average transaction from $${avgRevenuePerCustomer.toFixed(0)} to $75 via upselling`);
    }
    
    const strategies = [
      `Launch WhatsApp marketing campaign to reach ${customers} customers`,
      `Implement referral program (give 20% discount for referrals)`,
      `Add AI chatbot to handle 70% of support tickets`,
      `Automate invoice and payment collection`,
      `Create subscription model for recurring revenue`
    ];
    
    const selectedStrategies = strategies.slice(0, 3);
    
    res.json({
      success: true,
      data: {
        analysis: {
          revenue: `$${revenue.toLocaleString()}`,
          costs: `$${costs.toLocaleString()}`,
          profit: `$${profit.toLocaleString()}`,
          profitMargin: `${profitMargin.toFixed(1)}%`,
          avgCustomerValue: `$${avgRevenuePerCustomer.toFixed(2)}`
        },
        advice,
        actions,
        strategies: selectedStrategies,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI HR AGENT =============
app.post('/api/ai/hr/analyze-cv', authMiddleware, async (req, res) => {
  try {
    const { candidateName, skills, experience, education, position } = req.body;
    
    let score = 0;
    let feedback = [];
    
    const requiredSkills = {
      'developer': ['javascript', 'python', 'react', 'node'],
      'sales': ['communication', 'negotiation', 'crm', 'closing'],
      'support': ['communication', 'problem solving', 'empathy', 'ticketing'],
      'manager': ['leadership', 'planning', 'budgeting', 'reporting']
    };
    
    const reqSkills = requiredSkills[position] || requiredSkills['developer'];
    const candidateSkills = (skills || '').toLowerCase().split(',');
    
    const matchedSkills = reqSkills.filter(s => candidateSkills.some(cs => cs.includes(s)));
    score += (matchedSkills.length / reqSkills.length) * 60;
    
    const expYears = parseInt(experience) || 0;
    if (expYears >= 5) score += 20;
    else if (expYears >= 3) score += 15;
    else if (expYears >= 1) score += 8;
    
    const edu = (education || '').toLowerCase();
    if (edu.includes('bachelor') || edu.includes('degree')) score += 10;
    if (edu.includes('master') || edu.includes('phd')) score += 5;
    
    score = Math.min(100, score);
    
    if (score >= 80) feedback.push('Excellent match! Strongly recommend for interview');
    else if (score >= 60) feedback.push('Good match, recommend interview');
    else if (score >= 40) feedback.push('Consider for junior position or training');
    else feedback.push('Not a strong match for this role');
    
    if (matchedSkills.length < reqSkills.length) {
      feedback.push(`Missing skills: ${reqSkills.filter(s => !matchedSkills.includes(s)).join(', ')}`);
    }
    
    res.json({
      success: true,
      data: {
        candidateName,
        position,
        matchScore: score,
        matchedSkills,
        feedback,
        recommendation: score >= 60 ? 'Schedule Interview' : 'Keep Searching',
        interviewQuestions: [
          `Tell us about your experience with ${matchedSkills[0] || 'relevant technologies'}`,
          'Describe a challenging problem you solved recently',
          'Where do you see yourself in 2 years?'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/hr/schedule-interview', authMiddleware, async (req, res) => {
  try {
    const { candidateEmail, candidateName, position, date, time } = req.body;
    
    const interviews = await readJSON(INTERVIEWS_FILE);
    const interview = {
      id: uuidv4(),
      candidateEmail,
      candidateName,
      position,
      scheduledDate: date,
      scheduledTime: time,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };
    interviews.push(interview);
    await writeJSON(INTERVIEWS_FILE, interviews);
    
    res.json({
      success: true,
      message: `Interview scheduled for ${candidateName} on ${date} at ${time}`,
      data: interview
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI SUPPORT AGENT =============
const supportResponses = {
  'sw': {
    'greeting': 'Karibu! Ninafurahi kukusaidia leo. Una swali gani?',
    'payment': 'Malipo yako yanachakatwa kwa usalama. Inachukua siku 1-3 za kazi.',
    'refund': 'Tumepokea ombi lako la refund. Utapata pesa ndani ya siku 5.',
    'shipping': 'Usafirishaji unachukua siku 2-5. Utapewa tracking number.',
    'hours': 'Tunafanya kazi 24/7, siku zote za wiki.',
    'default': 'Asante kwa kuwasiliana nasi. Nimeelewa ombi lako.'
  },
  'en': {
    'greeting': 'Welcome! How can I help you today?',
    'payment': 'Your payment is being processed securely. Takes 1-3 business days.',
    'refund': 'We received your refund request. Money back within 5 days.',
    'shipping': 'Shipping takes 2-5 days. You will receive tracking number.',
    'hours': 'We operate 24/7, all days of the week.',
    'default': 'Thank you for contacting us. I understand your request.'
  },
  'fr': {
    'greeting': 'Bienvenue! Comment puis-je vous aider?',
    'payment': 'Votre paiement est traité sécuritairement. Délai 1-3 jours.',
    'default': 'Merci de nous contacter. J\'ai compris votre demande.'
  }
};

app.post('/api/ai/support/chat', authMiddleware, async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;
    const msg = message.toLowerCase();
    
    const messages = await readJSON(MESSAGES_FILE);
    const messageId = uuidv4();
    messages.push({
      id: messageId,
      userId: req.userId,
      message,
      language,
      timestamp: new Date().toISOString(),
      response: ''
    });
    
    let response = supportResponses[language]?.default || supportResponses['en'].default;
    
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('karibu') || msg.includes('jambo')) {
      response = supportResponses[language]?.greeting || supportResponses['en'].greeting;
    } else if (msg.includes('payment') || msg.includes('pay') || msg.includes('malipo') || msg.includes('pesa')) {
      response = supportResponses[language]?.payment || supportResponses['en'].payment;
    } else if (msg.includes('refund') || msg.includes('return') || msg.includes('rejesha')) {
      response = supportResponses[language]?.refund || supportResponses['en'].refund;
    } else if (msg.includes('shipping') || msg.includes('delivery') || msg.includes('usafirishaji')) {
      response = supportResponses[language]?.shipping || supportResponses['en'].shipping;
    } else if (msg.includes('hour') || msg.includes('saa') || msg.includes('time')) {
      response = supportResponses[language]?.hours || supportResponses['en'].hours;
    }
    
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) messages[index].response = response;
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

// ============= AI SALES AGENT =============
app.post('/api/ai/sales/outreach', authMiddleware, async (req, res) => {
  try {
    const { prospectName, prospectIndustry, prospectSize } = req.body;
    
    const templates = [
      `Hello ${prospectName}, I noticed your ${prospectIndustry} business. We help companies like yours increase sales by 40% using AI automation. Can we schedule a 10-min demo?`,
      `Hi ${prospectName}, ${prospectSize} employees managing repetitive tasks costs you $50k+/year. Our AI agents automate 70% of that. Interested?`,
      `Dear ${prospectName}, Businesses in ${prospectIndustry} are saving $10k/month with Bloo AI. See how →`,
      `Hey ${prospectName}, Quick question: Would automating your customer support free up 20 hours/week for your team? That's what we do.`
    ];
    
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    const outreach = await readJSON(OUTREACH_FILE);
    outreach.push({
      id: uuidv4(),
      userId: req.userId,
      prospectName,
      industry: prospectIndustry,
      message: selectedTemplate,
      status: 'sent',
      createdAt: new Date().toISOString()
    });
    await writeJSON(OUTREACH_FILE, outreach);
    
    res.json({
      success: true,
      message: selectedTemplate,
      followUp: `Follow up in 2 days with case study for ${prospectIndustry}`,
      suggestedResponse: "Yes, I'm interested. Tell me more!"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AI ACCOUNTANT =============
app.post('/api/ai/accountant/analyze', authMiddleware, async (req, res) => {
  try {
    const { transactions } = req.body;
    
    let totalIncome = 0;
    let totalExpense = 0;
    let categories = {};
    
    if (transactions && transactions.length > 0) {
      for (const t of transactions) {
        if (t.amount > 0) totalIncome += t.amount;
        else totalExpense += Math.abs(t.amount);
        
        const cat = t.category || 'other';
        categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
      }
    } else {
      totalIncome = 50000;
      totalExpense = 32000;
      categories = {
        'salary': 15000,
        'marketing': 8000,
        'software': 3000,
        'rent': 6000
      };
    }
    
    const profit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome * 100) : 0;
    
    let recommendations = [];
    if (categories['marketing'] > totalIncome * 0.2) {
      recommendations.push('Marketing spend is high. Consider reallocating to high-performing channels.');
    }
    if (categories['salary'] > totalIncome * 0.4) {
      recommendations.push('Salary costs are high. Consider AI agents to reduce headcount by 30%.');
    }
    recommendations.push('Set up automated invoice reminders to reduce late payments by 50%');
    recommendations.push('Review subscription services monthly to cancel unused tools');
    
    res.json({
      success: true,
      data: {
        summary: {
          totalIncome: `$${totalIncome.toLocaleString()}`,
          totalExpense: `$${totalExpense.toLocaleString()}`,
          profit: `$${profit.toLocaleString()}`,
          profitMargin: `${profitMargin.toFixed(1)}%`
        },
        categories,
        recommendations,
        taxEstimate: `$${(profit * 0.25).toLocaleString()} (estimated 25% tax)`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= AUTOMATION ENGINE =============
app.post('/api/automation/create', authMiddleware, async (req, res) => {
  try {
    const { trigger, action, triggerDetails, actionDetails } = req.body;
    
    const automations = await readJSON(AUTOMATIONS_FILE);
    const automation = {
      id: uuidv4(),
      userId: req.userId,
      trigger,
      action,
      triggerDetails: triggerDetails || {},
      actionDetails: actionDetails || {},
      status: 'active',
      runs: 0,
      lastRun: null,
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

app.post('/api/automation/trigger', authMiddleware, async (req, res) => {
  try {
    const { automationId, payload } = req.body;
    const automations = await readJSON(AUTOMATIONS_FILE);
    const index = automations.findIndex(a => a.id === automationId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    
    automations[index].runs++;
    automations[index].lastRun = new Date().toISOString();
    await writeJSON(AUTOMATIONS_FILE, automations);
    
    const actionResult = {
      status: 'executed',
      at: new Date().toISOString(),
      details: `${automations[index].action} completed successfully`
    };
    
    res.json({
      success: true,
      message: `Automation triggered: ${automations[index].trigger} → ${automations[index].action}`,
      result: actionResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DASHBOARD & STATS =============
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
          automationRuns: userAutomations.reduce((sum, a) => sum + (a.runs || 0), 0),
          activeAgents: 5
        },
        recentMessages: userMessages.slice(-10).reverse()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SUBSCRIPTION =============
app.post('/api/subscription/upgrade', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['small', 'growth', 'enterprise'];
    
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    const users = await readJSON(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === req.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const prices = { small: 50, growth: 500, enterprise: 10000 };
    
    users[userIndex].plan = plan;
    users[userIndex].credits = plan === 'enterprise' ? 10000 : plan === 'growth' ? 1000 : 100;
    await writeJSON(USERS_FILE, users);
    
    const businesses = await readJSON(BUSINESSES_FILE);
    const businessIndex = businesses.findIndex(b => b.ownerId === req.userId);
    if (businessIndex !== -1) {
      businesses[businessIndex].plan = plan;
      await writeJSON(BUSINESSES_FILE, businesses);
    }
    
    res.json({
      success: true,
      message: `Upgraded to ${plan} plan ($${prices[plan]}/month)`,
      plan,
      price: prices[plan]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= MARKETPLACE =============
app.post('/api/marketplace/list', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    
    const listings = await readJSON(MARKETPLACE_FILE);
    const listing = {
      id: uuidv4(),
      sellerId: req.userId,
      name,
      description,
      price: parseFloat(price),
      category,
      sales: 0,
      createdAt: new Date().toISOString()
    };
    
    listings.push(listing);
    await writeJSON(MARKETPLACE_FILE, listings);
    
    res.json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketplace/listings', authMiddleware, async (req, res) => {
  try {
    let listings = await readJSON(MARKETPLACE_FILE);
    if (listings.length === 0) {
      listings = [
        { id: '1', name: 'WhatsApp Auto-Responder', description: 'AI-powered WhatsApp reply bot', price: 49, category: 'automation', sales: 234 },
        { id: '2', name: 'CV Screener Pro', description: 'AI that filters and ranks candidates', price: 99, category: 'hr', sales: 156 },
        { id: '3', name: 'Email Campaign AI', description: 'Automated email marketing', price: 79, category: 'marketing', sales: 89 },
        { id: '4', name: 'Invoice Automation', description: 'Auto-generate and send invoices', price: 39, category: 'finance', sales: 312 }
      ];
      await writeJSON(MARKETPLACE_FILE, listings);
    }
    res.json({ success: true, data: listings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check for Heroku
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(), 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve HTML for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Bloo AI Server running on port ${PORT}`);
  console.log(`📁 Data directory: ${DATA_PATH}`);
  console.log(`🌍 Access at: http://localhost:${PORT}`);
  console.log(`🤖 AI Agents: CEO | HR | Support | Sales | Accountant`);
});

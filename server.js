// server.js - Bloo AI Complete System
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
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bloo-ai-super-secret-key-2024';

// ============ MIDDLEWARE ============
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ============ DATA SETUP ============
const DATA_PATH = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_PATH, 'users.json');
const BUSINESSES_FILE = path.join(DATA_PATH, 'businesses.json');
const MESSAGES_FILE = path.join(DATA_PATH, 'messages.json');
const AUTOMATIONS_FILE = path.join(DATA_PATH, 'automations.json');
const TRANSACTIONS_FILE = path.join(DATA_PATH, 'transactions.json');

async function ensureDataDir() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(DATA_PATH, { recursive: true });
  }
}

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

async function initData() {
  await ensureDataDir();
  const files = [USERS_FILE, BUSINESSES_FILE, MESSAGES_FILE, AUTOMATIONS_FILE, TRANSACTIONS_FILE];
  for (const file of files) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify([], null, 2));
    }
  }
}
initData();

// ============ AUTH MIDDLEWARE ============
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, businessName, plan = 'small' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    
    const users = await readJSON(USERS_FILE);
    const existing = users.find(u => u.email === email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    const user = {
      id: userId,
      email,
      password: hashedPassword,
      businessName: businessName || email.split('@')[0],
      plan,
      credits: plan === 'enterprise' ? 10000 : plan === 'growth' ? 1000 : 100,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    users.push(user);
    await writeJSON(USERS_FILE, users);
    
    const businesses = await readJSON(BUSINESSES_FILE);
    businesses.push({
      id: uuidv4(),
      name: user.businessName,
      ownerId: userId,
      plan,
      revenue: 0,
      costs: 0,
      customers: 0,
      createdAt: new Date().toISOString()
    });
    await writeJSON(BUSINESSES_FILE, businesses);
    
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      success: true,
      token,
      user: { id: userId, email, businessName: user.businessName, plan }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    user.lastLogin = new Date().toISOString();
    await writeJSON(USERS_FILE, users);
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, businessName: user.businessName, plan: user.plan }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI CEO ROUTES ============
app.post('/api/ceo/advice', authMiddleware, async (req, res) => {
  try {
    const { revenue = 50000, costs = 35000, customers = 150, industry = 'general' } = req.body;
    
    const profit = revenue - costs;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const avgCustomerValue = customers > 0 ? revenue / customers : 0;
    
    let health = 'good';
    let advice = [];
    let actions = [];
    let strategies = [];
    
    if (profitMargin < 10) {
      health = 'critical';
      advice.push(`⚠️ CRITICAL: Your profit margin is only ${profitMargin.toFixed(1)}%`);
      advice.push('Your business is at risk. Immediate action required.');
      actions.push('Reduce operational costs by 20-30% immediately');
      actions.push('Increase prices by 10-15% for all customers');
      actions.push('Cut all non-essential marketing spend');
      strategies.push('Emergency cost reduction plan', 'Price optimization strategy');
    } else if (profitMargin < 25) {
      health = 'warning';
      advice.push(`📊 WARNING: Profit margin at ${profitMargin.toFixed(1)}% - below industry average`);
      advice.push('Room for improvement in operations and pricing');
      actions.push('Optimize supply chain to save 5-8% on costs');
      actions.push('Implement customer loyalty program');
      actions.push('Automate 3 repetitive tasks this month');
      strategies.push('Operational efficiency', 'Customer retention program');
    } else {
      health = 'excellent';
      advice.push(`✅ EXCELLENT: Profit margin of ${profitMargin.toFixed(1)}%`);
      advice.push('Your business is performing well. Time to scale aggressively.');
      actions.push('Invest 30% of profits into marketing');
      actions.push('Expand to 2 new markets or regions');
      actions.push('Hire additional sales staff');
      strategies.push('Aggressive expansion', 'Marketing optimization');
    }
    
    if (avgCustomerValue < 50) {
      actions.push(`Increase average customer value from $${avgCustomerValue.toFixed(0)} to $75 via upselling`);
    }
    
    const forecast = [];
    let projectedRevenue = revenue;
    for (let i = 1; i <= 6; i++) {
      const growthRate = profitMargin > 25 ? 0.15 : profitMargin > 10 ? 0.08 : 0.03;
      projectedRevenue = projectedRevenue * (1 + growthRate);
      forecast.push({
        month: i,
        revenue: Math.round(projectedRevenue),
        profit: Math.round(projectedRevenue * (profitMargin / 100))
      });
    }
    
    res.json({
      success: true,
      data: {
        analysis: {
          revenue: `$${revenue.toLocaleString()}`,
          costs: `$${costs.toLocaleString()}`,
          profit: `$${profit.toLocaleString()}`,
          profitMargin: `${profitMargin.toFixed(1)}%`,
          avgCustomerValue: `$${avgCustomerValue.toFixed(2)}`,
          health
        },
        advice,
        actions,
        strategies,
        forecast,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ceo/forecast', authMiddleware, async (req, res) => {
  try {
    const { historicalData, months = 12 } = req.body;
    const data = historicalData || [10000, 12000, 14000, 16000, 18000, 20000];
    
    const trend = (data[data.length - 1] - data[0]) / data.length;
    const forecast = [];
    let lastValue = data[data.length - 1];
    
    for (let i = 1; i <= months; i++) {
      const nextValue = lastValue + trend;
      forecast.push({ month: i, value: Math.max(0, Math.round(nextValue)) });
      lastValue = nextValue;
    }
    
    res.json({
      success: true,
      data: { historical: data, forecast, trend: trend.toFixed(2) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI HR ROUTES ============
app.post('/api/hr/analyze-cv', authMiddleware, async (req, res) => {
  try {
    const { candidateName, skills, experience, education, position = 'developer' } = req.body;
    
    const requiredSkills = {
      'developer': ['javascript', 'python', 'react', 'node', 'html', 'css'],
      'sales': ['communication', 'negotiation', 'crm', 'closing', 'leadership'],
      'support': ['communication', 'problem solving', 'empathy', 'ticketing', 'patience'],
      'manager': ['leadership', 'planning', 'budgeting', 'reporting', 'teamwork']
    };
    
    const reqSkills = requiredSkills[position] || requiredSkills['developer'];
    const candidateSkills = (skills || '').toLowerCase().split(',').map(s => s.trim());
    
    const matchedSkills = reqSkills.filter(s => 
      candidateSkills.some(cs => cs.includes(s) || s.includes(cs))
    );
    
    let score = (matchedSkills.length / reqSkills.length) * 60;
    
    const expYears = parseInt(experience) || 0;
    if (expYears >= 5) score += 20;
    else if (expYears >= 3) score += 15;
    else if (expYears >= 1) score += 8;
    else if (expYears >= 0) score += 3;
    
    const edu = (education || '').toLowerCase();
    if (edu.includes('phd')) score += 15;
    else if (edu.includes('master')) score += 10;
    else if (edu.includes('bachelor')) score += 8;
    else if (edu.includes('diploma')) score += 5;
    
    score = Math.min(100, Math.max(0, score));
    
    let recommendation = '';
    let feedback = [];
    
    if (score >= 80) {
      recommendation = 'Strongly Recommend - Schedule Interview Immediately';
      feedback.push('Excellent match for this position');
      feedback.push(`Matched ${matchedSkills.length}/${reqSkills.length} required skills`);
    } else if (score >= 60) {
      recommendation = 'Recommend - Consider for Interview';
      feedback.push('Good candidate, meets most requirements');
      feedback.push(`Matched ${matchedSkills.length}/${reqSkills.length} required skills`);
    } else if (score >= 40) {
      recommendation = 'Consider for Junior Position';
      feedback.push('Candidate may need additional training');
      feedback.push(`Only matched ${matchedSkills.length}/${reqSkills.length} skills`);
    } else {
      recommendation = 'Not Recommended - Keep Searching';
      feedback.push('Candidate does not meet minimum requirements');
    }
    
    if (matchedSkills.length < reqSkills.length) {
      const missing = reqSkills.filter(s => !matchedSkills.includes(s));
      feedback.push(`Missing key skills: ${missing.join(', ')}`);
    }
    
    const interviewQuestions = [
      `Tell us about your experience with ${matchedSkills[0] || 'relevant technologies'}`,
      'Describe a challenging problem you solved recently',
      'Where do you see yourself in 2 years?',
      'Why do you want to work with us?'
    ];
    
    res.json({
      success: true,
      data: {
        candidateName,
        position,
        matchScore: Math.round(score),
        matchedSkills,
        missingSkills: reqSkills.filter(s => !matchedSkills.includes(s)),
        recommendation,
        feedback,
        interviewQuestions,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/hr/schedule-interview', authMiddleware, async (req, res) => {
  try {
    const { candidateName, candidateEmail, position, date, time } = req.body;
    
    const interview = {
      id: uuidv4(),
      candidateName,
      candidateEmail,
      position,
      scheduledDate: date || new Date().toISOString().split('T')[0],
      scheduledTime: time || '10:00 AM',
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };
    
    const interviewsFile = path.join(DATA_PATH, 'interviews.json');
    let interviews = await readJSON(interviewsFile);
    interviews.push(interview);
    await writeJSON(interviewsFile, interviews);
    
    res.json({
      success: true,
      message: `Interview scheduled for ${candidateName} on ${interview.scheduledDate} at ${interview.scheduledTime}`,
      data: interview
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI SUPPORT ROUTES ============
const supportResponses = {
  'en': {
    greeting: 'Welcome! How can I help you today?',
    payment: 'Your payment is being processed securely. Transactions typically complete within 1-3 business days.',
    refund: 'Refund requests are processed within 5-7 business days. Please provide your order number.',
    shipping: 'Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days.',
    hours: 'Our support team is available 24/7, 365 days a year.',
    technical: 'Please describe the technical issue you are experiencing.',
    complaint: 'I apologize for the inconvenience. Let me help resolve this issue.',
    default: 'Thank you for contacting Bloo AI support. How else can I assist you today?'
  },
  'sw': {
    greeting: 'Karibu! Ninaweza kukusaidia vipi leo?',
    payment: 'Malipo yako yanachakatwa kwa usalama. Inachukua siku 1-3 za kazi.',
    refund: 'Ombi la refund linachukua siku 5-7 za kazi. Tafadhali toa namba ya order yako.',
    shipping: 'Usafirishaji wa kawaida unachukua siku 3-5. Usafirishaji wa haraka siku 1-2.',
    hours: 'Timu yetu inapatikana saa 24/7, siku zote za mwaka.',
    default: 'Asante kwa kuwasiliana nasi. Tunasubiri kukusaidia zaidi.'
  }
};

app.post('/api/support/chat', authMiddleware, async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;
    const msg = message.toLowerCase();
    
    let response = supportResponses[language]?.default || supportResponses['en'].default;
    let intent = 'general';
    
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('karibu')) {
      response = supportResponses[language]?.greeting || supportResponses['en'].greeting;
      intent = 'greeting';
    } else if (msg.includes('payment') || msg.includes('pay') || msg.includes('malipo')) {
      response = supportResponses[language]?.payment || supportResponses['en'].payment;
      intent = 'payment';
    } else if (msg.includes('refund') || msg.includes('return')) {
      response = supportResponses[language]?.refund || supportResponses['en'].refund;
      intent = 'refund';
    } else if (msg.includes('shipping') || msg.includes('delivery') || msg.includes('usafirishaji')) {
      response = supportResponses[language]?.shipping || supportResponses['en'].shipping;
      intent = 'shipping';
    } else if (msg.includes('hour') || msg.includes('time') || msg.includes('saa')) {
      response = supportResponses[language]?.hours || supportResponses['en'].hours;
      intent = 'hours';
    } else if (msg.includes('technical') || msg.includes('error') || msg.includes('bug')) {
      response = supportResponses[language]?.technical || supportResponses['en'].technical;
      intent = 'technical';
    } else if (msg.includes('complaint') || msg.includes('angry') || msg.includes('bad')) {
      response = supportResponses[language]?.complaint || supportResponses['en'].complaint;
      intent = 'complaint';
    }
    
    const messages = await readJSON(MESSAGES_FILE);
    messages.push({
      id: uuidv4(),
      userId: req.userId,
      message,
      response,
      intent,
      language,
      timestamp: new Date().toISOString()
    });
    await writeJSON(MESSAGES_FILE, messages);
    
    res.json({
      success: true,
      response,
      intent,
      language,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/support/history', authMiddleware, async (req, res) => {
  try {
    const messages = await readJSON(MESSAGES_FILE);
    const userMessages = messages.filter(m => m.userId === req.userId).slice(-50);
    res.json({ success: true, data: userMessages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI SALES ROUTES ============
app.post('/api/sales/outreach', authMiddleware, async (req, res) => {
  try {
    const { prospectName, prospectIndustry, prospectSize, product } = req.body;
    
    const name = prospectName || 'Valued Prospect';
    const industry = prospectIndustry || 'your industry';
    const size = prospectSize || 'growing';
    
    const templates = [
      {
        subject: `Boost ${industry} revenue with AI automation`,
        body: `Hello ${name},\n\nI noticed your ${size} ${industry} business could benefit from AI automation. Our clients see 40% revenue increase within 90 days.\n\nWould you be open to a 10-minute demo this week?\n\nBest regards,\nBloo AI Sales Team`
      },
      {
        subject: `Save 20+ hours/week with Bloo AI`,
        body: `Hi ${name},\n\nBusinesses in ${industry} waste ${size === 'small' ? '15' : '30+'} hours on repetitive tasks. Our AI agents automate 70% of manual work.\n\nSee how → [demo link]\n\nCheers,\nBloo AI`
      },
      {
        subject: `Special offer for ${industry} leaders`,
        body: `Dear ${name},\n\nFor a limited time, we're offering ${size} businesses in ${industry} a 30% discount on our AI platform.\n\nSchedule a quick chat to learn more.\n\nBest,\nBloo AI Team`
      }
    ];
    
    const selected = templates[Math.floor(Math.random() * templates.length)];
    
    const outreachFile = path.join(DATA_PATH, 'outreach.json');
    let outreach = await readJSON(outreachFile);
    outreach.push({
      id: uuidv4(),
      userId: req.userId,
      prospectName: name,
      industry,
      subject: selected.subject,
      message: selected.body,
      status: 'sent',
      createdAt: new Date().toISOString()
    });
    await writeJSON(outreachFile, outreach);
    
    res.json({
      success: true,
      subject: selected.subject,
      message: selected.body,
      followUp: `Follow up in 3 days with case study for ${industry}`,
      suggestedResponse: "Yes, I'm interested. Please send more information!"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sales/lead-score', authMiddleware, async (req, res) => {
  try {
    const { budget, timeline, authority, need } = req.body;
    
    let score = 0;
    if (budget > 10000) score += 30;
    else if (budget > 5000) score += 20;
    else if (budget > 1000) score += 10;
    
    if (timeline === 'immediate') score += 30;
    else if (timeline === '1-3 months') score += 20;
    else if (timeline === '3-6 months') score += 10;
    
    if (authority === 'decision-maker') score += 20;
    else if (authority === 'influencer') score += 10;
    
    if (need === 'high') score += 20;
    else if (need === 'medium') score += 10;
    
    let qualification = 'cold';
    if (score >= 80) qualification = 'hot - contact immediately';
    else if (score >= 60) qualification = 'warm - nurture';
    else if (score >= 40) qualification = 'warm - research more';
    else qualification = 'cold - not ready';
    
    res.json({
      success: true,
      score,
      qualification,
      recommendations: score >= 70 ? 'Priority follow-up today' : 'Add to nurture campaign'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI ACCOUNTANT ROUTES ============
app.post('/api/accountant/analyze', authMiddleware, async (req, res) => {
  try {
    const { transactions } = req.body;
    
    let totalIncome = 0;
    let totalExpense = 0;
    let categories = {
      salary: 0,
      marketing: 0,
      software: 0,
      rent: 0,
      utilities: 0,
      other: 0
    };
    
    if (transactions && transactions.length > 0) {
      for (const t of transactions) {
        if (t.amount > 0) {
          totalIncome += t.amount;
        } else {
          totalExpense += Math.abs(t.amount);
          const cat = t.category || 'other';
          if (categories[cat] !== undefined) {
            categories[cat] += Math.abs(t.amount);
          } else {
            categories.other += Math.abs(t.amount);
          }
        }
      }
    } else {
      totalIncome = 50000;
      totalExpense = 32000;
      categories = {
        salary: 15000,
        marketing: 8000,
        software: 3000,
        rent: 6000,
        utilities: 3000,
        other: 0
      };
    }
    
    const profit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
    
    const recommendations = [];
    if (categories.marketing > totalIncome * 0.2) {
      recommendations.push('Marketing spend is high - consider reallocating to higher ROI channels');
    }
    if (categories.salary > totalIncome * 0.4) {
      recommendations.push('Salary costs are high - consider AI automation to reduce workforce costs by 30%');
    }
    if (categories.software > totalIncome * 0.1) {
      recommendations.push('Software costs are significant - audit subscriptions monthly');
    }
    if (profitMargin < 15) {
      recommendations.push('Profit margin below target - implement cost reduction strategies immediately');
    }
    
    recommendations.push('Set up automated invoice reminders to reduce late payments');
    recommendations.push('Review all vendor contracts quarterly for better rates');
    recommendations.push('Implement expense tracking for all departments');
    
    const taxEstimate = profit * 0.25;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalIncome: `$${totalIncome.toLocaleString()}`,
          totalExpense: `$${totalExpense.toLocaleString()}`,
          profit: `$${profit.toLocaleString()}`,
          profitMargin: `${profitMargin.toFixed(1)}%`,
          taxEstimate: `$${taxEstimate.toLocaleString()}`
        },
        categories,
        recommendations,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/accountant/budget', authMiddleware, async (req, res) => {
  try {
    const { revenue, previousRevenue } = req.body;
    
    const revenueGrowth = previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    const budget = {
      marketing: revenue * 0.15,
      salary: revenue * 0.35,
      software: revenue * 0.05,
      rent: revenue * 0.08,
      operations: revenue * 0.12,
      savings: revenue * 0.25
    };
    
    res.json({
      success: true,
      data: {
        recommendedBudget: budget,
        revenueGrowth: revenueGrowth.toFixed(1),
        notes: [
          'Marketing budget should focus on digital channels',
          'Consider hiring freeze if growth below 10%',
          'Build 6-month emergency fund from savings'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AUTOMATION ROUTES ============
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
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/automation/list', authMiddleware, async (req, res) => {
  try {
    const automations = await readJSON(AUTOMATIONS_FILE);
    const userAutomations = automations.filter(a => a.userId === req.userId);
    res.json({ success: true, data: userAutomations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/automation/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const automations = await readJSON(AUTOMATIONS_FILE);
    const index = automations.findIndex(a => a.id === id && a.userId === req.userId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Automation not found' });
    }
    
    automations[index].status = automations[index].status === 'active' ? 'paused' : 'active';
    await writeJSON(AUTOMATIONS_FILE, automations);
    
    res.json({ success: true, status: automations[index].status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/automation/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const automations = await readJSON(AUTOMATIONS_FILE);
    const filtered = automations.filter(a => !(a.id === id && a.userId === req.userId));
    
    if (filtered.length === automations.length) {
      return res.status(404).json({ success: false, error: 'Automation not found' });
    }
    
    await writeJSON(AUTOMATIONS_FILE, filtered);
    res.json({ success: true, message: 'Automation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ DASHBOARD ROUTES ============
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
        business: userBusiness || { revenue: 0, costs: 0, customers: 0 },
        stats: {
          totalMessages: userMessages.length,
          totalAutomations: userAutomations.length,
          activeAutomations: userAutomations.filter(a => a.status === 'active').length,
          automationRuns: userAutomations.reduce((sum, a) => sum + (a.runs || 0), 0),
          activeAgents: 5
        },
        recentMessages: userMessages.slice(-5).reverse()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/dashboard/business', authMiddleware, async (req, res) => {
  try {
    const { revenue, costs, customers } = req.body;
    const businesses = await readJSON(BUSINESSES_FILE);
    const index = businesses.findIndex(b => b.ownerId === req.userId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }
    
    if (revenue !== undefined) businesses[index].revenue = revenue;
    if (costs !== undefined) businesses[index].costs = costs;
    if (customers !== undefined) businesses[index].customers = customers;
    businesses[index].updatedAt = new Date().toISOString();
    
    await writeJSON(BUSINESSES_FILE, businesses);
    res.json({ success: true, data: businesses[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ MARKETPLACE ROUTES ============
app.get('/api/marketplace/listings', authMiddleware, async (req, res) => {
  try {
    const listings = [
      { id: '1', name: 'WhatsApp Auto-Responder', description: 'AI-powered WhatsApp chatbot for business', price: 49, category: 'automation', sales: 234, rating: 4.8 },
      { id: '2', name: 'CV Screener Pro', description: 'AI candidate screening and ranking system', price: 99, category: 'hr', sales: 156, rating: 4.7 },
      { id: '3', name: 'Email Campaign AI', description: 'Automated email marketing with AI personalization', price: 79, category: 'marketing', sales: 189, rating: 4.9 },
      { id: '4', name: 'Invoice Automation', description: 'Auto-generate and send invoices', price: 39, category: 'finance', sales: 312, rating: 4.6 },
      { id: '5', name: 'Social Media Scheduler', description: 'AI-powered social media posting', price: 59, category: 'marketing', sales: 178, rating: 4.7 },
      { id: '6', name: 'Customer Feedback AI', description: 'Analyze customer feedback automatically', price: 89, category: 'support', sales: 94, rating: 4.8 }
    ];
    res.json({ success: true, data: listings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/marketplace/purchase', authMiddleware, async (req, res) => {
  try {
    const { listingId } = req.body;
    
    const transactions = await readJSON(TRANSACTIONS_FILE);
    const transaction = {
      id: uuidv4(),
      userId: req.userId,
      listingId,
      amount: 49,
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    transactions.push(transaction);
    await writeJSON(TRANSACTIONS_FILE, transactions);
    
    res.json({ success: true, message: 'Purchase successful! Check your email for download link.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ PROFILE ROUTES ============
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.id === req.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan,
        credits: user.credits,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { businessName, plan } = req.body;
    const users = await readJSON(USERS_FILE);
    const index = users.findIndex(u => u.id === req.userId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (businessName) users[index].businessName = businessName;
    if (plan) users[index].plan = plan;
    
    await writeJSON(USERS_FILE, users);
    res.json({ success: true, data: users[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ HEALTH & SYSTEM ============
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '5.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/system/info', (req, res) => {
  res.json({
    name: 'Bloo AI Complete System',
    version: '5.0.0',
    features: ['AI CEO', 'AI HR', 'AI Support', 'AI Sales', 'AI Accountant', 'Automation', 'Marketplace'],
    status: 'operational'
  });
});

// ============ SERVE FRONTEND ============
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ============ ERROR HANDLING ============
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============ START SERVER ============
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Bloo AI Complete System v5.0.0`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI Agents: CEO | HR | Support | Sales | Accountant`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});

module.exports = app;

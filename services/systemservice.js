// services/systemService.js
const fs = require('fs').promises;
const path = require('path');
const { ensureDirectoryExists, writeJSON, logger } = require('../api/utils/helpers');

const DATA_PATH = path.join(__dirname, '../data');

// Data files
const DATA_FILES = [
  'users.json',
  'businesses.json',
  'messages.json',
  'automations.json',
  'transactions.json',
  'marketplace.json',
  'interviews.json',
  'outreach.json',
  'api_logs.json',
  'analytics.json'
];

async function initializeSystem() {
  try {
    logger.info('Initializing Bloo AI Enterprise System...');
    
    // Ensure data directory exists
    await ensureDirectoryExists(DATA_PATH);
    logger.info(`Data directory verified: ${DATA_PATH}`);
    
    // Initialize all data files
    for (const file of DATA_FILES) {
      const filePath = path.join(DATA_PATH, file);
      try {
        await fs.access(filePath);
        logger.info(`Found existing file: ${file}`);
      } catch {
        const initialData = getInitialDataForFile(file);
        await writeJSON(filePath, initialData);
        logger.info(`Created new file: ${file}`);
      }
    }
    
    // Create logs directory
    const logsPath = path.join(__dirname, '../logs');
    await ensureDirectoryExists(logsPath);
    
    // Seed demo data if needed
    const businesses = require('../data/businesses.json');
    if (businesses.length === 0) {
      await seedDemoData();
      logger.info('Demo data seeded successfully');
    }
    
    // Initialize default settings
    await initializeSettings();
    
    logger.info('✅ System initialization complete!');
    return true;
  } catch (error) {
    logger.error('System initialization failed:', error);
    throw error;
  }
}

function getInitialDataForFile(filename) {
  const templates = {
    'users.json': [],
    'businesses.json': [],
    'messages.json': [],
    'automations.json': [],
    'transactions.json': [],
    'marketplace.json': [
      {
        id: '1',
        name: 'WhatsApp Auto-Responder',
        description: 'AI-powered WhatsApp automation bot',
        price: 49,
        category: 'automation',
        sales: 234,
        rating: 4.8
      },
      {
        id: '2',
        name: 'CV Screener Pro',
        description: 'AI candidate screening and ranking',
        price: 99,
        category: 'hr',
        sales: 156,
        rating: 4.7
      },
      {
        id: '3',
        name: 'Email Campaign AI',
        description: 'Automated email marketing with AI',
        price: 79,
        category: 'marketing',
        sales: 189,
        rating: 4.9
      }
    ],
    'interviews.json': [],
    'outreach.json': [],
    'api_logs.json': [],
    'analytics.json': {
      totalRequests: 0,
      activeUsers: 0,
      popularEndpoints: {},
      dailyActiveUsers: {}
    }
  };
  
  return templates[filename] || [];
}

async function seedDemoData() {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  
  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const demoUser = {
    id: uuidv4(),
    email: 'demo@blooai.com',
    password: hashedPassword,
    businessName: 'Demo Business',
    plan: 'growth',
    role: 'user',
    credits: 1000,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  await writeJSON(path.join(DATA_PATH, 'users.json'), [demoUser]);
  
  // Create demo business
  const demoBusiness = {
    id: uuidv4(),
    name: 'Demo Business',
    ownerId: demoUser.id,
    plan: 'growth',
    industry: 'technology',
    size: 'small',
    metrics: {
      revenue: 50000,
      costs: 35000,
      customers: 150,
      profit: 15000,
      growth: 15
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await writeJSON(path.join(DATA_PATH, 'businesses.json'), [demoBusiness]);
  
  // Create sample messages
  const sampleMessages = [
    {
      id: uuidv4(),
      userId: demoUser.id,
      message: 'Hello, I need help with payment',
      response: 'Your payment is being processed securely. Takes 1-3 business days.',
      language: 'en',
      timestamp: new Date().toISOString()
    },
    {
      id: uuidv4(),
      userId: demoUser.id,
      message: 'What are your business hours?',
      response: 'We operate 24/7, all days of the week.',
      language: 'en',
      timestamp: new Date().toISOString()
    }
  ];
  
  await writeJSON(path.join(DATA_PATH, 'messages.json'), sampleMessages);
  
  // Create sample automation
  const sampleAutomation = {
    id: uuidv4(),
    userId: demoUser.id,
    trigger: 'new_customer',
    action: 'send_welcome_email',
    status: 'active',
    runs: 42,
    lastRun: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  
  await writeJSON(path.join(DATA_PATH, 'automations.json'), [sampleAutomation]);
}

async function initializeSettings() {
  const settingsPath = path.join(DATA_PATH, 'settings.json');
  try {
    await fs.access(settingsPath);
  } catch {
    const defaultSettings = {
      systemName: 'Bloo AI Enterprise',
      version: '3.0.0',
      maintenanceMode: false,
      features: {
        ceoAgent: true,
        hrAgent: true,
        supportAgent: true,
        salesAgent: true,
        accountantAgent: true,
        marketplace: true,
        automations: true
      },
      limits: {
        maxUsers: 1000,
        maxAutomationsPerUser: 50,
        maxMessagesPerDay: 1000,
        maxAPICallsPerDay: 10000
      },
      updatedAt: new Date().toISOString()
    };
    await writeJSON(settingsPath, defaultSettings);
  }
}

async function getSystemStatus() {
  const status = {
    healthy: true,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };
  
  // Check data directory
  try {
    await fs.access(DATA_PATH);
    status.dataDirectory = 'healthy';
  } catch {
    status.dataDirectory = 'unhealthy';
    status.healthy = false;
  }
  
  return status;
}

module.exports = {
  initializeSystem,
  getSystemStatus
};

// api/utils/helpers.js
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, '../../data');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

function generateId() {
  return require('uuid').v4();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatPercentage(value) {
  return `${value.toFixed(1)}%`;
}

function calculateGrowth(current, previous) {
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

async function logAPICall(userId, endpoint, data) {
  const logEntry = {
    userId,
    endpoint,
    data,
    timestamp: new Date().toISOString(),
    ip: null // Would be set from request
  };
  
  const logFile = path.join(DATA_PATH, 'api_logs.json');
  let logs = await readJSON(logFile);
  logs.push(logEntry);
  
  // Keep only last 10000 logs
  if (logs.length > 10000) {
    logs = logs.slice(-10000);
  }
  
  await writeJSON(logFile, logs);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .substring(0, 1000); // Limit length
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryOperation(operation, maxRetries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    operation().then(resolve).catch(error => {
      if (maxRetries === 0) {
        reject(error);
      } else {
        setTimeout(() => {
          retryOperation(operation, maxRetries - 1, delay).then(resolve).catch(reject);
        }, delay);
      }
    });
  });
}

module.exports = {
  readJSON,
  writeJSON,
  ensureDirectoryExists,
  generateId,
  formatCurrency,
  formatPercentage,
  calculateGrowth,
  getDateRange,
  logAPICall,
  sanitizeInput,
  validateEmail,
  generateToken,
  sleep,
  retryOperation,
  logger
};

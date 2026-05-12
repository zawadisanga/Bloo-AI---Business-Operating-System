// api/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// Global rate limiter
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiter (stricter)
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'API rate limit exceeded. Please slow down.'
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.userId || req.ip;
  }
});

// Auth rate limiter (even stricter for security)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.'
  },
  skipSuccessfulRequests: true,
});

// Automation rate limiter
const automationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 automation triggers per minute
  message: {
    success: false,
    error: 'Automation rate limit exceeded.'
  }
});

module.exports = {
  globalRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  automationRateLimiter
};

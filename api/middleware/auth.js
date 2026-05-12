// api/middleware/auth.js
const jwt = require('jsonwebtoken');
const { readJSON } = require('../utils/helpers');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../../data/users.json');

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please provide a valid token.' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bloo-ai-secret');
    
    // Verify user still exists
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User no longer exists' 
      });
    }
    
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role || 'user';
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired. Please login again.' 
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
}

function adminOnly(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }
  next();
}

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bloo-ai-secret');
      req.userId = decoded.id

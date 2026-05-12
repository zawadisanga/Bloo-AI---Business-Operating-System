const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/helpers');
const path = require('path');
const fs = require('fs').promises;

const DATA_PATH = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_PATH, 'users.json');
const BUSINESSES_FILE = path.join(DATA_PATH, 'businesses.json');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('businessName').optional().trim().isLength({ min: 2, max: 100 }),
  body('plan').optional().isIn(['small', 'growth', 'enterprise'])
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, businessName, plan = 'small' } = req.body;
    
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
      role: 'user',
      credits: plan === 'enterprise' ? 10000 : plan === 'growth' ? 1000 : 100,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      settings: {
        notifications: true,
        language: 'en',
        timezone: 'UTC'
      }
    };
    
    users.push(user);
    await writeJSON(USERS_FILE, users);
    
    // Create business record
    const businesses = await readJSON(BUSINESSES_FILE);
    const business = {
      id: uuidv4(),
      name: user.businessName,
      ownerId: userId,
      plan,
      industry: 'general',
      size: 'small',
      metrics: {
        revenue: 0,
        costs: 0,
        customers: 0,
        profit: 0,
        growth: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    businesses.push(business);
    await writeJSON(BUSINESSES_FILE, businesses);
    
    const token = jwt.sign(
      { id: userId, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'bloo-ai-secret',
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan,
        credits: user.credits
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    await writeJSON(USERS_FILE, users);
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'bloo-ai-secret',
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan,
        credits: user.credits
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.email === email);
    
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.json({ success: true, message: 'If email exists, reset link sent' });
    }
    
    // Generate reset token
    const resetToken = uuidv4();
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await writeJSON(USERS_FILE, users);
    
    // In production, send email here
    res.json({
      success: true,
      message: 'Password reset link sent',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.resetToken === token && u.resetTokenExpiry > Date.now());
    
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    delete user.resetToken;
    delete user.resetTokenExpiry;
    await writeJSON(USERS_FILE, users);
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bloo-ai-secret');
    res.json({ success: true, valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

module.exports = router;

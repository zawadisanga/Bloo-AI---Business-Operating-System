// scripts/seedData.js
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_PATH = path.join(__dirname, '../data');

async function seedData() {
  console.log('🌱 Seeding initial data...');
  
  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_PATH, { recursive: true });
    
    // Check if users already exist
    const usersPath = path.join(DATA_PATH, 'users.json');
    try {
      const existingUsers = await fs.readFile(usersPath, 'utf8');
      const users = JSON.parse(existingUsers);
      if (users.length > 0) {
        console.log('✅ Data already seeded, skipping...');
        return;
      }
    } catch (error) {
      // File doesn't exist, continue with seeding
    }
    
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
    
    await fs.writeFile(usersPath, JSON.stringify([demoUser], null, 2));
    
    // Create demo business
    const business = {
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
    
    await fs.writeFile(path.join(DATA_PATH, 'businesses.json'), JSON.stringify([business], null, 2));
    
    // Create empty arrays for other files
    const emptyFiles = ['messages.json', 'automations.json', 'transactions.json', 'marketplace.json'];
    for (const file of emptyFiles) {
      await fs.writeFile(path.join(DATA_PATH, file), JSON.stringify([], null, 2));
    }
    
    console.log('✅ Seed data created successfully!');
    console.log('📧 Demo login: demo@blooai.com / demo123');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedData();

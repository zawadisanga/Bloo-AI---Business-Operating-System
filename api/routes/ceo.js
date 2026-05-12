const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { ceoService } = require('../../services/ceoService');
const { validateFinancialInput } = require('../middleware/validation');
const { logAPICall } = require('../utils/helpers');

// Get strategic advice
router.post('/advice', authMiddleware, validateFinancialInput, async (req, res) => {
  try {
    const { revenue, costs, customers, industry, timeframe } = req.body;
    
    const advice = await ceoService.getStrategicAdvice({
      revenue: revenue || 0,
      costs: costs || 0,
      customers: customers || 0,
      industry: industry || 'general',
      timeframe: timeframe || 'monthly'
    });
    
    await logAPICall(req.userId, 'ceo_advice', { revenue, costs, customers });
    
    res.json({
      success: true,
      data: advice,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get growth strategies
router.post('/growth-strategies', authMiddleware, async (req, res) => {
  try {
    const { currentRevenue, targetRevenue, timeline } = req.body;
    
    const strategies = await ceoService.getGrowthStrategies({
      currentRevenue: currentRevenue || 10000,
      targetRevenue: targetRevenue || 50000,
      timeline: timeline || 12
    });
    
    res.json({
      success: true,
      data: strategies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get market analysis
router.get('/market-analysis/:industry', authMiddleware, async (req, res) => {
  try {
    const { industry } = req.params;
    
    const analysis = await ceoService.getMarketAnalysis(industry);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get competitor analysis
router.post('/competitor-analysis', authMiddleware, async (req, res) => {
  try {
    const { competitors, marketShare } = req.body;
    
    const analysis = await ceoService.getCompetitorAnalysis(competitors, marketShare);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate business forecast
router.post('/forecast', authMiddleware, async (req, res) => {
  try {
    const { historicalData, months } = req.body;
    
    const forecast = await ceoService.generateForecast(historicalData, months || 12);
    
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get KPI recommendations
router.get('/kpi-recommendations', authMiddleware, async (req, res) => {
  try {
    const recommendations = await ceoService.getKPIRecommendations();
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

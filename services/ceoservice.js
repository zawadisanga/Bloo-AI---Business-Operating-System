// services/ceoService.js
class CEOService {
  async getStrategicAdvice({ revenue, costs, customers, industry, timeframe }) {
    const profit = revenue - costs;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const avgRevenuePerCustomer = customers > 0 ? revenue / customers : 0;
    
    // Determine business health
    let health = 'good';
    let priority = 'growth';
    
    if (profitMargin < 10) {
      health = 'critical';
      priority = 'survival';
    } else if (profitMargin < 25) {
      health = 'warning';
      priority = 'stabilization';
    } else {
      health = 'excellent';
      priority = 'expansion';
    }
    
    // Generate insights
    const insights = [];
    const recommendations = [];
    const actions = [];
    
    // Financial insights
    if (profitMargin < 10) {
      insights.push({
        type: 'critical',
        message: `Your profit margin of ${profitMargin.toFixed(1)}% is dangerously low`,
        impact: 'high'
      });
      recommendations.push({
        area: 'cost reduction',
        suggestion: 'Reduce operational costs by 20-30% through automation',
        potentialSavings: (costs * 0.25).toFixed(0)
      });
      actions.push({
        task: 'Audit all business expenses',
        deadline: '7 days',
        priority: 'urgent'
      });
    } else if (profitMargin < 25) {
      insights.push({
        type: 'warning',
        message: `Profit margin at ${profitMargin.toFixed(1)}% - room for improvement`,
        impact: 'medium'
      });
      recommendations.push({
        area: 'pricing optimization',
        suggestion: 'Increase prices by 5-10% for premium customers',
        potentialGain: (revenue * 0.075).toFixed(0)
      });
    } else {
      insights.push({
        type: 'success',
        message: `Excellent profit margin of ${profitMargin.toFixed(1)}%`,
        impact: 'positive'
      });
      recommendations.push({
        area: 'aggressive expansion',
        suggestion: 'Reinvest 40% of profits into marketing and hiring',
        potentialGrowth: '30-50%'
      });
    }
    
    // Customer insights
    if (avgRevenuePerCustomer < 50) {
      insights.push({
        type: 'opportunity',
        message: `Average customer value of $${avgRevenuePerCustomer.toFixed(0)} is low`,
        impact: 'medium'
      });
      recommendations.push({
        area: 'customer value',
        suggestion: 'Implement upselling and cross-selling strategies',
        potentialIncrease: '2x customer value'
      });
    }
    
    // Growth strategies based on industry
    const growthStrategies = this.getGrowthStrategiesForIndustry(industry);
    
    return {
      analysis: {
        financial: {
          revenue: `$${revenue.toLocaleString()}`,
          costs: `$${costs.toLocaleString()}`,
          profit: `$${profit.toLocaleString()}`,
          profitMargin: `${profitMargin.toFixed(1)}%`,
          avgCustomerValue: `$${avgRevenuePerCustomer.toFixed(2)}`
        },
        health,
        priority,
        benchmark: {
          industryAverageMargin: '20-30%',
          recommendedMargin: '>25%'
        }
      },
      insights,
      recommendations,
      actions,
      growthStrategies,
      forecast: this.generateSimpleForecast(revenue, profitMargin),
      timestamp: new Date().toISOString()
    };
  }
  
  getGrowthStrategiesForIndustry(industry) {
    const strategies = {
      'ecommerce': [
        'Implement abandoned cart recovery automation',
        'Launch loyalty program with tiered rewards',
        'Optimize product recommendations with AI',
        'Expand to marketplaces like Amazon/Etsy'
      ],
      'saas': [
        'Introduce annual prepaid discounts',
        'Build affiliate/referral program',
        'Add enterprise features for higher tiers',
        'Implement usage-based pricing options'
      ],
      'agency': [
        'Create packaging for recurring retainers',
        'Develop proprietary methodology/IP',
        'Hire specialized niche experts',
        'Build sales funnel automation'
      ],
      'general': [
        'Launch referral program (20% discount)',
        'Implement email marketing automation',
        'Add chatbot for 24/7 support',
        'Create subscription/recurring revenue model',
        'Expand to 2 new marketing channels',
        'Hire virtual assistant for admin tasks'
      ]
    };
    
    return strategies[industry] || strategies['general'];
  }
  
  generateSimpleForecast(currentRevenue, profitMargin) {
    const growthRates = [0.05, 0.10, 0.15, 0.20, 0.25];
    const forecast = [];
    let revenue = currentRevenue;
    
    for (let i = 1; i <= 12; i++) {
      const growthRate = growthRates[Math.floor(Math.random() * growthRates.length)];
      revenue = revenue * (1 + growthRate);
      forecast.push({
        month: i,
        revenue: Math.round(revenue),
        profit: Math.round(revenue * (profitMargin / 100)),
        growthRate: growthRate * 100
      });
    }
    
    return forecast;
  }
  
  async getGrowthStrategies({ currentRevenue, targetRevenue, timeline }) {
    const requiredGrowth = targetRevenue - currentRevenue;
    const monthlyGrowthNeeded = requiredGrowth / timeline;
    const growthRateNeeded = (requiredGrowth / currentRevenue) * 100;
    
    const strategies = [
      {
        name: 'Aggressive Marketing',
        description: 'Increase marketing spend by 50% to acquire more customers',
        expectedGrowth: '20-30%',
        investment: currentRevenue * 0.15,
        timeline: '3 months'
      },
      {
        name: 'Price Optimization',
        description: 'Increase prices by 10-15% for high-value customers',
        expectedGrowth: '10-15%',
        investment: 0,
        timeline: '1 month'
      },
      {
        name: 'Product Expansion',
        description: 'Launch 2-3 new products or features',
        expectedGrowth: '25-40%',
        investment: currentRevenue * 0.25,
        timeline: '6 months'
      },
      {
        name: 'Partnership Program',
        description: 'Establish 5-10 strategic partnerships',
        expectedGrowth: '15-20%',
        investment: currentRevenue * 0.05,
        timeline: '4 months'
      }
    ];
    
    return {
      currentRevenue,
      targetRevenue,
      timeline: `${timeline} months`,
      gap: requiredGrowth,
      monthlyGrowthNeeded: Math.round(monthlyGrowthNeeded),
      growthRateNeeded: growthRateNeeded.toFixed(1),
      strategies: strategies.map(s => ({
        ...s,
        investment: `$${s.investment.toLocaleString()}`
      })),
      recommendation: strategies[0]
    };
  }
  
  async getMarketAnalysis(industry) {
    const marketData = {
      'technology': {
        size: '$5.2T',
        growth: '8.5%',
        trends: ['AI Integration', 'Cloud Migration', 'Cybersecurity'],
        opportunities: ['SME Automation', 'Vertical SaaS', 'AI Tools']
      },
      'ecommerce': {
        size: '$6.3T',
        growth: '12%',
        trends: ['Mobile Shopping', 'Social Commerce', 'Sustainability'],
        opportunities: ['DTC Brands', 'Subscription Boxes', 'Marketplace Selling']
      },
      'healthcare': {
        size: '$4.5T',
        growth: '7.2%',
        trends: ['Telemedicine', 'AI Diagnostics', 'Wearables'],
        opportunities: ['Patient Engagement', 'Practice Management', 'Remote Monitoring']
      }
    };
    
    return marketData[industry] || {
      size: 'Unknown',
      growth: 'Varies by segment',
      trends: ['Digital Transformation', 'Customer Experience', 'Automation'],
      opportunities: ['Niche Markets', 'Service Expansion', 'Operational Efficiency']
    };
  }
  
  async getCompetitorAnalysis(competitors, marketShare) {
    const analysis = [];
    
    for (const competitor of competitors || ['Competitor A', 'Competitor B']) {
      analysis.push({
        name: competitor,
        strengths: ['Market presence', 'Brand recognition', 'Customer base'],
        weaknesses: ['Slow innovation', 'Poor support', 'High prices'],
        opportunity: 'Differentiate through AI and automation',
        threat: 'Price competition',
        marketPosition: marketShare > 30 ? 'Leader' : 'Challenger'
      });
    }
    
    return {
      competitors: analysis,
      recommendations: [
        'Focus on unique AI capabilities',
        'Offer better customer support',
        'Price competitively with more value'
      ],
      positioning: marketShare > 30 ? 'Market Leader' : marketShare > 10 ? 'Major Player' : 'Niche Player'
    };
  }
  
  async getKPIRecommendations() {
    return {
      financial: [
        { kpi: 'Gross Margin', target: '>40%', frequency: 'Monthly' },
        { kpi: 'Operating Cash Flow', target: 'Positive', frequency: 'Monthly' },
        { kpi: 'Burn Rate', target: '<$50k', frequency: 'Monthly' }
      ],
      customer: [
        { kpi: 'Customer Acquisition Cost', target: '<$100', frequency: 'Weekly' },
        { kpi: 'Customer Lifetime Value', target: '>1000', frequency: 'Monthly' },
        { kpi: 'Churn Rate', target: '<5%', frequency: 'Monthly' }
      ],
      operational: [
        { kpi: 'Net Promoter Score', target: '>50', frequency: 'Quarterly' },
        { kpi: 'Support Response Time', target: '<1 hour', frequency: 'Daily' },
        { kpi: 'Feature Adoption', target: '>60%', frequency: 'Weekly' }
      ]
    };
  }
  
  async generateForecast(historicalData, months) {
    // Simple forecasting based on historical trends
    const defaultData = [10000, 12000, 14000, 16000, 18000, 20000];
    const data = historicalData || defaultData;
    
    const trend = (data[data.length - 1] - data[0]) / data.length;
    const forecast = [];
    let lastValue = data[data.length - 1];
    
    for (let i = 1; i <= months; i++) {
      const seasonal = Math.sin(i) * (lastValue * 0.1);
      const nextValue = lastValue + trend + seasonal;
      forecast.push({
        month: i,
        value: Math.max(0, Math.round(nextValue)),
        confidence: 100 - (i * 5)
      });
      lastValue = nextValue;
    }
    
    return {
      historicalData: data,
      forecast,
      trend: trend.toFixed(2),
      averageGrowth: ((data[data.length - 1] - data[0]) / data[0] * 100).toFixed(1) + '%',
      recommendation: trend > 0 ? 'Positive growth trajectory - invest more' : 'Negative trend - need strategic pivot'
    };
  }
}

module.exports = new CEOService();

const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load templates from file
const templatesPath = path.join(__dirname, 'data', 'templates.json');
let templates = [];
try {
  templates = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
} catch (e) {
  console.error('Failed to load templates:', e);
}

// --- Advanced Simulation Logic ---
const disruptionFactors = {
  'Port Closure': { baseDelay: 5, costMultiplier: 1.5, congestionMultiplier: 1.8, lostSalesFactor: 0.3 },
  'Fuel Hike': { baseDelay: 1, costMultiplier: 2.5, congestionMultiplier: 1.1, lostSalesFactor: 0.1 },
  'Natural Disaster': { baseDelay: 10, costMultiplier: 1.8, congestionMultiplier: 2.0, lostSalesFactor: 0.4 },
  'Labor Strike': { baseDelay: 7, costMultiplier: 1.2, congestionMultiplier: 1.5, lostSalesFactor: 0.25 },
};

const severityMultipliers = { low: 0.5, medium: 1, high: 2 };
const inventoryCostPerDay = 0.5; // a constant representing the cost of holding inventory
const valueOfGoods = 10000; // a constant representing the value of the goods being shipped

function runAdvancedSimulation(template, disruptionType, affectedLocation, severity, duration) {
  const factors = disruptionFactors[disruptionType] || disruptionFactors['Port Closure'];
  const severityMultiplier = severityMultipliers[severity] || 1;

  // 1. Delivery Delay
  const deliveryDelayDays = Math.floor(factors.baseDelay * severityMultiplier + (duration / 3));

  // 2. Cost Increase
  const logisticsCost = duration * factors.costMultiplier * severityMultiplier;
  const inventoryCost = deliveryDelayDays * inventoryCostPerDay * severityMultiplier;
  const lostSales = valueOfGoods * factors.lostSalesFactor * severityMultiplier;
  const costIncreasePercent = Math.floor(((logisticsCost + inventoryCost + lostSales) / valueOfGoods) * 100);

  // 3. Warehouse Congestion
  const warehouseCongestionLevel = Math.min(100, Math.floor(deliveryDelayDays * factors.congestionMultiplier * severityMultiplier * 5));

  // 4. Rerouting
  let newRoutes = [...template.routes];
  if (severity === 'high') {
    const affectedIndex = template.nodes.indexOf(affectedLocation);
    if (affectedIndex > 0 && affectedIndex < template.nodes.length - 1) {
      const prevNode = template.nodes[affectedIndex - 1];
      const nextNode = template.nodes[affectedIndex + 1];
      newRoutes = template.routes.filter(r => r[0] !== prevNode && r[1] !== nextNode);
      newRoutes.push([prevNode, 'Alternate Hub'], ['Alternate Hub', nextNode]);
    }
  }

  // 5. Inventory Levels
  const affectedIndex = template.nodes.indexOf(affectedLocation);
  const inventoryLevels = template.nodes.map((node, i) => {
    let baseLevel = 100 - (i * 10);
    if (i >= affectedIndex) {
      const distance = i - affectedIndex;
      const impact = (deliveryDelayDays * 5) / (distance + 1);
      baseLevel -= impact;
    }
    return Math.max(0, Math.floor(baseLevel));
  });

  return {
    deliveryDelayDays,
    costIncreasePercent,
    warehouseCongestionLevel,
    newRoutes,
    inventoryLevels,
  };
}

// GET /api/templates
app.get('/api/templates', (req, res) => {
  res.json(templates);
});

// POST /api/simulate
app.post('/api/simulate', (req, res) => {
  const { templateId, disruptionType, affectedLocation, severity, duration } = req.body;
  const template = templates.find(t => t.id === templateId);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const simulationResult = runAdvancedSimulation(template, disruptionType, affectedLocation, severity, duration);

  res.json(simulationResult);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 
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

// GET /api/templates
app.get('/api/templates', (req, res) => {
  res.json(templates);
});

// POST /api/simulate
app.post('/api/simulate', (req, res) => {
  const { templateId, disruptionType, affectedLocation, severity, duration } = req.body;
  // Mock logic: just return different numbers based on severity and duration
  let delay = ({ low: 2, medium: 7, high: 15 }[severity] || 5) + Math.floor((duration || 1) / 7);
  let cost = ({ low: 3, medium: 10, high: 25 }[severity] || 5) + Math.floor((duration || 1) / 10);
  let congestion = ({ low: 20, medium: 55, high: 90 }[severity] || 30) + Math.floor((duration || 1) * 1.5);
  // Find template
  const template = templates.find(t => t.id === templateId);
  let newRoutes = template ? [...template.routes] : [];
  // Simulate rerouting: if high severity, add a detour
  if (severity === 'high' && template) {
    newRoutes = [...template.routes, [affectedLocation, 'Alternate Hub']];
  }
  // Simulate inventory levels (randomized for demo)
  let inventoryLevels = template ? template.nodes.map((n, i) => {
    let base = 100 - (i * 15) - (severity === 'high' ? 30 : severity === 'medium' ? 15 : 5);
    base -= Math.floor((duration || 1) * 1.5);
    return Math.max(10, Math.floor(base + Math.random() * 10));
  }) : [];
  res.json({
    deliveryDelayDays: delay,
    costIncreasePercent: cost,
    warehouseCongestionLevel: Math.min(100, congestion),
    newRoutes: newRoutes,
    inventoryLevels: inventoryLevels
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 
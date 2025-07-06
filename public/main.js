// --- SPA Navigation & Rendering ---
let templates = [];
let chart = null;
let map = null;
let routeLayer = null;
let selectedTemplate = null;
let currentView = 'home';
let simStep = 1;
let simState = {
  templateId: '',
  disruptionType: '',
  affectedLocation: '',
  severity: '',
  duration: 1
};
let inventoryChart = null;

const disruptionTypes = [
  'Port Closure',
  'Fuel Hike',
  'Natural Disaster',
  'Labor Strike'
];
const allLocations = [
  'Shanghai','Singapore','Los Angeles','Chicago',
  'Berlin','Rotterdam','London','Dublin',
  'Bangkok','Jakarta','Sydney','Auckland'
];
const severities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

// Hardcoded city coordinates for mapping
const cityCoords = {
  "Shanghai": [31.2304, 121.4737],
  "Singapore": [1.3521, 103.8198],
  "Los Angeles": [34.0522, -118.2437],
  "Chicago": [41.8781, -87.6298],
  "Berlin": [52.52, 13.405],
  "Rotterdam": [51.9225, 4.47917],
  "London": [51.5074, -0.1278],
  "Dublin": [53.3498, -6.2603],
  "Bangkok": [13.7563, 100.5018],
  "Jakarta": [-6.2088, 106.8456],
  "Sydney": [-33.8688, 151.2093],
  "Auckland": [-36.8485, 174.7633],
  "Alternate Hub": [20, 80]
};

function renderHome() {
  document.getElementById('app').innerHTML = `
    <div class="flex flex-col items-center justify-center flex-1 py-16">
      <h1 class="text-4xl md:text-5xl font-extrabold text-blue-700 mb-4 text-center drop-shadow">Supply Chain Disruption Simulator</h1>
      <p class="text-lg md:text-xl text-gray-700 mb-8 max-w-2xl text-center">
        Explore how global supply chains respond to disruptions like port closures, fuel hikes, and natural disasters. Simulate scenarios, adjust severity and duration, and visualize the impact on delivery, cost, and inventory in real time.
      </p>
      <button id="startBtn" class="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-3 rounded shadow-lg transition">Start Simulation</button>
      <div class="mt-10 text-gray-500 text-sm">
        <span class="inline-block mr-2">Features:</span>
        <span class="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2">Scenario Modeling</span>
        <span class="inline-block bg-green-100 text-green-700 px-2 py-1 rounded mr-2">Animated Dashboard</span>
        <span class="inline-block bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Interactive Map</span>
      </div>
    </div>
  `;
  document.getElementById('startBtn').onclick = () => {
    currentView = 'simulator';
    simStep = 1;
    renderSimulator();
  };
}

function renderSimulator() {
  document.getElementById('app').innerHTML = `
    <div class="container mx-auto p-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-blue-700">Simulator Dashboard</h2>
        <button id="backHome" class="text-blue-600 hover:underline">&larr; Home</button>
      </div>
      <div id="simSteps" class="mb-6 flex gap-2 text-sm">
        <div class="${simStep===1?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'} px-3 py-1 rounded">1. Scenario</div>
        <div class="${simStep===2?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'} px-3 py-1 rounded">2. Severity & Duration</div>
        <div class="${simStep===3?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'} px-3 py-1 rounded">3. Simulate</div>
        <div class="${simStep===4?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'} px-3 py-1 rounded">4. Dashboard</div>
      </div>
      <div id="simStepContent"></div>
    </div>
  `;
  document.getElementById('backHome').onclick = () => {
    currentView = 'home';
    renderHome();
  };
  renderSimStep();
}

function renderSimStep() {
  const el = document.getElementById('simStepContent');
  if (simStep === 1) {
    // Scenario selection
    fetch('/api/templates').then(res=>res.json()).then(data=>{
      templates = data;
      el.innerHTML = `
        <div class="bg-white p-6 rounded shadow max-w-xl mx-auto">
          <h3 class="text-lg font-semibold mb-4">Select a Supply Chain Scenario</h3>
          <select id="templateSelect" class="w-full border rounded p-2 mb-4">
            ${templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
          <button id="nextStep1" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Next</button>
        </div>
      `;
      document.getElementById('nextStep1').onclick = () => {
        simState.templateId = document.getElementById('templateSelect').value;
        selectedTemplate = templates.find(t=>t.id===simState.templateId);
        simStep = 2;
        renderSimulator();
      };
    });
  } else if (simStep === 2) {
    // Severity & duration
    el.innerHTML = `
      <div class="bg-white p-6 rounded shadow max-w-xl mx-auto">
        <h3 class="text-lg font-semibold mb-4">Disruption Details</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Disruption Type</label>
          <select id="disruptionType" class="w-full border rounded p-2">
            ${disruptionTypes.map(t=>`<option>${t}</option>`).join('')}
          </select>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Affected Location</label>
          <select id="affectedLocation" class="w-full border rounded p-2">
            ${selectedTemplate.nodes.map(loc=>`<option>${loc}</option>`).join('')}
          </select>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Severity</label>
          <select id="severity" class="w-full border rounded p-2">
            ${severities.map(s=>`<option value="${s.value}">${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Duration (days)</label>
          <input id="duration" type="number" min="1" max="60" value="7" class="w-full border rounded p-2" />
        </div>
        <div class="flex gap-2">
          <button id="prevStep2" class="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400">Back</button>
          <button id="nextStep2" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Next</button>
        </div>
      </div>
    `;
    document.getElementById('prevStep2').onclick = () => {
      simStep = 1;
      renderSimulator();
    };
    document.getElementById('nextStep2').onclick = () => {
      simState.disruptionType = document.getElementById('disruptionType').value;
      simState.affectedLocation = document.getElementById('affectedLocation').value;
      simState.severity = document.getElementById('severity').value;
      simState.duration = parseInt(document.getElementById('duration').value, 10) || 7;
      simStep = 3;
      renderSimulator();
    };
  } else if (simStep === 3) {
    // Simulate
    el.innerHTML = `
      <div class="bg-white p-6 rounded shadow max-w-xl mx-auto flex flex-col items-center">
        <h3 class="text-lg font-semibold mb-4">Ready to Simulate?</h3>
        <div class="mb-4 text-gray-700">
          <div><b>Scenario:</b> ${selectedTemplate.name}</div>
          <div><b>Disruption:</b> ${simState.disruptionType} at ${simState.affectedLocation}</div>
          <div><b>Severity:</b> ${simState.severity.charAt(0).toUpperCase()+simState.severity.slice(1)}</div>
          <div><b>Duration:</b> ${simState.duration} days</div>
        </div>
        <div class="flex gap-2">
          <button id="prevStep3" class="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400">Back</button>
          <button id="runSimBtn" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Simulate</button>
        </div>
      </div>
    `;
    document.getElementById('prevStep3').onclick = () => {
      simStep = 2;
      renderSimulator();
    };
    document.getElementById('runSimBtn').onclick = () => {
      runSimulation();
    };
  } else if (simStep === 4) {
    // Dashboard
    el.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-4 rounded shadow">
          <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">Simulation Results
            <span class="ml-1 text-gray-400 cursor-pointer" title="Delivery delay, cost increase, and congestion are estimated based on your scenario.">?</span>
          </h3>
          <canvas id="resultChart" height="200"></canvas>
        </div>
        <div class="bg-white p-4 rounded shadow">
          <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">Route Map
            <span class="ml-1 text-gray-400 cursor-pointer" title="Shows original and new routes after disruption.">?</span>
          </h3>
          <div id="map"></div>
        </div>
      </div>
      <div class="bg-white p-4 rounded shadow mt-6 max-w-2xl mx-auto">
        <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">Inventory Levels
          <span class="ml-1 text-gray-400 cursor-pointer" title="Estimated inventory at each node after disruption (0-100 scale).">?</span>
        </h3>
        <canvas id="inventoryChart" height="120"></canvas>
      </div>
      <div class="flex gap-2 mt-6">
        <button id="resetBtn" class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Reset</button>
        <button id="newSimBtn" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">New Simulation</button>
      </div>
      <div class="mt-6 text-gray-600 text-sm max-w-2xl mx-auto">
        <b>Scenario:</b> ${selectedTemplate.name} <br/>
        <b>Description:</b> ${selectedTemplate.nodes.join(' → ')}
      </div>
    `;
    updateChart(null);
    updateInventoryChart(null);
    drawMap(selectedTemplate ? selectedTemplate.routes : []);
    document.getElementById('resetBtn').onclick = () => {
      updateChart(null);
      updateInventoryChart(null);
      drawMap(selectedTemplate.routes);
    };
    document.getElementById('newSimBtn').onclick = () => {
      simStep = 1;
      renderSimulator();
    };
    if (simState.simResult) {
      updateChart(simState.simResult);
      updateInventoryChart(simState.simResult);
      drawMap(simState.simResult.newRoutes, true);
    }
  }
}

function runSimulation() {
  fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateId: simState.templateId,
      disruptionType: simState.disruptionType,
      affectedLocation: simState.affectedLocation,
      severity: simState.severity,
      duration: simState.duration
    })
  })
    .then(res => res.json())
    .then(data => {
      simState.simResult = data;
      simStep = 4;
      renderSimulator();
    });
}

function updateChart(data) {
  const ctx = document.getElementById('resultChart').getContext('2d');
  if (chart) chart.destroy();
  if (!data) {
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Delivery Delay (days)', 'Cost Increase (%)', 'Warehouse Congestion'],
        datasets: [{
          label: 'Simulation',
          data: [0, 0, 0],
          backgroundColor: ['#2563eb', '#f59e42', '#ef4444']
        }]
      },
      options: { animation: true }
    });
    return;
  }
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Delivery Delay (days)', 'Cost Increase (%)', 'Warehouse Congestion'],
      datasets: [{
        label: 'Simulation',
        data: [data.deliveryDelayDays, data.costIncreasePercent, data.warehouseCongestionLevel],
        backgroundColor: ['#2563eb', '#f59e42', '#ef4444']
      }]
    },
    options: {
      animation: {
        duration: 800,
        easing: 'easeOutBounce'
      },
      scales: {
        y: { beginAtZero: true, max: 100 }
      }
    }
  });
}

function updateInventoryChart(data) {
  const ctx = document.getElementById('inventoryChart').getContext('2d');
  if (inventoryChart) inventoryChart.destroy();
  if (!data || !data.inventoryLevels) {
    inventoryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: selectedTemplate ? selectedTemplate.nodes : [],
        datasets: [{
          label: 'Inventory Level',
          data: selectedTemplate ? selectedTemplate.nodes.map(_=>0) : [],
          backgroundColor: '#10b981'
        }]
      },
      options: {
        indexAxis: 'y',
        animation: true,
        scales: { x: { min: 0, max: 100 } }
      }
    });
    return;
  }
  inventoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: selectedTemplate.nodes,
      datasets: [{
        label: 'Inventory Level',
        data: data.inventoryLevels,
        backgroundColor: '#10b981'
      }]
    },
    options: {
      indexAxis: 'y',
      animation: {
        duration: 900,
        easing: 'easeOutBounce'
      },
      scales: { x: { min: 0, max: 100 } },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x} / 100`
          }
        }
      }
    }
  });
}

function drawMap(routes, animate) {
  if (!map) {
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  }
  if (routeLayer) {
    map.removeLayer(routeLayer);
  }
  routeLayer = L.layerGroup();
  if (routes && routes.length) {
    routes.forEach((route, i) => {
      const [from, to] = route;
      if (cityCoords[from] && cityCoords[to]) {
        const polyline = L.polyline([
          cityCoords[from],
          cityCoords[to]
        ], {
          color: i === routes.length - 1 && animate ? '#f59e42' : '#2563eb',
          weight: 5,
          opacity: animate && i === routes.length - 1 ? 0.7 : 0.5,
          dashArray: animate && i === routes.length - 1 ? '10,10' : null
        });
        polyline.addTo(routeLayer);
        if (animate && i === routes.length - 1) {
          polyline.setStyle({ opacity: 0 });
          setTimeout(() => polyline.setStyle({ opacity: 0.7 }), 300);
        }
        L.marker(cityCoords[from]).addTo(routeLayer).bindPopup(from);
        if (i === routes.length - 1) {
          L.marker(cityCoords[to]).addTo(routeLayer).bindPopup(to);
        }
      }
    });
  }
  routeLayer.addTo(map);
}

window.onload = function() {
  renderHome();
}; 
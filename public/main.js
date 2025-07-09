// --- SPA Navigation & Rendering ---
let templates = [];
let chart = null;
let map = null;
let geoJsonLayer = null;
let geoJsonData = null;
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

// City to country mapping for highlighting
const cityCountry = {
  "Shanghai": "China",
  "Singapore": "Singapore",
  "Los Angeles": "United States of America",
  "Chicago": "United States of America",
  "Berlin": "Germany",
  "Rotterdam": "Netherlands",
  "London": "United Kingdom",
  "Dublin": "Ireland",
  "Bangkok": "Thailand",
  "Jakarta": "Indonesia",
  "Sydney": "Australia",
  "Auckland": "New Zealand"
};

// --- Modal & Spinner Utilities ---
function showModal(html) {
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').classList.remove('hidden');
}
function hideModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}
function showSpinner() {
  document.getElementById('spinnerOverlay').classList.remove('hidden');
}
function hideSpinner() {
  document.getElementById('spinnerOverlay').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('aboutBtn').onclick = () => {
    showModal(`
      <h2 class="text-2xl font-bold mb-2 text-blue-700 flex items-center gap-2">
        <svg xmlns='http://www.w3.org/2000/svg' class='h-6 w-6 text-blue-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z' /></svg>
        About This App
      </h2>
      <p class="mb-2 text-gray-700">This simulator lets you explore how global supply chains respond to disruptions. Built with Node.js, Express, Chart.js, Leaflet.js, and Tailwind CSS.</p>
      <ul class="list-disc pl-6 text-gray-600 mb-2">
        <li>Model real-world scenarios</li>
        <li>Visualize impact with charts and maps</li>
        <li>Interactive, step-by-step simulation</li>
      </ul>
      <div class="text-right mt-4"><button id="closeAbout" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Close</button></div>
    `);
    setTimeout(() => {
      document.getElementById('closeAbout').onclick = hideModal;
    }, 100);
  };
  document.getElementById('closeModal').onclick = hideModal;
  document.getElementById('modalOverlay').onclick = (e) => {
    if (e.target === document.getElementById('modalOverlay')) hideModal();
  };

  fetch('/countries.geo.json')
    .then(response => response.json())
    .then(data => {
      geoJsonData = data;
    });
});

// --- Animation Helper ---
function animateStepIn(el) {
  el.classList.add('opacity-0', 'translate-y-4');
  setTimeout(() => {
    el.classList.remove('opacity-0', 'translate-y-4');
    el.classList.add('transition', 'duration-500', 'ease-out');
  }, 10);
}

// Home page
function renderHome() {
  document.getElementById('app').innerHTML = `
    <div id="homeView" class="flex flex-col items-center justify-center flex-1 py-16 bg-blue-accent min-h-screen">
      <div class="text-center">
        <h1 class="text-5xl md:text-6xl font-bold mb-4">Supply Chain Simulator</h1>
        <p class="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl mx-auto">An interactive tool to visualize and understand the impact of disruptions on global supply chains. Powered by Walmart.</p>
        <button id="startBtn" class="btn btn-blue">Start Simulation</button>
      </div>
    </div>
  `;
  document.getElementById('startBtn').onclick = () => {
    currentView = 'simulator';
    simStep = 1;
    renderSimulator();
  };
  animateStepIn(document.getElementById('homeView'));
}

function renderSimulator() {
  document.getElementById('app').innerHTML = `
    <div id="simView" class="container mx-auto p-4 sm:p-6 lg:p-8 transition duration-500">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold text-[#004c91]">Simulation Dashboard</h2>
        <button id="backHome" class="text-[#0071ce] hover:underline font-semibold">Back to Home</button>
      </div>
      <div id="simSteps" class="mb-8 flex items-center justify-center gap-4 text-sm font-semibold">
        <div class="flex items-center gap-2 ${simStep >= 1 ? 'text-[#0071ce]' : 'text-gray-400'}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center ${simStep >= 1 ? 'bg-[#0071ce] text-white' : 'bg-gray-200'}">1</div>
          <span>Scenario</span>
        </div>
        <div class="flex-1 h-1 ${simStep > 1 ? 'bg-[#0071ce]' : 'bg-gray-200'}"></div>
        <div class="flex items-center gap-2 ${simStep >= 2 ? 'text-[#0071ce]' : 'text-gray-400'}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center ${simStep >= 2 ? 'bg-[#0071ce] text-white' : 'bg-gray-200'}">2</div>
          <span>Disruption</span>
        </div>
        <div class="flex-1 h-1 ${simStep > 2 ? 'bg-[#0071ce]' : 'bg-gray-200'}"></div>
        <div class="flex items-center gap-2 ${simStep >= 3 ? 'text-[#0071ce]' : 'text-gray-400'}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center ${simStep >= 3 ? 'bg-[#0071ce] text-white' : 'bg-gray-200'}">3</div>
          <span>Simulate</span>
        </div>
        <div class="flex-1 h-1 ${simStep > 3 ? 'bg-[#0071ce]' : 'bg-gray-200'}"></div>
        <div class="flex items-center gap-2 ${simStep >= 4 ? 'text-[#0071ce]' : 'text-gray-400'}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center ${simStep >= 4 ? 'bg-[#0071ce] text-white' : 'bg-gray-200'}">4</div>
          <span>Dashboard</span>
        </div>
      </div>
      <div id="simStepContent" class="bg-white p-6 rounded-xl shadow-lg"></div>
    </div>
  `;
  document.getElementById('backHome').onclick = () => {
    currentView = 'home';
    renderHome();
  };
  animateStepIn(document.getElementById('simView'));
  renderSimStep();
}

function renderSimStep() {
  const el = document.getElementById('simStepContent');
  if (simStep === 1) {
    fetch('/api/templates').then(res=>res.json()).then(data=>{
      templates = data;
      el.innerHTML = `
        <div class="bg-blue-accent p-6 rounded-xl shadow-blue">
          <h3 class="text-2xl font-bold mb-4">1. Select a Scenario</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${templates.map(t=>`
              <div class="scenario-card cursor-pointer" data-template-id="${t.id}">
                <div class="flex items-center gap-4 mb-4">
                  <div class="w-16 h-16 bg-blue-accent rounded-full flex items-center justify-center">
                    <svg class="h-8 w-8 text-[#0071ce]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  </div>
                  <h4 class="font-bold text-xl">${t.name}</h4>
                </div>
                <p class="text-gray-600">${t.nodes.join(' → ')}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      document.querySelectorAll('.scenario-card').forEach(card => {
        card.onclick = () => {
          simState.templateId = card.dataset.templateId;
          selectedTemplate = templates.find(t=>t.id===simState.templateId);
          simStep = 2;
          renderSimulator();
        };
      });
    });
  } else if (simStep === 2) {
    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-blue-accent p-6 rounded-xl shadow-blue">
        <div>
          <h3 class="text-2xl font-bold mb-4">2. Define Disruption</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Disruption Type</label>
              <select id="disruptionType" class="w-full border-gray-300 rounded-md shadow-sm p-2">
                ${disruptionTypes.map(t=>`<option>${t}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Affected Location</label>
              <select id="affectedLocation" class="w-full border-gray-300 rounded-md shadow-sm p-2">
                ${selectedTemplate.nodes.map(loc=>`<option>${loc}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select id="severity" class="w-full border-gray-300 rounded-md shadow-sm p-2">
                ${severities.map(s=>`<option value="${s.value}">${s.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
              <input id="duration" type="number" min="1" max="60" value="7" class="w-full border-gray-300 rounded-md shadow-sm p-2" />
            </div>
          </div>
          <div class="flex justify-between mt-8">
            <button id="prevStep2" class="btn btn-yellow">Back</button>
            <button id="nextStep2" class="btn btn-blue">Next</button>
          </div>
        </div>
        <div id="map-container" class="min-h-[400px] h-full bg-blue-accent rounded-lg">
          <div id="map" class="h-full w-full"></div>
        </div>
      </div>
    `;

    setTimeout(() => {
        drawMap(selectedTemplate.routes);
    }, 100);

    function updateMapHighlight() {
      const affectedLocation = document.getElementById('affectedLocation').value;
      const severity = document.getElementById('severity').value;
      const country = cityCountry[affectedLocation];
      drawMap(selectedTemplate.routes, false, country, severity);
    }

    document.getElementById('affectedLocation').onchange = updateMapHighlight;
    document.getElementById('severity').onchange = updateMapHighlight;

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
    el.innerHTML = `
      <div class="text-center bg-blue-accent p-6 rounded-xl shadow-blue">
        <h3 class="text-2xl font-bold mb-4">3. Confirm Simulation</h3>
        <div class="bg-yellow-accent p-6 rounded-lg inline-block">
          <div class="text-left space-y-2">
            <p><strong>Scenario:</strong> ${selectedTemplate.name}</p>
            <p><strong>Disruption:</strong> ${simState.disruptionType} at ${simState.affectedLocation}</p>
            <p><strong>Severity:</strong> ${simState.severity.charAt(0).toUpperCase()+simState.severity.slice(1)}</p>
            <p><strong>Duration:</strong> ${simState.duration} days</p>
          </div>
        </div>
        <div class="flex justify-center gap-4 mt-8">
          <button id="prevStep3" class="btn btn-yellow">Back</button>
          <button id="runSimBtn" class="btn btn-blue">Run Simulation</button>
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
    el.innerHTML = `
      <div class="bg-blue-accent p-6 rounded-xl shadow-blue">
        <h3 class="text-2xl font-bold mb-4 text-center">4. Simulation Dashboard</h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h4 class="text-xl font-semibold mb-4">Route Map</h4>
            <div id="map" class="h-[400px] w-full rounded-lg"></div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h4 class="text-xl font-semibold mb-4">Simulation Results</h4>
            <div class="chart-container"><canvas id="resultChart" height="300"></canvas></div>
          </div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md mt-8">
          <h4 class="text-xl font-semibold mb-4">Inventory Levels</h4>
          <div class="chart-container"><canvas id="inventoryChart" height="300"></canvas></div>
        </div>
        <div class="flex justify-center gap-4 mt-8">
          <button id="resetBtn" class="btn btn-yellow">Reset</button>
          <button id="newSimBtn" class="btn btn-blue">New Simulation</button>
        </div>
      </div>
    `;

    let chartsUpdated = false;
    setTimeout(() => {
      if (!chartsUpdated) {
        const data = simState.simResult;
        if (data && data.deliveryDelayDays !== undefined) {
          updateChart(data);
          updateInventoryChart(data);
          drawMap(data.newRoutes, true);
        } else {
          updateChart(null);
          updateInventoryChart(null);
          drawMap(selectedTemplate.routes);
          const chartDiv = document.getElementById('resultChart').parentElement;
          chartDiv.insertAdjacentHTML('beforeend', '<div class="text-red-600 mt-4">Simulation failed or returned no data.</div>');
        }
        chartsUpdated = true;
      }
      document.getElementById('resetBtn').onclick = () => {
        updateChart(null);
        updateInventoryChart(null);
        drawMap(selectedTemplate.routes);
      };
      document.getElementById('newSimBtn').onclick = () => {
        simStep = 1;
        renderSimulator();
      };
    }, 100);
  }
}

function runSimulation() {
  showSpinner();
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
    })
    .finally(hideSpinner);
}

function updateChart(data) {
  const ctx = document.getElementById('resultChart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Delivery Delay (days)', 'Cost Increase (%)', 'Warehouse Congestion'],
      datasets: [{
        label: 'Simulation Impact',
        data: data ? [data.deliveryDelayDays, data.costIncreasePercent, data.warehouseCongestionLevel] : [0, 0, 0],
        backgroundColor: ['#0071ce', '#ffc220', '#f44336'],
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Simulation Impact Assessment', font: { size: 16, weight: 'bold' }, color: '#004c91' }
      },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function updateInventoryChart(data) {
  const ctx = document.getElementById('inventoryChart').getContext('2d');
  if (inventoryChart) inventoryChart.destroy();
  inventoryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: selectedTemplate ? selectedTemplate.nodes : [],
      datasets: [{
        label: 'Inventory Level',
        data: data && data.inventoryLevels ? data.inventoryLevels : (selectedTemplate ? selectedTemplate.nodes.map(_ => 0) : []),
        backgroundColor: 'rgba(0, 113, 206, 0.1)',
        borderColor: '#0071ce',
        borderWidth: 3,
        fill: true,
        pointBackgroundColor: '#ffc220',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Inventory Levels Across Nodes', font: { size: 16, weight: 'bold' }, color: '#004c91' }
      },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function drawMap(routes, animate, affectedCountry, severity) {
  if (!map) {
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  } else {
    if (geoJsonLayer) {
      map.removeLayer(geoJsonLayer);
    }
    if (routeLayer) {
      map.removeLayer(routeLayer);
    }
  }

  if (geoJsonData) {
    geoJsonLayer = L.geoJSON(geoJsonData, {
      style: function(feature) {
        let fillColor = '#f0f8ff'; // A very light blue
        let fillOpacity = 0.5;
        if (feature.properties.name === affectedCountry) {
          switch (severity) {
            case 'low':
              fillColor = '#79b829'; // Walmart Green
              break;
            case 'medium':
              fillColor = '#ffc220'; // Walmart Yellow
              break;
            case 'high':
              fillColor = '#ff4c4c'; // A shade of red
              break;
          }
          fillOpacity = 0.7;
        }
        return {
          fillColor: fillColor,
          weight: 1,
          opacity: 1,
          color: '#004c91', // Walmart Dark Blue
          fillOpacity: fillOpacity
        };
      },
      onEachFeature: function (feature, layer) {
        layer.on('click', function () {
          const countryName = feature.properties.name;
          const affectedLocationSelect = document.getElementById('affectedLocation');
          for (let i = 0; i < affectedLocationSelect.options.length; i++) {
            const option = affectedLocationSelect.options[i];
            if (cityCountry[option.value] === countryName) {
              affectedLocationSelect.value = option.value;
              updateMapHighlight();
              break;
            }
          }
        });
      }
    }).addTo(map);
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
          color: i === routes.length - 1 && animate ? '#ffc220' : '#0071ce',
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

  setTimeout(() => map.invalidateSize(), 10);
}

window.onload = function() {
  renderHome();
}; 
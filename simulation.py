# supply_chain.py
import networkx as nx
import random, yfinance as yf
import pandas as pd
import os
import sys

# Default values if not provided
disruption_type = sys.argv[1] if len(sys.argv) > 1 else "Port Closure"
severity = sys.argv[2] if len(sys.argv) > 2 else "medium"
duration = int(sys.argv[3]) if len(sys.argv) > 3 else 7

base_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_dir, "routes.csv")

# Example weights (customize as needed)
disruption_factors = {
    'Port Closure': {'baseDelay': 5, 'costMultiplier': 1.5, 'congestionMultiplier': 1.8, 'lostSalesFactor': 0.3},
    'Fuel Hike': {'baseDelay': 1, 'costMultiplier': 2.5, 'congestionMultiplier': 1.1, 'lostSalesFactor': 0.1},
    'Natural Disaster': {'baseDelay': 10, 'costMultiplier': 1.8, 'congestionMultiplier': 2.0, 'lostSalesFactor': 0.4},
    'Labor Strike': {'baseDelay': 7, 'costMultiplier': 1.2, 'congestionMultiplier': 1.5, 'lostSalesFactor': 0.25},
    'War And Geopolitical Tensions': {'baseDelay': 15, 'costMultiplier': 3.0, 'congestionMultiplier': 2.5, 'lostSalesFactor': 0.5},
    'Military Conflict': {'baseDelay': 20, 'costMultiplier': 4.0, 'congestionMultiplier': 3.0, 'lostSalesFactor': 0.7},
    'Sanctions': {'baseDelay': 8, 'costMultiplier': 2.2, 'congestionMultiplier': 1.7, 'lostSalesFactor': 0.35},
    'Port Blockade': {'baseDelay': 12, 'costMultiplier': 2.8, 'congestionMultiplier': 2.2, 'lostSalesFactor': 0.45},
    'Tanker Attack': {'baseDelay': 18, 'costMultiplier': 3.5, 'congestionMultiplier': 2.8, 'lostSalesFactor': 0.6},
    'Diplomatic Breakdown': {'baseDelay': 6, 'costMultiplier': 1.7, 'congestionMultiplier': 1.3, 'lostSalesFactor': 0.2}
}
severity_multipliers = {'low': 0.5, 'medium': 1, 'high': 2, 'critical': 3}

disruption_type = disruption_type.strip().title()
severity = severity.strip().lower()

factors = disruption_factors.get(disruption_type, disruption_factors['Port Closure'])
severity_multiplier = severity_multipliers.get(severity, 1)

delivery_delay_days = int(factors['baseDelay'] * severity_multiplier + (duration / 3))
logistics_cost = duration * factors['costMultiplier'] * severity_multiplier
inventory_cost = delivery_delay_days * 0.5 * severity_multiplier
lost_sales = 10000 * factors['lostSalesFactor'] * severity_multiplier
cost_increase_percent = int(((logistics_cost + inventory_cost + lost_sales) / 10000) * 100)
warehouse_congestion_level = min(100, int(delivery_delay_days * factors['congestionMultiplier'] * severity_multiplier * 5))


class SupplyChainSimulator:
    def __init__(self, csv_path=csv_path):
        self.G = nx.DiGraph()
        self.base_cost = self.get_current_oil_price()
        self.load_routes_from_csv(csv_path)

    def load_routes_from_csv(self, file_path):
        df = pd.read_csv(file_path)
        self.G.add_nodes_from(pd.unique(df[['from','to']].values.ravel()))
        for _, row in df.iterrows():
            self.G.add_edge(
                row['from'], row['to'],
                capacity=int(row['capacity']),
                cost=float(row['transport_cost']),
                status="active"
            )

    def get_current_oil_price(self):
        try:
            ticker = yf.Ticker("BZ=F")
            data = ticker.history(period="1d")
            price = round(data['Close'].iloc[-1], 2)
            return price
        except:
            return 80.0

    def disrupt_iran_routes(self):
        for u, v in self.G.out_edges("Iran"):
            self.G[u][v]['status'] = 'disrupted'
        if self.G.has_node("Strait of Hormuz"):
            for u, v in list(self.G.edges("Strait of Hormuz")):
                self.G[u][v]['status'] = 'disrupted'

    def reroute(self):
        for alt in ["Saudi Arabia", "Russia"]:
            if self.G.has_edge(alt, "India"):
                self.G[alt]["India"]['status'] = "rerouted"

    def simulate_cost_over_time(self, steps=5):
        series = []
        for t in range(steps):
            d = sum(1 for _,_,d in self.G.edges(data=True) if d['status']=='disrupted')
            r = sum(1 for _,_,d in self.G.edges(data=True) if d['status']=='rerouted')
            price = self.base_cost + 2*d + 3*r + random.randint(-3,3)
            series.append(round(max(price, self.base_cost),2))
        return series

    def export_state(self):
        return [
            {
                "from": u, "to": v,
                "status": data['status'],
                "capacity": data['capacity'],
                "cost": data['cost']
            }
            for u,v,data in self.G.edges(data=True)
        ]

    def run_simulation(self):
        self.disrupt_iran_routes()
        self.reroute()
        return {
            "base_oil_price": self.base_cost,
            "routes": self.export_state(),
            "cost_over_time": self.simulate_cost_over_time()
        }

if __name__ == "__main__":
    import json
import numpy as np

def convert(o):
    if isinstance(o, np.generic):
        return o.item()
    raise TypeError

sim = SupplyChainSimulator()
print(f"Received: {disruption_type=}, {severity=}, {duration=}", file=sys.stderr)
print(f"Using factors: {factors}, severity_multiplier: {severity_multiplier}", file=sys.stderr)
result = {
    "deliveryDelayDays": delivery_delay_days,
    "costIncreasePercent": cost_increase_percent,
    "warehouseCongestionLevel": warehouse_congestion_level,
    "routes": sim.export_state(),
    "cost_over_time": sim.simulate_cost_over_time()
}
print(json.dumps(result, default=convert), flush=True)

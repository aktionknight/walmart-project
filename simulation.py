# supply_chain.py
import networkx as nx
import random, yfinance as yf
import pandas as pd

class SupplyChainSimulator:
    def __init__(self, csv_path="backbone/routes.csv"):
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
    sim = SupplyChainSimulator()
    print(sim.run_simulation())

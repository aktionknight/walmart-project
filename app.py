# app.py
from flask import Flask, jsonify
from simulation import SupplyChainSimulator
from flask_cors import CORS  # allow frontend access from another port

app = Flask(__name__)
CORS(app)

@app.route("/simulate", methods=["GET"])
def simulate():
    sim = SupplyChainSimulator()
    result = sim.run_simulation()
    return jsonify(result)

if __name__ == "__main__":
    app.run(port=5000)

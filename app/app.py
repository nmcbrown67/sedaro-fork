# HTTP SERVER

import json
import os

from flask import Flask, request
from flask_cors import CORS
from simulator import Simulator
from store import QRangeStore

app = Flask(__name__)
CORS(app, origins=["http://localhost:5000"])


@app.get("/")
def health():
    return "<p>Sedaro Nano API - running!</p>"


@app.get("/simulation")
def get_data():

    # If data.json doesn't exist, return empty data
    if not os.path.exists("./data.json"):
        data = []

    # Else return json from data.json
    else:
        with open("./data.json") as f:
            data = json.load(f)

    return data


@app.post("/simulation")
def simulate():
    # Get data from request in this form
    # init = {
    #     "Planet": {"x": 0, "y": 0.1, "vx": 0.1, "vy": 0},
    #     "Satellite": {"x": 0, "y": 1, "vx": 1, "vy": 0},
    # }

    # Define time and timeStep for each object
    init: dict = request.json
    for key in init.keys():
        init[key]["time"] = 0
        init[key]["timeStep"] = 0.01

    # Create store and simulator
    store = QRangeStore()
    simulator = Simulator(store=store, init=init)

    # Run simulation
    simulator.simulate()

    # Save data to data.json
    with open("./data.json", "w") as f:
        f.write(json.dumps(store.store, indent=4))

    return store.store

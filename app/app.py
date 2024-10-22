# HTTP SERVER

import json
import os

from flask import Flask
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
    if not os.path.exists("data.json"):
        data = []

    # Else return json from data.json
    with open("./data.json") as f:
        data = json.load(f)

    return data


@app.post("/simulation")
def simulate():
    # TODO: Get data from request in this form

    init = {
        "Planet": {"time": 0, "timeStep": 0.01, "x": 0, "y": 0.1, "vx": 0.1, "vy": 0},
        "Satellite": {"time": 0, "timeStep": 0.01, "x": 0, "y": 1, "vx": 1, "vy": 0},
    }
    store = QRangeStore()

    simulator = Simulator(store=store, init=init)
    simulator.simulate()

    with open("./data.json", "w") as f:
        f.write(json.dumps(store.store, indent=4))

    return store.store

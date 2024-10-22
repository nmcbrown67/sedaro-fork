import json
import os

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5000"])


@app.get("/")
def health():
    return "<p>Sedaro Nano - running!</p>"


@app.get("/data")
def get_data():

    # If data.json doesn't exist, run sim.py
    if not os.path.exists("data.json"):
        os.system("python3 sim.py")

    # Return json from data.json
    with open("data.json") as f:
        data = json.load(f)

    return data

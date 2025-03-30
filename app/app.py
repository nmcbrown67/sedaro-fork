# HTTP SERVER

import json

from flask import Flask, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from simulator import Simulator
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from store import QRangeStore
import logging
from datetime import datetime

from flask_socketio import SocketIO
from flask_socketio import send, emit

import time


''' Goal: Live stream

    High Level Plan: Form communication bewtween backend and frontend so instead of
    running simulator and dumping/sending data to frontend, 

    make a communication pipe and as simulator runs send data in chunks

    Things to Use (Research):

    1. Websocket: 

    communication protocol that enables real-time, two-way interaction between a client (like a browser) and a server
    Unlike traditional HTTP (request/response), WebSockets stay open after the initial handshake.
    This means the server can push data to the client at any time, without waiting for the client to ask.

    2. Flask-socket-io : Python library that integrates WebSockets with Flask

    3. Use eventlet to handle non-blocking (asynch confuses me so honestly want to avoid)

    Reference Library: https://flask-socketio.readthedocs.io/en/latest/getting_started.html
'''
class Base(DeclarativeBase):
    pass


############################## Application Configuration ##############################

app = Flask(__name__)
CORS(app, origins=["http://localhost:3030"])

db = SQLAlchemy(model_class=Base)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
db.init_app(app)

logging.basicConfig(level=logging.INFO)

# MC: Socket io initialize

socketIO = SocketIO(app, logger="True", engineio_logger=True, cors_allowed_origins= "*")

############################## Database Models ##############################


class Simulation(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    data: Mapped[str]


with app.app_context():
    db.create_all()


############################## API Endpoints ##############################


@app.get("/")
def health():
    return "<p>Sedaro Nano API - running!</p>"



@app.get("/simulation")
def get_data():
    # Get most recent simulation from database
    simulation: Simulation = Simulation.query.order_by(Simulation.id.desc()).first()
    return simulation.data if simulation else []


@app.post("/simulation")
def simulate():
    # Get data from request in this form
    # init = {
    #     "Body1": {"x": 0, "y": 0.1, "vx": 0.1, "vy": 0},
    #     "Body2": {"x": 0, "y": 1, "vx": 1, "vy": 0},
    # }

    # Define time and timeStep for each agent
    init: dict = request.json
    for key in init.keys():
        init[key]["time"] = 0
        init[key]["timeStep"] = 0.01

    # Create store and simulator
    t = datetime.now()
    store = QRangeStore()
    simulator = Simulator(store=store, init=init)
    logging.info(f"Time to Build: {datetime.now() - t}")

    # Run simulation
    t = datetime.now()
    simulator.simulate()
    logging.info(f"Time to Simulate: {datetime.now() - t}")

    # Save data to database
    simulation = Simulation(data=json.dumps(store.store))
    db.session.add(simulation)
    db.session.commit()

    # ME: returns simulation data to client 
    return store.store


#MC: Server side event handler for simulation data 

def ack():
    print('message was received!!')
'''

Tip: use (emit) for named event

HIGH LEVEL STEPS:

    1. listens for event from client

    2. initialize simulation

    3. Run simulation - use simulate method

    4. emit updated simulation data to frontend/client side

    5. when simulation done send finito message to client side

    6. error handling - if client disconnects stop simulaiton
'''

# 1
@socketIO.on('client_simulation_start')
def handle_simulation_data(init):

    print("Received client_simulation_start event with init:", init)

    #2 Initialize simulation
    for key in init.keys():
        init[key]["time"] = 0
        init[key]["timeStep"] = 0.01

    store = QRangeStore()
    simulator = Simulator(store=store, init=init)
    
    #3 Run simulation (copy simulator method but replace self with simulator)
    iterations = 500 
    for _ in range(iterations):
            for agentId in simulator.init:
                t = simulator.times[agentId]
                universe = simulator.read(t - 0.001)
                if set(universe) == set(simulator.init):

                    newState = simulator.step(agentId, universe)
                    simulator.store[t, newState[agentId]["time"]] = newState
                    simulator.times[agentId] = newState[agentId]["time"]
    
                    #4 For each agent emit
                    emit('simulation_response', {agentId: newState})
            time.sleep(0.1)

    emit('simulation_complete', {'message': 'Simulation finished'})
    



### Actually Running the Server ###

if __name__ == '__main__':
    socketIO.run(app, port=8000)
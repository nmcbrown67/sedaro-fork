# HTTP SERVER

import json

from flask import Flask, request
from flask import Response, stream_with_context
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from simulator import Simulator
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from store import QRangeStore
import logging
from datetime import datetime


import time




''' Goal: Live stream

    High Level Plan: Form communication bewtween backend and frontend so instead of
    running simulator and dumping/sending data to frontend, 

    make a communication pipe and as simulator runs send data in chunks

    
PLAN 1:
    Things to Use (Research):

    1. Websocket: 

    communication protocol that enables real-time, two-way interaction between a client (like a browser) and a server
    Unlike traditional HTTP (request/response), WebSockets stay open after the initial handshake.
    This means the server can push data to the client at any time, without waiting for the client to ask.

    2. Flask-socket-io : Python library that integrates WebSockets with Flask

    3. Use eventlet to handle non-blocking (asynch confuses me so honestly want to avoid)

    Reference Library: https://flask-socketio.readthedocs.io/en/latest/getting_started.html

Roadblock: Socket-io.client not compitable with vite version

PLAN 2: 

    Server side events: allows the server to keep the HTTP connection open and push data changes to the client

    1. Use generator functions (yield instead of return or print)

    Example:

        @route("/stream")
        def stream():
            def eventStream():
                while True:
                    # Poll data from the database
                    # and see if there's a new message
                    if len(messages) > len(previous_messages):
                        yield "data: 
                            {}\n\n".format(messages[len(messages)-1)])"
            
            return Response(eventStream(), mimetype="text/event-stream")

        hypothetical event source that checks if there's a new inbox message and yield the new message

    STEPS:

        Replace the blocking POST route with a new GET endpoint
        returns a streaming response with the proper SSE content type.
    
        Inside that route, create a generator that instantiates your simulation and then
        in a loop, yields each simulation cycle as an SSE event 

        format: "data: <any_data>\n\n"

'''
class Base(DeclarativeBase):
    pass


############################## Application Configuration ##############################

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

db = SQLAlchemy(model_class=Base)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
db.init_app(app)

logging.basicConfig(level=logging.INFO)



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


# Replace the blocking POST route with a new GET endpoint
#         returns a streaming response with the proper SSE content type.
    
#         Inside that route, create a generator that instantiates your simulation and then
#         in a loop, yields each simulation cycle as an SSE event 

#         format: "data: <any_data>\n\n"

@app.get("/simulation/stream")
def stream_simulation():
    try:
        # Get initial conditions from query parameters
        init = {
            "Body1": {
                "position": {
                    "x": float(request.args.get("Body1.position.x", 0)),
                    "y": float(request.args.get("Body1.position.y", 0)),
                    "z": float(request.args.get("Body1.position.z", 0))
                },
                "velocity": {
                    "x": float(request.args.get("Body1.velocity.x", 0)),
                    "y": float(request.args.get("Body1.velocity.y", 0)),
                    "z": float(request.args.get("Body1.velocity.z", 0))
                },
                "mass": float(request.args.get("Body1.mass", 1))
            },
            "Body2": {
                "position": {
                    "x": float(request.args.get("Body2.position.x", 0)),
                    "y": float(request.args.get("Body2.position.y", 0)),
                    "z": float(request.args.get("Body2.position.z", 0))
                },
                "velocity": {
                    "x": float(request.args.get("Body2.velocity.x", 0)),
                    "y": float(request.args.get("Body2.velocity.y", 0)),
                    "z": float(request.args.get("Body2.velocity.z", 0))
                },
                "mass": float(request.args.get("Body2.mass", 1))
            }
        }

        logging.info(f"Received initial conditions: {init}")

        # Define time and timeStep for each agent
        for key in init.keys():
            init[key]["time"] = 0
            init[key]["timeStep"] = 0.1  

        # Create store and simulator
        t = datetime.now()
        store = QRangeStore()
        simulator = Simulator(store=store, init=init)
        logging.info(f"Time to Build: {datetime.now() - t}")

        def event_stream():
            try:
                # Initial heartbeat
                yield f"data: {json.dumps({'heartbeat': True})}\n\n"
                
                # Speed parameter (higher = faster simulation)
                speed = float(request.args.get("speed", 1.0))
                
                for i, cycle in enumerate(simulator.simulate(iterations=500)):
                    try:
                        if not cycle:  # Skip empty cycles
                            continue
                            
                        # Send simulation data
                        yield f"data: {json.dumps(cycle)}\n\n"
                        
                        # Send heartbeat every 10 cycles
                        if i > 0 and i % 10 == 0:
                            yield f"data: {json.dumps({'heartbeat': True})}\n\n"
                            
                        # Control simulation speed
                        time.sleep(max(0.01, 0.05 / speed))
                        
                    except Exception as e:
                        logging.error(f"Error in cycle {i}: {str(e)}")
                        yield f"data: {json.dumps({'error': str(e)})}\n\n"
                        continue
                
                # Final completion message
                yield f"data: {json.dumps({'complete': True})}\n\n"
                
            except Exception as e:
                logging.error(f"Error in event stream: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return Response(
            stream_with_context(event_stream()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "text/event-stream"
            }
        )
    
    #Error handling
    except Exception as e:
        logging.error(f"Error in stream_simulation: {str(e)}")
        return Response(
            f"Error: {str(e)}",
            status=500,
            mimetype="text/plain"
        )

############################## Running the Server ##############################

if __name__ == '__main__':
    app.run(port=8000)


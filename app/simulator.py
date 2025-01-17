# SIMULATOR

from functools import reduce
from operator import __or__
import subprocess
import json

from modsim import engines
from store import QRangeStore

def parse_query(query):
    popen = subprocess.Popen('../queries/sedaro-nano-queries', stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    (stdout, _) = popen.communicate(query)
    if popen.returncode:
        raise Exception("Parsing query failed!")
    return json.loads(stdout)

class Simulator:
    """
    A Simulator is used to simulate the propagation of agents in the universe.
    This class is *not* pure. It mutates the data store in place and maintains internal state.

    It is given an initial state of the following form:
    ```
    {
        'agentId': {
            'time': <time of instantiation>,
            'timeStep': <time step for propagation>,
            **otherSimulatedProperties,
        },
        **otherAgents,
    }
    ```

    Args:
        store (QRangeStore): The data store in which to save the simulation results.
        init (dict): The initial state of the universe.
    """

    def __init__(self, store: QRangeStore, init: dict):
        self.store = store
        store[-999999999, 0] = init
        self.init = init
        self.times = {engineId: state["time"] for engineId, state in init.items()}
        self.sim_graph = {}
        for engine in engines:
            engine_graph = {}
            for agentId, sms in engine["agents"].items():
                agent = []
                for sm in sms:
                    consumed = parse_query(sm["consumed"])["content"]
                    produced = parse_query(sm["produced"])
                    func = sm["function"]
                    agent.append({"func": func, "consumed": consumed, "produced": produced})
                engine_graph[agentId] = agent
            self.sim_graph[engine["name"]] = engine_graph

    def read(self, t):
        try:
            data = self.store[t]
        except IndexError:
            data = []
        return reduce(__or__, data, {}) # combine all data into one dictionary

    def step(self, engineId, universe):
        state = dict()
        sms = []
        for (agentId, agent) in self.sim_graph[engineId].items():
            for sm in agent:
                sms.append((agentId, sm))
        while sms:
            next_sms = []
            for (agentId, sm) in sms:
                if self.run_sm(engineId, agentId, sm, universe, state) is None:
                    next_sms.append((agentId, sm))
            sms = next_sms
        return state

    def run_sm(self, engineId, agentId, sm, universe, newState):
        inputs = []
        for q in sm["consumed"]:
            found = self.find(engineId, agentId, q, universe, newState)
            if found is None:
                return None
            inputs.append(found)
        res = sm["func"](*inputs)
        self.put(engineId, agentId, sm["produced"], universe, newState, res)
        return res

    def find(self, engineId, agentId, query, universe, newState: dict, prev=False):
        match query["kind"]:
            case "Base":
                if prev:
                    return universe[engineId][agentId][query["content"]]
                agentState = newState.get(agentId)
                if agentState is None:
                    return None
                return agentState.get(query["content"])
            case "Prev":
                return self.find(engineId, agentId, query["content"], universe, newState, prev=True)
            case "Root":
                if prev:
                    return universe[engineId]
                return newState
            case "Agent":
                # agent always gets the previous state
                return universe[engineId][query["content"]]
            case "Access":
                base = self.find(engineId, agentId, query["content"]["base"], universe, newState, prev)
                if base is None:
                    return None
                return base.get(query["content"]["field"])
            case "Tuple":
                res = []
                for q in query["content"]:
                    found = self.find(engineId, agentId, q, universe, newState, prev)
                    if found is None:
                        return None
                    res.append(found)
                return res
            case _:
                return None

    def put(self, engineId, agentId, query, universe, newState: dict, data):
        match query["kind"]:
            case "Base":
                agentState = newState.get(agentId)
                if agentState is None:
                    agentState = {}
                    newState[agentId] = agentState
                agentState[query["content"]] = data
            case "Prev":
                raise Exception(f"Cannot produce prev query {query}")
            case "Root":
                pass
            case "Agent":
                res = universe[engineId][query["content"]]
                if res is None:
                    res = {}
                    universe[engineId][query["content"]] = res
                return res
            case "Access":
                baseQuery = query["content"]["base"]
                base = self.find(engineId, agentId, baseQuery, universe, newState)
                if base is None:
                    base = {}
                    self.put(engineId, agentId, baseQuery, universe, newState, base)
                base[query["content"]["field"]] = data
            case "Tuple":
                raise Exception(f"Cannot produce tuple")

    def simulate(self, iterations: int = 500):
        for _ in range(iterations):
            for engineId in self.init:
                t = self.times[engineId]
                universe = self.read(t - 0.001)
                if set(universe) == set(self.init):
                    newState = self.step(engineId, universe)
                    self.store[t, newState["time"]] = {engineId: newState}
                    self.times[engineId] = newState["time"]

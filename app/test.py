
from simulator import Simulator
from store import QRangeStore
store = QRangeStore()
from modsim import data
sim = Simulator(store, data)
sim.simulate()
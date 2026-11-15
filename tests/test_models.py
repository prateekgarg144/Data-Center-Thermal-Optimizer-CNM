import numpy as np
from models.heat_generation import rack_power
from models.cooling_model import cooling_delivered_to_racks, electrical_power_kw
from models.thermal_model import next_temperature

def test_rack_power():
    assert np.isclose(rack_power([0.5], [2], [10])[0], 6.0)

def test_cooling_distribution():
    a = np.array([[0.8, 0.1], [0.2, 0.7]])
    assert np.allclose(cooling_delivered_to_racks([10, 10], a), [9, 9])

def test_electrical_power_positive():
    p = electrical_power_kw([10, 10], [5, 5], [0.01, 0.01])
    assert np.all(p > 0)

def test_temperature_dynamics():
    t = next_temperature([22], [5], [5], 30, [0.2], [0.5], 1/12)
    assert np.isclose(t[0], 22 + (1/12/0.5) * (5 - 0.2*(22-30) - 5))

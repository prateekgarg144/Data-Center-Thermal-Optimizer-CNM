import numpy as np
from models.cooling_model import electrical_power_kw

def cooling_objective(q, previous_q, cop0, cop_slope, movement_weight=0.015):
    """Instantaneous electrical power plus a small setpoint-movement penalty."""
    q = np.asarray(q, dtype=float)
    power = electrical_power_kw(q, cop0, cop_slope).sum()
    movement = movement_weight * np.square(q - previous_q).sum()
    return float(power + movement)

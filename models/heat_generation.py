import numpy as np

def rack_power(utilization, idle_power_kw, max_power_kw):
    """Electrical rack power (kW) from utilization in [0, 1]."""
    u = np.asarray(utilization, dtype=float)
    idle = np.asarray(idle_power_kw, dtype=float)
    pmax = np.asarray(max_power_kw, dtype=float)
    if np.any((u < 0) | (u > 1)):
        raise ValueError("Utilization must be between 0 and 1.")
    return idle + (pmax - idle) * u

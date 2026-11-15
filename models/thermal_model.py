import numpy as np

def next_temperature(temp_c, rack_heat_kw, cooling_to_rack_kw,
                    ambient_c, heat_loss_kw_per_c, capacitance_kwh_per_c,
                    dt_hours):
    """Forward-Euler discretization of a lumped rack-zone thermal model."""
    temp = np.asarray(temp_c, dtype=float)
    heat = np.asarray(rack_heat_kw, dtype=float)
    cooling = np.asarray(cooling_to_rack_kw, dtype=float)
    k = np.asarray(heat_loss_kw_per_c, dtype=float)
    cap = np.asarray(capacitance_kwh_per_c, dtype=float)
    if np.any(cap <= 0):
        raise ValueError("Thermal capacitance must be positive.")
    net_heat_kw = heat - k * (temp - ambient_c) - cooling
    return temp + (dt_hours / cap) * net_heat_kw

import numpy as np

def cooling_delivered_to_racks(unit_cooling_kw, distribution_matrix):
    """Map cooling-unit thermal output to rack-level cooling (kW thermal)."""
    q = np.asarray(unit_cooling_kw, dtype=float)
    a = np.asarray(distribution_matrix, dtype=float)
    return a @ q

def cop(unit_cooling_kw, cop0, slope):
    """Illustrative load-dependent coefficient of performance."""
    q = np.asarray(unit_cooling_kw, dtype=float)
    return np.asarray(cop0, dtype=float) - np.asarray(slope, dtype=float) * q

def electrical_power_kw(unit_cooling_kw, cop0, slope):
    """Cooling-unit electrical input power (kW)."""
    q = np.asarray(unit_cooling_kw, dtype=float)
    performance = cop(q, cop0, slope)
    if np.any(performance <= 0):
        raise ValueError("COP must remain positive.")
    return q / performance

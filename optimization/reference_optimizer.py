import numpy as np
from scipy.optimize import minimize
from optimization.constraints import predict_temperature
from optimization.objective_function import cooling_objective

def slsqp_optimize(current_temp, rack_heat, previous_q, config):
    """Optional constrained reference solver (SLSQP) for cross-checking."""
    bounds = [(0.0, float(v)) for v in config.cooling_max]
    ramp = config.ramp_limit

    def temp(q):
        return predict_temperature(q, current_temp, rack_heat, config)

    constraints = [
        {"type": "ineq", "fun": lambda q: temp(q) - (config.min_temp_c + 0.02)},
        {"type": "ineq", "fun": lambda q: (config.max_temp_c - 0.02) - temp(q)},
        {"type": "ineq", "fun": lambda q: ramp - (q - previous_q)},
        {"type": "ineq", "fun": lambda q: ramp + (q - previous_q)},
    ]
    result = minimize(
        lambda q: cooling_objective(q, previous_q, config.cop0_array,
                                    config.cop_slope_array),
        np.clip(previous_q, 0.0, config.cooling_max),
        method="SLSQP", bounds=bounds, constraints=constraints,
        options={"maxiter": 300, "ftol": 1e-9}
    )
    if not result.success:
        raise RuntimeError(f"SLSQP failed: {result.message}")
    return result.x, float(result.fun)

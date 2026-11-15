import numpy as np
from scipy.optimize import minimize
from optimization.constraints import is_feasible, violation_penalty, predict_temperature
from optimization.objective_function import cooling_objective

def simplex_optimize(current_temp, rack_heat, previous_q, config):
    """Bounded Nelder-Mead with penalty terms and explicit feasibility checks."""
    previous_q = np.asarray(previous_q, dtype=float)
    bounds = [(0.0, float(v)) for v in config.cooling_max]

    def penalized(x):
        q = np.clip(np.asarray(x, dtype=float), 0.0, config.cooling_max)
        base = cooling_objective(q, previous_q, config.cop0_array,
                                 config.cop_slope_array)
        return base + violation_penalty(q, current_temp, rack_heat,
                                        previous_q, config)

    starts = [previous_q, np.minimum(previous_q + 5.0, config.cooling_max)]
    candidates = []
    for start in starts:
        result = minimize(
            penalized, start, method="Nelder-Mead", bounds=bounds,
            options={"maxiter": 180, "xatol": 1e-4, "fatol": 1e-6}
        )
        q = np.clip(result.x, 0.0, config.cooling_max)
        if is_feasible(q, current_temp, rack_heat, previous_q, config, tol=2e-5):
            cost = cooling_objective(q, previous_q, config.cop0_array,
                                     config.cop_slope_array)
            candidates.append((q, cost))
    if candidates:
        return min(candidates, key=lambda item: item[1])

    # Constrained numerical fallback. This is not reported as a Simplex result;
    # it is used only to keep the simulator feasible when penalty-NM struggles.
    constraints = [
        {"type": "ineq", "fun": lambda q: predict_temperature(
            q, current_temp, rack_heat, config) - (config.min_temp_c + 0.02)},
        {"type": "ineq", "fun": lambda q: (config.max_temp_c - 0.02) - predict_temperature(
            q, current_temp, rack_heat, config)},
        {"type": "ineq", "fun": lambda q: config.ramp_limit - (q - previous_q)},
        {"type": "ineq", "fun": lambda q: config.ramp_limit + (q - previous_q)},
    ]
    fallback = minimize(
        lambda q: cooling_objective(q, previous_q, config.cop0_array,
                                    config.cop_slope_array),
        np.clip(previous_q, 0.0, config.cooling_max), method="SLSQP",
        bounds=bounds, constraints=constraints,
        options={"maxiter": 100, "ftol": 1e-8}
    )
    q = np.clip(fallback.x, 0.0, config.cooling_max)
    if fallback.success and is_feasible(q, current_temp, rack_heat,
                                         previous_q, config, tol=2e-5):
        return q, cooling_objective(q, previous_q, config.cop0_array,
                                    config.cop_slope_array)
    from optimization.exhaustive_search import exhaustive_search
    return exhaustive_search(current_temp, rack_heat, previous_q, config,
                             grid_step=5.0)

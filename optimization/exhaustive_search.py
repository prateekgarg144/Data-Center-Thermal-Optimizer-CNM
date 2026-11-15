import itertools
import numpy as np
from optimization.constraints import is_feasible
from optimization.objective_function import cooling_objective

def exhaustive_search(current_temp, rack_heat, previous_q, config, grid_step=10.0):
    """Enumerate a finite grid of cooling setpoints; intended for 2-unit benchmark."""
    axes = [
        np.arange(0.0, limit + grid_step * 0.5, grid_step)
        for limit in config.cooling_max
    ]
    best_q, best_cost = None, np.inf
    for candidate in itertools.product(*axes):
        q = np.asarray(candidate, dtype=float)
        if not np.all(np.abs(q - previous_q) <= config.ramp_limit + 1e-9):
            continue
        if not is_feasible(q, current_temp, rack_heat, previous_q, config):
            continue
        cost = cooling_objective(q, previous_q, config.cop0_array,
                                 config.cop_slope_array)
        if cost < best_cost:
            best_q, best_cost = q.copy(), cost
    if best_q is None:
        raise RuntimeError("No feasible grid point found. Try a finer grid or review model limits.")
    return best_q, best_cost

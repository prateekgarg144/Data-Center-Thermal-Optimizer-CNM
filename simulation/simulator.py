import time
from dataclasses import replace
import numpy as np
import pandas as pd
from models.heat_generation import rack_power
from models.cooling_model import cooling_delivered_to_racks, electrical_power_kw
from models.thermal_model import next_temperature
from optimization.simplex_optimizer import simplex_optimize
from optimization.exhaustive_search import exhaustive_search
from optimization.constraints import is_feasible

def baseline_controller(temp, heat, previous_q, config):
    """Proportional target-temperature baseline with least-squares allocation."""
    target = 25.5
    required_rack_cooling = (
        heat - config.K * (temp - config.ambient_c)
        - config.C * (target - temp) / config.dt_hours
    )
    required_rack_cooling = np.maximum(required_rack_cooling, 0.0)
    q, *_ = np.linalg.lstsq(config.A, required_rack_cooling, rcond=None)
    return np.clip(q, 0.0, config.cooling_max)

def run_simulation(utilization, ambient_c, config, method="simplex"):
    config = replace(config, ambient_c=float(ambient_c))
    utilization = np.asarray(utilization, dtype=float)
    if utilization.shape != (config.steps, config.n_racks):
        raise ValueError(f"Expected utilization shape {(config.steps, config.n_racks)}")
    temp = np.full(config.n_racks, config.initial_temp_c, dtype=float)
    previous_q = np.zeros(config.n_cooling_units, dtype=float)
    rows = []
    optimizer_seconds = 0.0

    for step in range(config.steps):
        heat = rack_power(utilization[step], config.idle, config.pmax)
        old_temp = temp.copy()
        start = time.perf_counter()

        if method == "simplex":
            q, _ = simplex_optimize(temp, heat, previous_q, config)
        elif method == "exhaustive":
            q, _ = exhaustive_search(temp, heat, previous_q, config, grid_step=5.0)
        elif method == "baseline":
            q = baseline_controller(temp, heat, previous_q, config)
        else:
            raise ValueError("method must be simplex, exhaustive, or baseline")

        optimizer_seconds += time.perf_counter() - start
        rack_cooling = cooling_delivered_to_racks(q, config.A)
        temp = next_temperature(
            temp, heat, rack_cooling, ambient_c, config.K, config.C,
            config.dt_hours
        )
        unit_electric = electrical_power_kw(q, config.cop0_array,
                                            config.cop_slope_array)
        row = {
            "step": step,
            "time_hours": (step + 1) * config.dt_hours,
            "method": method,
            "ambient_c": ambient_c,
            "total_rack_heat_kw": float(heat.sum()),
            "cooling_electric_kw": float(unit_electric.sum()),
            "cooling_energy_kwh": float(unit_electric.sum() * config.dt_hours),
            "max_temp_c": float(temp.max()),
            "min_temp_c": float(temp.min()),
            "temperature_violation_count": int(
                np.sum((temp < config.min_temp_c) | (temp > config.max_temp_c))),
        }
        for j in range(config.n_cooling_units):
            row[f"cooling_unit_{j+1}_kw_thermal"] = float(q[j])
        for i in range(config.n_racks):
            row[f"rack_{i+1}_temp_c"] = float(temp[i])
            row[f"rack_{i+1}_heat_kw"] = float(heat[i])
            row[f"rack_{i+1}_cooling_kw"] = float(rack_cooling[i])
            row[f"rack_{i+1}_previous_temp_c"] = float(old_temp[i])
        rows.append(row)
        previous_q = q.copy()

    frame = pd.DataFrame(rows)
    return frame, optimizer_seconds

import numpy as np
from models.cooling_model import cooling_delivered_to_racks
from models.thermal_model import next_temperature

def predict_temperature(q, current_temp, rack_heat, config):
    rack_cooling = cooling_delivered_to_racks(q, config.A)
    return next_temperature(
        current_temp, rack_heat, rack_cooling, config.ambient_c,
        config.K, config.C, config.dt_hours
    )

def is_feasible(q, current_temp, rack_heat, previous_q, config, tol=1e-7):
    q = np.asarray(q, dtype=float)
    if np.any(q < -tol) or np.any(q > config.cooling_max + tol):
        return False
    if np.any(np.abs(q - previous_q) > config.ramp_limit + tol):
        return False
    predicted = predict_temperature(q, current_temp, rack_heat, config)
    return bool(np.all(predicted >= config.min_temp_c + 0.02 - tol) and
                np.all(predicted <= config.max_temp_c - 0.02 + tol))

def violation_penalty(q, current_temp, rack_heat, previous_q, config):
    q = np.asarray(q, dtype=float)
    predicted = predict_temperature(q, current_temp, rack_heat, config)
    low = np.maximum((config.min_temp_c + 0.02) - predicted, 0.0)
    high = np.maximum(predicted - (config.max_temp_c - 0.02), 0.0)
    lower_q = np.maximum(-q, 0.0)
    upper_q = np.maximum(q - config.cooling_max, 0.0)
    ramp = np.maximum(np.abs(q - previous_q) - config.ramp_limit, 0.0)
    return 1e5 * (np.square(low).sum() + np.square(high).sum()
                  + np.square(lower_q).sum() + np.square(upper_q).sum()
                  + np.square(ramp).sum())

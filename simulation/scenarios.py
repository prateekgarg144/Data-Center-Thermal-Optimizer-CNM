import numpy as np

def make_scenarios(steps, n_racks=5):
    """Return reproducible utilization profiles and ambient temperatures."""
    x = np.arange(steps)
    base = np.array([0.35, 0.50, 0.65, 0.40, 0.30])
    scenarios = {}

    scenarios["low_workload"] = {
        "utilization": np.tile(np.clip(base * 0.45, 0.05, 0.95), (steps, 1)),
        "ambient_c": 27.0,
    }
    scenarios["normal_workload"] = {
        "utilization": np.tile(base, (steps, 1)),
        "ambient_c": 30.0,
    }
    scenarios["high_workload"] = {
        "utilization": np.tile(np.array([0.65, 0.70, 0.85, 0.65, 0.60]), (steps, 1)),
        "ambient_c": 30.0,
    }

    spike = np.tile(base, (steps, 1))
    spike[steps // 3: steps // 3 + max(2, steps // 8), :] = np.array(
        [0.75, 0.80, 0.90, 0.75, 0.70])
    scenarios["workload_spike"] = {"utilization": spike, "ambient_c": 30.0}

    hot = np.tile(base, (steps, 1))
    scenarios["hot_ambient"] = {"utilization": hot, "ambient_c": 35.0}

    return scenarios

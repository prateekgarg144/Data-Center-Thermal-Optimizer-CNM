import numpy as np

def summarize(frame, optimizer_seconds, method, scenario):
    energy = float(frame["cooling_energy_kwh"].sum())
    return {
        "scenario": scenario,
        "method": method,
        "cooling_energy_kwh": energy,
        "average_cooling_power_kw": float(frame["cooling_electric_kw"].mean()),
        "maximum_rack_temperature_c": float(frame["max_temp_c"].max()),
        "minimum_rack_temperature_c": float(frame["min_temp_c"].min()),
        "temperature_violation_steps": int(
            (frame["temperature_violation_count"] > 0).sum()),
        "optimizer_runtime_seconds": float(optimizer_seconds),
    }

def energy_savings_percent(baseline_energy, optimized_energy):
    if baseline_energy <= 0:
        return float("nan")
    return 100.0 * (baseline_energy - optimized_energy) / baseline_energy

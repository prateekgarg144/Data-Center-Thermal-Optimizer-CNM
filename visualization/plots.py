from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

def plot_temperature(frame, output_path, title):
    plt.figure(figsize=(10, 5))
    for i in range(1, 6):
        plt.plot(frame["time_hours"], frame[f"rack_{i}_temp_c"], label=f"Rack {i}")
    plt.axhline(27, linestyle="--", label="Maximum limit")
    plt.axhline(18, linestyle=":", label="Minimum limit")
    plt.xlabel("Time (hours)")
    plt.ylabel("Temperature (°C)")
    plt.title(title)
    plt.legend(ncol=2)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

def plot_energy(frames, output_path, title):
    plt.figure(figsize=(10, 5))
    for method, frame in frames.items():
        cumulative = frame["cooling_energy_kwh"].cumsum()
        plt.plot(frame["time_hours"], cumulative, label=method)
    plt.xlabel("Time (hours)")
    plt.ylabel("Cumulative cooling electricity (kWh)")
    plt.title(title)
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

def plot_comparison(summary, output_path):
    pivot = summary.pivot(index="scenario", columns="method",
                          values="cooling_energy_kwh")
    ax = pivot.plot(kind="bar", figsize=(11, 6))
    ax.set_ylabel("Cooling electricity (kWh)")
    ax.set_title("Cooling energy by scenario and controller")
    ax.tick_params(axis="x", rotation=20)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()

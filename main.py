from pathlib import Path
import pandas as pd
from config import Config
from simulation.scenarios import make_scenarios
from simulation.simulator import run_simulation
from evaluation.metrics import summarize, energy_savings_percent
from visualization.plots import plot_temperature, plot_energy, plot_comparison

def main():
    config = Config()
    output = Path("outputs")
    output.mkdir(exist_ok=True)
    scenarios = make_scenarios(config.steps, config.n_racks)
    methods = ["baseline", "simplex", "exhaustive"]
    all_summaries = []

    for scenario_name, scenario in scenarios.items():
        scenario_frames = {}
        for method in methods:
            frame, runtime = run_simulation(
                scenario["utilization"], scenario["ambient_c"],
                config, method=method
            )
            frame.to_csv(output / f"timeseries_{scenario_name}_{method}.csv",
                         index=False)
            scenario_frames[method] = frame
            all_summaries.append(summarize(
                frame, runtime, method, scenario_name
            ))

        plot_temperature(
            scenario_frames["simplex"],
            output / f"temperature_{scenario_name}.png",
            f"Rack temperatures – {scenario_name} (Simplex)"
        )
        plot_energy(
            scenario_frames,
            output / f"energy_{scenario_name}.png",
            f"Cumulative cooling energy – {scenario_name}"
        )

    summary = pd.DataFrame(all_summaries)
    summary.to_csv(output / "summary.csv", index=False)
    plot_comparison(summary, output / "comparison.png")

    # Add savings against baseline for each scenario.
    baseline = summary[summary.method == "baseline"].set_index("scenario")
    summary["savings_vs_baseline_percent"] = summary.apply(
        lambda row: energy_savings_percent(
            baseline.loc[row.scenario, "cooling_energy_kwh"],
            row.cooling_energy_kwh
        ), axis=1
    )
    summary.to_csv(output / "summary.csv", index=False)
    print("\n=== DATA CENTER THERMAL OPTIMIZER RESULTS ===")
    print(summary.to_string(index=False, float_format=lambda x: f"{x:.3f}"))
    print(f"\nFiles generated in: {output.resolve()}")

if __name__ == "__main__":
    main()

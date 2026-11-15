# Project Report: Data Center Thermal Optimizer

## Abstract
This project develops a reproducible optimization-based simulation for allocating cooling capacity across five server racks served by three cooling zones. The objective is to reduce cooling electricity while maintaining rack-zone temperatures inside a configured operating band. A proportional baseline controller is compared with grid-based exhaustive search and a derivative-free Nelder-Mead (Simplex) optimizer.

## Scope and assumptions
- Five rack thermal zones and three cooling units.
- Eight-hour simulation with five-minute time steps.
- Synthetic utilization profiles and illustrative equipment parameters.
- A lumped thermal model; no CFD or detailed airflow simulation.
- Cooling coefficients are effective model gains, not literal airflow fractions.
- Cooling COP is represented by an illustrative linear function of thermal output.
- Optimization is performed one time step at a time (one-step receding-horizon control).

## Mathematical formulation
Rack electrical power and approximate heat generation:

`P_i(t) = P_idle_i + (P_max_i - P_idle_i) U_i(t)`

Discrete thermal dynamics:

`T_i(t+1) = T_i(t) + dt/C_i [P_i(t) - K_i(T_i(t)-T_ambient) - Q_i(t)]`

Cooling delivered to rack `i`:

`Q_i(t) = sum_j A_ij q_j(t)`

Cooling-unit electrical power:

`P_elec,j(t) = q_j(t) / [COP0_j - slope_j*q_j(t)]`

Optimization objective:

`min sum_j P_elec,j(t) + lambda * ||q(t)-q(t-1)||^2`

Subject to temperature, cooling-capacity, cooling-ramp and thermal-dynamics constraints. The numerical optimizer uses a 0.02 °C internal safety margin inside the nominal 18–27 °C operating band.

## Controllers compared
1. **Proportional baseline:** estimates rack cooling demand to move toward a 25.5 °C target, then maps rack-level demand to cooling-unit outputs using least squares.
2. **Exhaustive grid search:** evaluates a finite grid of cooling setpoints and selects the least-cost feasible point. A 5 kW grid is used to keep the three-variable search tractable.
3. **Nelder-Mead Simplex:** minimizes a penalty-augmented objective. If it cannot produce a feasible point, a constrained SLSQP fallback is used; if that also fails, a coarse grid fallback is attempted. Runtime includes fallbacks.

## Experimental results
Run `python main.py` to regenerate `outputs/summary.csv` and plots. The included outputs are generated from the synthetic scenarios in this repository.

| Scenario | Baseline energy (kWh) | Simplex energy (kWh) | Simplex savings | Simplex temp violations |
|---|---:|---:|---:|---:|
| Low workload | 41.351 | 38.304 | 7.369% | 0 |
| Normal workload | 74.526 | 71.970 | 3.429% | 0 |
| High workload | 99.672 | 98.016 | 1.662% | 0 |
| Workload spike | 78.842 | 76.487 | 2.987% | 0 |
| Hot ambient | 86.366 | 84.056 | 2.675% | 0 |

These are simulation outputs, not measured real-world savings. They depend on illustrative parameter choices and must not be generalized to production facilities.

## Reproducibility
Install dependencies with `pip install -r requirements.txt`, run `pytest -q`, then `python main.py`. For the optional dashboard, run `pip install -r requirements-dashboard.txt` followed by `streamlit run dashboard.py`.

## Limitations and future work
The thermal capacitance, heat-loss coefficients, cooling distribution matrix, and COP curves require calibration. The model omits spatial airflow, recirculation, humidity, chiller/fan interactions, equipment minimum loads, and workload migration. Future work should validate parameters against measurements, implement multi-step model predictive control, and compare numerical methods under larger rack and cooling-unit counts.

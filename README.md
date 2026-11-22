# Data Center Thermal Optimizer

A Python simulation project for studying energy-efficient cooling allocation across a small multi-rack data center.

## What it does E9Z96F

- Converts rack utilization into electrical power and approximate server heat.
- Simulates rack-zone temperatures using a discrete-time lumped thermal model.
- Models how three cooling units distribute cooling across five racks.
- Minimizes cooling electricity while respecting rack temperature, cooling-capacity, and ramp-rate constraints.
- Compares a proportional baseline controller, a grid-based exhaustive-search controller, and a constrained Nelder-Mead controller.
- Runs five reproducible workload/environment scenarios and produces CSV results and plots.

> This is an academic simulation, not a controller for real data-center equipment. Parameters are illustrative and should be calibrated before making real-world claims.

## Model

For rack `i`:

`P_i(t) = P_idle_i + (P_max_i - P_idle_i) * utilization_i(t)`

The discrete thermal model is:

`T_i(t+1) = T_i(t) + dt/C_i * [P_i(t) - K_i*(T_i(t)-T_ambient) - Q_i(t)]`

Cooling delivered to rack `i`:

`Q_i(t) = sum_j A[i,j] * q_j(t)`

Cooling-unit electrical power:

`P_elec_j(t) = q_j(t) / COP_j(q_j(t))`

with the illustrative COP curve:

`COP_j(q) = COP0_j - slope_j*q`

The optimization chooses cooling-unit thermal output `q_j` (kW thermal) at each time step to minimize electrical power plus a small control-movement penalty. Predicted next-step rack temperatures must remain within the configured limits.

## Units

- Power and cooling capacity: kW
- Energy: kWh
- Temperature: °C
- Thermal capacitance `C`: kWh/°C
- Time step: hours
- Heat-transfer coefficient `K`: kW/°C

## Requirements

- Python 3.10+
- NumPy
- SciPy
- Pandas
- Matplotlib
- Pytest

## Run

```bash
# Create and activate a virtual environment (recommended)
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

# Run all five scenarios and generate CSV + plots
python main.py

# Run tests
pytest -q
```

## Academic dark dashboard

Install dashboard dependencies and launch the research console from the project root:

```bash
pip install -r requirements-dashboard.txt
python -m streamlit run dashboard.py
```

## Immersion Lab Web Frontend & FastAPI

Launch the distinctive immersion cooling lab web frontend and API:

```bash
# Terminal 1: Launch simulation backend (port 8000)
python api/server.py
# (Or with FastAPI + Uvicorn: uvicorn api.server:app --port 8000)

# Terminal 2: Launch Vite React frontend (port 5173)
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`. The frontend connects to the FastAPI engine for real-time simulation runs, with automatic fallback to static CSVs in `frontend/public/data/` if the backend is not running.

Open the **Local URL** printed in the terminal (normally `http://localhost:8501`). The dashboard includes:
- experiment controls for workload scenario, ambient temperature, workload multiplier, simulation horizon, and thermal bounds;
- KPI overview and controller scorecard;
- rack temperature trajectories, thermal load, cooling-unit dispatch, and per-rack state inspection;
- objective function, constraint, and algorithm comparison views;
- model equations, parameter assumptions, and downloadable CSV time-series data.

The dashboard can display the previously generated outputs immediately. Click **Run optimization experiment** in the sidebar to run a fresh experiment with the selected settings. The simulation engine remains the same; the time-series logger records all three cooling-unit outputs for analysis.

Results are written to `outputs/`:
- `summary.csv`
- `timeseries_<scenario>.csv`
- `temperature_<scenario>.png`
- `energy_<scenario>.png`
- `comparison.png`

## Optimization methods

### 1. Exhaustive grid search
Enumerates cooling-unit setpoints on a finite grid. It is transparent and useful as a benchmark, but runtime grows exponentially with the number of cooling units and grid resolution.

### 2. Nelder-Mead (Simplex)
Uses SciPy's derivative-free Nelder-Mead method on a penalized objective. Candidate values are clipped to equipment bounds, and constraint violations receive a penalty. Since Nelder-Mead does not guarantee constrained feasibility, the selected solution is checked and repaired with a feasible fallback if necessary.

### Baseline
A proportional cooling controller computes the cooling needed to move rack temperatures toward a target, then solves a least-squares allocation to the cooling units. The baseline is a simple reference controller, not an optimizer.

## Important modelling limitations

1. Each rack is represented by one lumped thermal zone. Detailed airflow, hot/cold aisle recirculation, and CFD are not represented.
2. The cooling-distribution matrix `A` is assumed. Its coefficients should be measured or calibrated.
3. Workloads are synthetic and repeatable, not production traces.
4. The COP curve is illustrative, not a manufacturer performance map.
5. The optimizer is a one-step receding-horizon controller. It optimizes the next interval and repeats at the next interval; it is not a full-horizon model predictive controller.
6. The model assumes server electrical power becomes heat within the modeled data-center zone.
7. This project does not issue commands to physical cooling equipment.

## Suggested extensions

- Calibrate `A`, `C`, `K`, and COP curves using measured data.
- Add a multi-step model predictive control formulation.
- Add workload migration as a decision variable.
- Add chiller/fan power curves and cooling-unit minimum operating levels.
- Compare Nelder-Mead with SLSQP and a convex approximation.

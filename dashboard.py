"""Academic dark dashboard for the Data Center Thermal Optimizer.

Run from the project root with: streamlit run dashboard.py
This is an offline simulation interface, not a live facility controller.
"""
from __future__ import annotations

from dataclasses import replace
from pathlib import Path
import time

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import streamlit as st

from config import Config
from evaluation.metrics import summarize, energy_savings_percent
from simulation.scenarios import make_scenarios
from simulation.simulator import run_simulation

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "outputs"
METHODS = ["baseline", "simplex", "exhaustive"]
METHOD_LABELS = {
    "baseline": "Proportional baseline",
    "simplex": "Nelder–Mead Simplex",
    "exhaustive": "Exhaustive grid search",
}
SCENARIO_LABELS = {
    "low_workload": "Low workload",
    "normal_workload": "Normal workload",
    "high_workload": "High workload",
    "workload_spike": "Workload spike",
    "hot_ambient": "Hot ambient",
}

st.set_page_config(
    page_title="Thermal Optimizer | Research Console",
    page_icon="❄️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------- visual system ----------
st.markdown("""
<style>
:root { color-scheme: dark; }
.stApp { background: #080d17; color: #e7edf7; }
[data-testid="stHeader"] { background: rgba(8,13,23,.92); }
[data-testid="stSidebar"] { background: #0d1523; border-right: 1px solid #1c2a40; }
.block-container { padding-top: 1.45rem; padding-bottom: 3rem; max-width: 1500px; }
.hero { background: linear-gradient(115deg,#101e32 0%,#122b3c 55%,#10243a 100%); border:1px solid #25435c; border-radius:16px; padding:22px 26px; margin-bottom:18px; }
.hero-kicker { color:#67d8d0; text-transform:uppercase; letter-spacing:.16em; font-size:.72rem; font-weight:700; }
.hero h1 { color:#f2f7ff; font-size:2rem; margin:.25rem 0 .35rem 0; }
.hero p { color:#aebed1; margin:0; font-size:.95rem; }
.section-head { color:#e8f0fb; font-size:1.12rem; font-weight:700; margin:.35rem 0 .7rem 0; }
.metric-card { background:linear-gradient(145deg,#111e30,#0e1828); border:1px solid #23364e; border-radius:12px; padding:15px 16px; min-height:104px; }
.metric-label { color:#8fa4bc; font-size:.76rem; text-transform:uppercase; letter-spacing:.08em; }
.metric-value { color:#f1f6ff; font-size:1.65rem; font-weight:750; margin-top:5px; line-height:1.2; }
.metric-note { color:#8da4bd; font-size:.74rem; margin-top:5px; }
.info-strip { border-left:3px solid #39bdb5; background:#10202d; padding:10px 14px; border-radius:5px; color:#b9c9d9; font-size:.86rem; }
.small-muted { color:#91a4ba; font-size:.82rem; }
div[data-testid="stTabs"] button { color:#9db1c8; }
div[data-testid="stTabs"] button[aria-selected="true"] { color:#63d4cc; }
.stButton>button { background:#1b9b98; color:white; border:0; border-radius:8px; font-weight:700; }
.stButton>button:hover { background:#25b6ae; color:white; }
[data-testid="stDataFrame"] { border:1px solid #23364e; border-radius:10px; }
hr { border-color:#203149; }
</style>
""", unsafe_allow_html=True)


def metric_card(label: str, value: str, note: str = ""):
    st.markdown(
        f'<div class="metric-card"><div class="metric-label">{label}</div>'
        f'<div class="metric-value">{value}</div><div class="metric-note">{note}</div></div>',
        unsafe_allow_html=True,
    )


def dark_axes(ax):
    ax.set_facecolor("#101a29")
    ax.figure.set_facecolor("#101a29")
    ax.tick_params(colors="#a8b8ca", labelsize=8)
    ax.xaxis.label.set_color("#a8b8ca")
    ax.yaxis.label.set_color("#a8b8ca")
    ax.title.set_color("#edf4ff")
    for spine in ax.spines.values():
        spine.set_color("#304158")
    ax.grid(True, color="#26384d", alpha=.65, linewidth=.65)


def style_figure(fig):
    fig.patch.set_facecolor("#101a29")
    fig.tight_layout(pad=2)
    return fig


def load_saved_results():
    summary_path = OUTPUT / "summary.csv"
    if not summary_path.exists():
        return None, {}
    try:
        summary = pd.read_csv(summary_path)
    except Exception:
        return None, {}
    traces = {}
    for scenario in summary.get("scenario", pd.Series(dtype=str)).dropna().unique():
        for method in METHODS:
            path = OUTPUT / f"timeseries_{scenario}_{method}.csv"
            if path.exists():
                try:
                    traces[(scenario, method)] = pd.read_csv(path)
                except Exception:
                    pass
    return summary, traces


def run_experiment(scenario_key, ambient, workload_scale, duration, temp_min, temp_max):
    base = Config()
    steps = int(round(duration / base.dt_hours))
    cfg = replace(base, duration_hours=duration, min_temp_c=temp_min, max_temp_c=temp_max)
    scenarios = make_scenarios(cfg.steps, cfg.n_racks)
    selected = scenarios[scenario_key]
    utilization = np.clip(selected["utilization"] * workload_scale, 0.0, 1.0)
    frames, rows = {}, []
    started = time.perf_counter()
    for method in METHODS:
        frame, runtime = run_simulation(utilization, ambient, cfg, method=method)
        frames[method] = frame
        rows.append(summarize(frame, runtime, method, scenario_key))
    result = pd.DataFrame(rows)
    baseline_energy = float(result.loc[result.method == "baseline", "cooling_energy_kwh"].iloc[0])
    result["savings_vs_baseline_percent"] = result["cooling_energy_kwh"].apply(
        lambda energy: energy_savings_percent(baseline_energy, float(energy))
    )
    return {"summary": result, "frames": frames, "config": cfg,
            "ambient": ambient, "scenario": scenario_key,
            "elapsed": time.perf_counter() - started}


def fmt(value, digits=2):
    try:
        return f"{float(value):,.{digits}f}"
    except (TypeError, ValueError):
        return "—"


# ---------- sidebar controls ----------
st.sidebar.markdown("## ❄️ Experiment setup")
st.sidebar.caption("Configure a reproducible simulation run")
scenario_key = st.sidebar.selectbox(
    "Workload scenario", list(SCENARIO_LABELS),
    format_func=lambda key: SCENARIO_LABELS[key], index=1,
)
ambient = st.sidebar.slider("Ambient temperature (°C)", 20.0, 40.0, 30.0, 0.5)
workload_scale = st.sidebar.slider("Workload multiplier", 0.25, 1.50, 1.00, 0.05)
duration = st.sidebar.select_slider("Simulation horizon", options=[2.0, 4.0, 6.0, 8.0], value=8.0, format_func=lambda x: f"{x:g} hours")
st.sidebar.markdown("---")
st.sidebar.markdown("**Thermal operating envelope**")
temp_min = st.sidebar.number_input("Minimum rack temperature (°C)", 10.0, 26.0, 18.0, 0.5)
temp_max = st.sidebar.number_input("Maximum rack temperature (°C)", 20.0, 40.0, 27.0, 0.5)
run_clicked = st.sidebar.button("▶ Run optimization experiment", use_container_width=True)
st.sidebar.markdown("---")
st.sidebar.markdown("<div class='small-muted'>Model: 5 rack zones · 3 cooling units · 5-minute timestep<br>Algorithms: baseline, Nelder–Mead, exhaustive grid search</div>", unsafe_allow_html=True)

if temp_min >= temp_max:
    st.sidebar.error("Minimum temperature must be lower than maximum temperature.")
    run_clicked = False

if run_clicked:
    with st.spinner("Simulating thermal dynamics and solving cooling allocation at every time step…"):
        try:
            st.session_state["experiment"] = run_experiment(
                scenario_key, ambient, workload_scale, duration, temp_min, temp_max
            )
            st.session_state["experiment_signature"] = (scenario_key, ambient, workload_scale, duration, temp_min, temp_max)
        except Exception as exc:
            st.error(f"Experiment failed: {exc}")

# Load previously generated results as a useful first view; interactive run takes precedence.
saved_summary, saved_traces = load_saved_results()
experiment = st.session_state.get("experiment")
if experiment:
    summary = experiment["summary"].copy()
    traces = {(experiment["scenario"], method): frame for method, frame in experiment["frames"].items()}
    active_scenario = experiment["scenario"]
    active_config = experiment["config"]
    active_ambient = experiment["ambient"]
    run_status = f"Interactive run completed in {experiment['elapsed']:.2f} seconds"
else:
    summary, traces = saved_summary, saved_traces
    active_scenario = scenario_key
    active_config = Config()
    active_ambient = ambient
    run_status = "Showing previously generated outputs" if summary is not None else "No saved experiment found"

# ---------- header ----------
st.markdown("""
<div class="hero">
  <div class="hero-kicker">Research console / thermal systems optimization</div>
  <h1>Data Center Thermal Optimizer</h1>
  <p>Mathematical modelling and algorithmic cooling allocation for a multi-rack data center.</p>
</div>
""", unsafe_allow_html=True)
st.markdown(f"<div class='info-strip'>● {run_status} &nbsp; | &nbsp; Simulation only — not connected to physical data-center equipment.</div>", unsafe_allow_html=True)
st.write("")

if summary is None:
    st.warning("No generated experiment data was found. Select a scenario in the sidebar and click **Run optimization experiment**.")
    st.stop()

# If using saved outputs, align scenario with available result labels.
available_scenarios = summary["scenario"].dropna().unique().tolist()
if active_scenario not in available_scenarios and not experiment:
    active_scenario = available_scenarios[0]
if not experiment:
    summary = summary[summary.scenario == active_scenario].copy()
    summary["savings_vs_baseline_percent"] = np.nan
    base_row = summary[summary.method == "baseline"]
    if not base_row.empty:
        base_energy = float(base_row.iloc[0]["cooling_energy_kwh"])
        summary["savings_vs_baseline_percent"] = summary["cooling_energy_kwh"].apply(
            lambda x: energy_savings_percent(base_energy, float(x)))

simplex_row = summary[summary.method == "simplex"]
preferred = simplex_row.iloc[0] if not simplex_row.empty else summary.iloc[0]
base_row = summary[summary.method == "baseline"]
base_energy = float(base_row.iloc[0]["cooling_energy_kwh"]) if not base_row.empty else np.nan
simplex_energy = float(preferred["cooling_energy_kwh"])
savings = energy_savings_percent(base_energy, simplex_energy) if np.isfinite(base_energy) else np.nan
simplex_trace = traces.get((active_scenario, "simplex"))
if simplex_trace is None:
    simplex_trace = traces.get((active_scenario, "baseline"))

# ---------- KPI strip ----------
k1, k2, k3, k4, k5 = st.columns(5)
if simplex_trace is not None:
    max_temp = float(simplex_trace["max_temp_c"].max())
    min_temp = float(simplex_trace["min_temp_c"].min())
    violations = int((simplex_trace["temperature_violation_count"] > 0).sum())
    avg_power = float(simplex_trace["cooling_electric_kw"].mean())
else:
    max_temp = float(preferred.get("maximum_rack_temperature_c", np.nan))
    min_temp = float(preferred.get("minimum_rack_temperature_c", np.nan))
    violations = int(preferred.get("temperature_violation_steps", 0))
    avg_power = float(preferred.get("average_cooling_power_kw", np.nan))
with k1: metric_card("Cooling energy · Simplex", f"{simplex_energy:.2f} kWh", "Integrated over simulation horizon")
with k2: metric_card("Energy change vs baseline", f"{savings:+.2f}%" if np.isfinite(savings) else "N/A", "Positive = lower energy use")
with k3: metric_card("Peak rack temperature", f"{max_temp:.2f} °C", "Across all racks and time steps")
with k4: metric_card("Temperature violation steps", f"{violations}", "Simplex trace; zero is the target")
with k5: metric_card("Mean cooling electric load", f"{avg_power:.2f} kW", "Average instantaneous cooling power")

st.write("")
tabs = st.tabs(["Overview", "Thermal dynamics", "Optimization lab", "Model & equations", "Data explorer"])

# ---------- overview ----------
with tabs[0]:
    left, right = st.columns([1.55, 1])
    with left:
        st.markdown("<div class='section-head'>Cooling energy by control strategy</div>", unsafe_allow_html=True)
        fig, ax = plt.subplots(figsize=(8, 3.6))
        order = [m for m in METHODS if m in summary.method.values]
        vals = [float(summary.loc[summary.method == m, "cooling_energy_kwh"].iloc[0]) for m in order]
        bars = ax.bar([METHOD_LABELS[m] for m in order], vals, color=["#607d9d", "#34c6bd", "#e2a85b"][:len(order)], width=.58)
        ax.set_ylabel("Cooling energy (kWh)")
        ax.set_title("Scenario energy comparison")
        ax.tick_params(axis="x", rotation=12)
        for bar, value in zip(bars, vals):
            ax.text(bar.get_x()+bar.get_width()/2, bar.get_height(), f"{value:.1f}", ha="center", va="bottom", color="#edf4ff", fontsize=9)
        dark_axes(ax); st.pyplot(style_figure(fig), use_container_width=True); plt.close(fig)
    with right:
        st.markdown("<div class='section-head'>Rack thermal envelope</div>", unsafe_allow_html=True)
        if simplex_trace is not None:
            fig, ax = plt.subplots(figsize=(5, 3.6))
            rack_cols = [c for c in simplex_trace.columns if c.startswith("rack_") and c.endswith("_temp_c")]
            for col in rack_cols:
                ax.plot(simplex_trace["time_hours"], simplex_trace[col], linewidth=1.7, label=col.replace("_temp_c", "").replace("_", " ").title())
            ax.axhline(active_config.max_temp_c, color="#ed7373", linestyle="--", linewidth=1.2, label="Upper limit")
            ax.axhline(active_config.min_temp_c, color="#edb75d", linestyle=":", linewidth=1.2, label="Lower limit")
            ax.set_xlabel("Time (hours)"); ax.set_ylabel("Temperature (°C)"); ax.set_title("Rack temperature trajectories")
            ax.legend(fontsize=7, ncol=2, facecolor="#152235", labelcolor="#dbe7f5")
            dark_axes(ax); st.pyplot(style_figure(fig), use_container_width=True); plt.close(fig)
        else:
            st.info("Run an experiment to inspect rack-level thermal trajectories.")
    st.markdown("<div class='section-head'>Algorithm scorecard</div>", unsafe_allow_html=True)
    display = summary.copy()
    display["method"] = display["method"].map(METHOD_LABELS)
    columns = [c for c in ["method", "cooling_energy_kwh", "savings_vs_baseline_percent", "average_cooling_power_kw", "maximum_rack_temperature_c", "minimum_rack_temperature_c", "temperature_violation_steps", "optimizer_runtime_seconds"] if c in display.columns]
    st.dataframe(display[columns].rename(columns={
        "method":"Controller", "cooling_energy_kwh":"Energy (kWh)", "savings_vs_baseline_percent":"Energy change (%)",
        "average_cooling_power_kw":"Mean power (kW)", "maximum_rack_temperature_c":"Peak temp (°C)",
        "minimum_rack_temperature_c":"Minimum temp (°C)", "temperature_violation_steps":"Violation steps", "optimizer_runtime_seconds":"Solver time (s)"
    }).round(3), use_container_width=True, hide_index=True)
    st.caption("Energy change is measured against the proportional baseline. Negative values mean the method consumed more energy.")

# ---------- thermal dynamics ----------
with tabs[1]:
    method_choice = st.selectbox("Controller trace", METHODS, format_func=lambda m: METHOD_LABELS[m], key="thermal_method")
    trace = traces.get((active_scenario, method_choice))
    if trace is None:
        st.warning("Trace not found for this controller. Run an experiment from the sidebar.")
    else:
        a, b = st.columns(2)
        with a:
            fig, ax = plt.subplots(figsize=(7, 4))
            for col in [c for c in trace.columns if c.startswith("rack_") and c.endswith("_temp_c")]:
                ax.plot(trace.time_hours, trace[col], label=col.replace("_temp_c", "").replace("_", " ").title(), linewidth=1.6)
            ax.axhspan(active_config.min_temp_c, active_config.max_temp_c, color="#31b6a7", alpha=.08, label="Allowed band")
            ax.axhline(active_config.max_temp_c, color="#ed7373", linestyle="--", linewidth=1)
            ax.axhline(active_config.min_temp_c, color="#edb75d", linestyle="--", linewidth=1)
            ax.set_title("Discrete-time rack temperature response"); ax.set_xlabel("Time (hours)"); ax.set_ylabel("Temperature (°C)")
            ax.legend(fontsize=7, ncol=2, facecolor="#152235", labelcolor="#dbe7f5")
            dark_axes(ax); st.pyplot(style_figure(fig), use_container_width=True); plt.close(fig)
        with b:
            fig, ax = plt.subplots(figsize=(7, 4))
            ax.plot(trace.time_hours, trace.total_rack_heat_kw, label="Rack heat load", color="#e4a75d", linewidth=2)
            ax.plot(trace.time_hours, trace.cooling_electric_kw, label="Cooling electric power", color="#46c7c0", linewidth=2)
            ax.set_title("Thermal load vs cooling electricity"); ax.set_xlabel("Time (hours)"); ax.set_ylabel("Power (kW)")
            ax.legend(facecolor="#152235", labelcolor="#dbe7f5")
            dark_axes(ax); st.pyplot(style_figure(fig), use_container_width=True); plt.close(fig)
        st.markdown("<div class='section-head'>Cooling-unit dispatch</div>", unsafe_allow_html=True)
        unit_cols = [c for c in trace.columns if c.startswith("cooling_unit_") and c.endswith("_kw_thermal")]
        if unit_cols:
            fig, ax = plt.subplots(figsize=(10, 3.2))
            for col in unit_cols:
                ax.step(trace.time_hours, trace[col], where="post", label=col.replace("_kw_thermal", "").replace("_", " ").title(), linewidth=1.7)
            ax.set_xlabel("Time (hours)"); ax.set_ylabel("Thermal output (kW)"); ax.set_title("Cooling allocation by unit")
            ax.legend(facecolor="#152235", labelcolor="#dbe7f5")
            dark_axes(ax); st.pyplot(style_figure(fig), use_container_width=True); plt.close(fig)
        st.markdown("<div class='section-head'>Rack-level state at selected time</div>", unsafe_allow_html=True)
        idx = st.slider("Time-step index", 0, len(trace)-1, min(len(trace)-1, len(trace)//2), key="rack_step")
        row = trace.iloc[idx]
        rack_data = []
        for i in range(active_config.n_racks):
            rack_data.append({"Rack": f"Rack {i+1}", "Temperature (°C)": row.get(f"rack_{i+1}_temp_c"), "Heat generated (kW)": row.get(f"rack_{i+1}_heat_kw"), "Cooling delivered (kW)": row.get(f"rack_{i+1}_cooling_kw")})
        st.dataframe(pd.DataFrame(rack_data).round(3), use_container_width=True, hide_index=True)

# ---------- optimization lab ----------
with tabs[2]:
    st.markdown("<div class='section-head'>Objective and constraint diagnostics</div>", unsafe_allow_html=True)
    st.latex(r"\min_{q_1,\ldots,q_m}\; \sum_{j=1}^{m}\frac{q_j}{COP_{0,j}-a_jq_j} + \lambda\|q-q_{t-1}\|_2^2")
    st.latex(r"T_i(t+1)=T_i(t)+\frac{\Delta t}{C_i}\left[P_i(t)-K_i(T_i(t)-T_a)-\sum_j A_{ij}q_j(t)\right]")
    c1, c2, c3 = st.columns(3)
    with c1: metric_card("Temperature bounds", f"{active_config.min_temp_c:g}–{active_config.max_temp_c:g} °C", "Hard operating envelope")
    with c2: metric_card("Cooling units", str(active_config.n_cooling_units), "Independent decision variables")
    with c3: metric_card("Control interval", f"{active_config.dt_hours*60:g} min", "Forward Euler integration step")
    st.markdown("<div class='section-head'>Method comparison</div>", unsafe_allow_html=True)
    comparison = summary[[c for c in ["method", "cooling_energy_kwh", "optimizer_runtime_seconds", "temperature_violation_steps", "savings_vs_baseline_percent"] if c in summary.columns]].copy()
    comparison["method"] = comparison.method.map(METHOD_LABELS)
    st.dataframe(comparison.rename(columns={"method":"Algorithm", "cooling_energy_kwh":"Objective energy (kWh)", "optimizer_runtime_seconds":"Runtime (s)", "temperature_violation_steps":"Violation steps", "savings_vs_baseline_percent":"Energy change (%)"}).round(4), use_container_width=True, hide_index=True)
    st.markdown("<div class='section-head'>Interpretation notes</div>", unsafe_allow_html=True)
    st.markdown("""
- **Baseline:** proportional target-temperature controller with least-squares cooling allocation; reference policy, not an optimizer.
- **Nelder–Mead:** derivative-free local search. The implementation applies feasibility checks and may use constrained SLSQP / grid fallback if the simplex candidate is infeasible.
- **Exhaustive search:** finite-grid benchmark. It is globally exhaustive only over its discretized candidate grid, not over the continuous decision space.
- **Runtime:** depends on hardware, numerical convergence, and fallback use. Compare on the same machine and configuration.
""")
    if experiment:
        st.caption("The figures above were generated by a fresh interactive run using the selected sidebar settings.")

# ---------- model / equations ----------
with tabs[3]:
    st.markdown("<div class='section-head'>Mathematical model</div>", unsafe_allow_html=True)
    st.markdown("**1. Rack electrical power and heat generation**")
    st.latex(r"P_i(t)=P_{idle,i}+[P_{max,i}-P_{idle,i}]U_i(t)")
    st.markdown("**2. Lumped thermal dynamics (Forward Euler discretization)**")
    st.latex(r"T_i(t+1)=T_i(t)+\frac{\Delta t}{C_i}[P_i(t)-K_i(T_i(t)-T_a)-Q_i(t)]")
    st.markdown("**3. Cooling distribution and equipment electricity**")
    st.latex(r"Q_i(t)=\sum_{j=1}^{m}A_{ij}q_j(t),\qquad P_{elec,j}(t)=\frac{q_j(t)}{COP_{0,j}-a_jq_j(t)}")
    st.markdown("**4. Feasibility constraints**")
    st.latex(r"T_{min}\leq T_i(t+1)\leq T_{max},\quad 0\leq q_j(t)\leq q_{j,max}")
    st.latex(r"|q_j(t)-q_j(t-1)|\leq r_j")
    st.markdown("<div class='section-head'>Model parameters</div>", unsafe_allow_html=True)
    cfg = active_config
    param_df = pd.DataFrame({"Parameter": ["Number of rack zones", "Number of cooling units", "Ambient temperature", "Simulation horizon", "Time step", "Initial rack temperature", "Minimum temperature", "Maximum temperature"], "Value": [cfg.n_racks, cfg.n_cooling_units, f"{active_ambient:.1f} °C", f"{cfg.duration_hours:.1f} h", f"{cfg.dt_hours*60:.0f} min", f"{cfg.initial_temp_c:.1f} °C", f"{cfg.min_temp_c:.1f} °C", f"{cfg.max_temp_c:.1f} °C"]})
    st.dataframe(param_df, use_container_width=True, hide_index=True)
    st.warning("Academic assumptions: lumped rack-zone temperatures, synthetic utilization profiles, effective cooling-distribution gains, and illustrative linear COP curves. These are not calibrated facility measurements.")

# ---------- data explorer ----------
with tabs[4]:
    st.markdown("<div class='section-head'>Simulation time-series explorer</div>", unsafe_allow_html=True)
    chosen_method = st.selectbox("Data source", METHODS, format_func=lambda m: METHOD_LABELS[m], key="data_method")
    data = traces.get((active_scenario, chosen_method))
    if data is None:
        st.info("No trace available. Run an experiment first.")
    else:
        st.caption(f"{len(data)} records · {len(data.columns)} variables · 5-minute samples")
        search = st.text_input("Filter columns", placeholder="e.g. temp, cooling, heat")
        cols = list(data.columns)
        if search.strip():
            cols = [c for c in cols if search.lower() in c.lower()]
        selected_cols = st.multiselect("Columns to display", cols, default=cols[:min(8, len(cols))])
        st.dataframe(data[selected_cols] if selected_cols else data.head(0), use_container_width=True, height=360)
        st.download_button("⬇ Download selected time series (CSV)", data.to_csv(index=False).encode("utf-8"), file_name=f"{active_scenario}_{chosen_method}_timeseries.csv", mime="text/csv")

st.markdown("---")
st.markdown("<div class='small-muted'>DATA CENTER THERMAL OPTIMIZER · Academic simulation prototype · Python / NumPy / SciPy / Streamlit</div>", unsafe_allow_html=True)

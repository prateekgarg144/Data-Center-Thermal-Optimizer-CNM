"""FastAPI & Standalone HTTP Server for Data Center Thermal Optimizer.

Supports both:
1. Production FastAPI with Uvicorn:
   `uvicorn api.server:app --port 8000`
2. Direct zero-dependency execution:
   `python api/server.py` (or `python3 api/server.py`)
"""
from __future__ import annotations

import csv
import json
import os
import sys
import urllib.parse
from dataclasses import replace
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Ensure project root is importable immediately
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

OUTPUT = ROOT / "outputs"

SCENARIO_LABELS = {
    "low_workload": "Low workload",
    "normal_workload": "Normal workload",
    "high_workload": "High workload",
    "workload_spike": "Workload spike",
    "hot_ambient": "Hot ambient",
}

METHOD_LABELS = {
    "baseline": "Proportional baseline",
    "simplex": "Nelder–Mead Simplex",
    "exhaustive": "Exhaustive grid search",
}

METHODS = ["baseline", "simplex", "exhaustive"]


# ──────────────────────────────────────────────────────────────────────
# Helper functions using standard library (pure Python fallback)
# ──────────────────────────────────────────────────────────────────────

def read_csv_as_dict(path: Path) -> list[dict]:
    """Read a CSV file into a list of dicts with numeric conversion."""
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            parsed = {}
            for k, v in row.items():
                if v is None or v == "":
                    parsed[k] = None
                    continue
                try:
                    if "." in v or "e" in v.lower():
                        parsed[k] = float(v)
                    else:
                        parsed[k] = int(v)
                except ValueError:
                    parsed[k] = v
            rows.append(parsed)
        return rows


def get_default_config_dict() -> dict:
    try:
        from config import Config
        cfg = Config()
        return {
            "n_racks": cfg.n_racks,
            "n_cooling_units": cfg.n_cooling_units,
            "dt_hours": cfg.dt_hours,
            "duration_hours": cfg.duration_hours,
            "ambient_c": cfg.ambient_c,
            "min_temp_c": cfg.min_temp_c,
            "max_temp_c": cfg.max_temp_c,
            "initial_temp_c": cfg.initial_temp_c,
            "cooling_max_kw": list(cfg.cooling_max_kw),
            "ramp_limit_kw_per_step": list(cfg.ramp_limit_kw_per_step),
            "cop0": list(cfg.cop0),
            "cop_slope": list(cfg.cop_slope),
            "thermal_capacitance": list(cfg.thermal_capacitance),
            "heat_loss_coefficient": list(cfg.heat_loss_coefficient),
            "idle_power_kw": list(cfg.idle_power_kw),
            "max_power_kw": list(cfg.max_power_kw),
            "A_matrix": cfg.A.tolist(),
        }
    except Exception:
        return {
            "n_racks": 5,
            "n_cooling_units": 3,
            "dt_hours": 5.0 / 60.0,
            "duration_hours": 8.0,
            "ambient_c": 30.0,
            "min_temp_c": 18.0,
            "max_temp_c": 27.0,
            "initial_temp_c": 22.0,
            "cooling_max_kw": [25.0, 25.0, 25.0],
            "ramp_limit_kw_per_step": [25.0, 25.0, 25.0],
            "cop0": [5.5, 5.4, 5.5],
            "cop_slope": [0.025, 0.024, 0.025],
            "thermal_capacitance": [0.55, 0.60, 0.65, 0.58, 0.55],
            "heat_loss_coefficient": [0.22, 0.24, 0.25, 0.23, 0.22],
            "idle_power_kw": [2.0, 2.0, 3.0, 2.0, 2.0],
            "max_power_kw": [10.0, 12.0, 15.0, 10.0, 12.0],
            "A_matrix": [
                [0.40, 0.00, 0.00],
                [0.45, 0.00, 0.00],
                [0.03, 0.65, 0.03],
                [0.00, 0.00, 0.45],
                [0.00, 0.00, 0.40],
            ],
        }


# ──────────────────────────────────────────────────────────────────────
# Try initializing FastAPI app if dependencies exist
# ──────────────────────────────────────────────────────────────────────

FASTAPI_AVAILABLE = False
app = None

try:
    import numpy as np
    import pandas as pd
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import FileResponse
    from pydantic import BaseModel, Field

    from config import Config
    from evaluation.metrics import summarize, energy_savings_percent
    from simulation.scenarios import make_scenarios
    from simulation.simulator import run_simulation

    app = FastAPI(title="Data Center Thermal Optimizer API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class RunRequest(BaseModel):
        scenario: str = Field("normal_workload", description="One of the 5 scenario keys")
        ambient_temp: float = Field(30.0, ge=15.0, le=50.0)
        workload_multiplier: float = Field(1.0, ge=0.1, le=2.0)
        horizon_hours: float = Field(8.0, ge=1.0, le=24.0)
        temp_min: float = Field(18.0, ge=5.0, le=30.0)
        temp_max: float = Field(27.0, ge=15.0, le=45.0)
        controller: str = Field("all", description="'all', 'baseline', 'simplex', or 'exhaustive'")

    @app.get("/config")
    def api_get_config():
        return get_default_config_dict()

    @app.get("/scenarios")
    def api_list_scenarios():
        return {
            "scenarios": [
                {"key": k, "label": v}
                for k, v in SCENARIO_LABELS.items()
            ]
        }

    @app.get("/summary")
    def api_get_summary():
        path = OUTPUT / "summary.csv"
        if not path.exists():
            raise HTTPException(404, "summary.csv not found – run python main.py first")
        df = pd.read_csv(path)
        return {
            "columns": list(df.columns),
            "rows": df.to_dict(orient="records"),
        }

    @app.get("/timeseries/{scenario}")
    def api_get_timeseries(
        scenario: str,
        method: str = Query("simplex", description="baseline, simplex, or exhaustive"),
    ):
        fname = f"timeseries_{scenario}_{method}.csv"
        path = OUTPUT / fname
        if not path.exists():
            raise HTTPException(404, f"{fname} not found")
        df = pd.read_csv(path)
        return {
            "scenario": scenario,
            "method": method,
            "columns": list(df.columns),
            "rows": df.to_dict(orient="records"),
        }

    @app.post("/run")
    def api_run_experiment(req: RunRequest):
        if req.scenario not in SCENARIO_LABELS:
            raise HTTPException(400, f"Unknown scenario: {req.scenario}")
        if req.temp_min >= req.temp_max:
            raise HTTPException(400, "temp_min must be less than temp_max")

        base = Config()
        cfg = replace(
            base,
            duration_hours=req.horizon_hours,
            min_temp_c=req.temp_min,
            max_temp_c=req.temp_max,
        )
        scenarios = make_scenarios(cfg.steps, cfg.n_racks)
        selected = scenarios[req.scenario]
        utilization = np.clip(
            selected["utilization"] * req.workload_multiplier, 0.0, 1.0
        )

        methods = METHODS if req.controller == "all" else [req.controller]
        results = {}
        summary_rows = []

        for method in methods:
            frame, runtime = run_simulation(utilization, req.ambient_temp, cfg, method=method)
            results[method] = {
                "columns": list(frame.columns),
                "rows": frame.to_dict(orient="records"),
            }
            summary_rows.append(summarize(frame, runtime, method, req.scenario))

        summary_df = pd.DataFrame(summary_rows)
        baseline_row = summary_df[summary_df.method == "baseline"]
        if not baseline_row.empty:
            base_energy = float(baseline_row.iloc[0]["cooling_energy_kwh"])
            summary_df["savings_vs_baseline_percent"] = summary_df["cooling_energy_kwh"].apply(
                lambda e: energy_savings_percent(base_energy, float(e))
            )
        else:
            summary_df["savings_vs_baseline_percent"] = float("nan")

        return {
            "scenario": req.scenario,
            "config": {
                "ambient_temp": req.ambient_temp,
                "workload_multiplier": req.workload_multiplier,
                "horizon_hours": req.horizon_hours,
                "temp_min": req.temp_min,
                "temp_max": req.temp_max,
            },
            "summary": {
                "columns": list(summary_df.columns),
                "rows": summary_df.to_dict(orient="records"),
            },
            "timeseries": results,
        }

    @app.get("/download/{filename}")
    def api_download_file(filename: str):
        safe = Path(filename).name
        path = OUTPUT / safe
        if not path.exists():
            raise HTTPException(404, f"{safe} not found")
        return FileResponse(path, filename=safe)

    FASTAPI_AVAILABLE = True

except ImportError:
    FASTAPI_AVAILABLE = False


# ──────────────────────────────────────────────────────────────────────
# Standalone Zero-Dependency HTTP Handler (Standard Library Fallback)
# ──────────────────────────────────────────────────────────────────────

class StandaloneHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path in ("/config", "/api/config"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(get_default_config_dict()).encode("utf-8"))
            return

        if path in ("/scenarios", "/api/scenarios"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            data = {"scenarios": [{"key": k, "label": v} for k, v in SCENARIO_LABELS.items()]}
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        if path in ("/summary", "/api/summary"):
            summary_path = OUTPUT / "summary.csv"
            rows = read_csv_as_dict(summary_path)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            columns = list(rows[0].keys()) if rows else []
            self.wfile.write(json.dumps({"columns": columns, "rows": rows}).encode("utf-8"))
            return

        if path.startswith("/timeseries/") or path.startswith("/api/timeseries/"):
            parts = path.strip("/").split("/")
            scenario = parts[-1]
            method = query.get("method", ["simplex"])[0]
            fname = f"timeseries_{scenario}_{method}.csv"
            fpath = OUTPUT / fname
            if not fpath.exists():
                self.send_response(404)
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(f"File {fname} not found".encode("utf-8"))
                return
            rows = read_csv_as_dict(fpath)
            columns = list(rows[0].keys()) if rows else []
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                "scenario": scenario,
                "method": method,
                "columns": columns,
                "rows": rows,
            }).encode("utf-8"))
            return

        if path.startswith("/download/") or path.startswith("/api/download/"):
            fname = Path(path).name
            fpath = OUTPUT / fname
            if not fpath.exists():
                self.send_response(404)
                self._send_cors_headers()
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
            self._send_cors_headers()
            self.end_headers()
            with open(fpath, "rb") as f:
                self.wfile.write(f.read())
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(b"Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ("/run", "/api/run"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            req = json.loads(body.decode("utf-8")) if body else {}

            scenario = req.get("scenario", "normal_workload")
            ambient_temp = float(req.get("ambient_temp", 30.0))
            workload_multiplier = float(req.get("workload_multiplier", 1.0))
            horizon_hours = float(req.get("horizon_hours", 8.0))
            temp_min = float(req.get("temp_min", 18.0))
            temp_max = float(req.get("temp_max", 27.0))

            # Attempt live simulation if numpy/scipy are available
            try:
                import numpy as np
                import pandas as pd
                from config import Config
                from evaluation.metrics import summarize, energy_savings_percent
                from simulation.scenarios import make_scenarios
                from simulation.simulator import run_simulation

                base = Config()
                cfg = replace(
                    base,
                    duration_hours=horizon_hours,
                    min_temp_c=temp_min,
                    max_temp_c=temp_max,
                )
                scenarios = make_scenarios(cfg.steps, cfg.n_racks)
                selected = scenarios[scenario]
                utilization = np.clip(
                    selected["utilization"] * workload_multiplier, 0.0, 1.0
                )

                results = {}
                summary_rows = []
                for method in METHODS:
                    frame, runtime = run_simulation(utilization, ambient_temp, cfg, method=method)
                    results[method] = {
                        "columns": list(frame.columns),
                        "rows": frame.to_dict(orient="records"),
                    }
                    summary_rows.append(summarize(frame, runtime, method, scenario))

                summary_df = pd.DataFrame(summary_rows)
                baseline_row = summary_df[summary_df.method == "baseline"]
                if not baseline_row.empty:
                    base_energy = float(baseline_row.iloc[0]["cooling_energy_kwh"])
                    summary_df["savings_vs_baseline_percent"] = summary_df["cooling_energy_kwh"].apply(
                        lambda e: energy_savings_percent(base_energy, float(e))
                    )
                else:
                    summary_df["savings_vs_baseline_percent"] = float("nan")

                resp = {
                    "scenario": scenario,
                    "config": req,
                    "summary": {
                        "columns": list(summary_df.columns),
                        "rows": summary_df.to_dict(orient="records"),
                    },
                    "timeseries": results,
                }
            except Exception:
                # Fallback to pre-calculated CSV outputs
                summary_path = OUTPUT / "summary.csv"
                all_summary = read_csv_as_dict(summary_path)
                scenario_summary = [r for r in all_summary if r.get("scenario") == scenario]
                results = {}
                for m in METHODS:
                    fpath = OUTPUT / f"timeseries_{scenario}_{m}.csv"
                    rows = read_csv_as_dict(fpath)
                    cols = list(rows[0].keys()) if rows else []
                    results[m] = {"columns": cols, "rows": rows}
                resp = {
                    "scenario": scenario,
                    "config": req,
                    "summary": {
                        "columns": list(scenario_summary[0].keys()) if scenario_summary else [],
                        "rows": scenario_summary,
                    },
                    "timeseries": results,
                }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()


class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True


def run_standalone(port: int = 8000):
    candidate_ports = [port, 8001, 8080, 8888]
    httpd = None
    actual_port = port

    for p in candidate_ports:
        try:
            server_address = ("0.0.0.0", p)
            httpd = ReusableHTTPServer(server_address, StandaloneHandler)
            actual_port = p
            break
        except OSError as e:
            if e.errno == 48: # Address already in use
                continue
            raise

    if httpd is None:
        server_address = ("0.0.0.0", 0) # Bind to any available port
        httpd = ReusableHTTPServer(server_address, StandaloneHandler)
        actual_port = httpd.server_port

    print(f"\n========================================================")
    print(f" Data Center Thermal Optimizer Server")
    print(f" Running at: http://localhost:{actual_port}")
    print(f" CORS enabled for all origins (http://localhost:5173)")
    print(f" Mode: {'FastAPI' if FASTAPI_AVAILABLE else 'Standalone HTTP (Zero Dependencies)'}")
    print(f" Press Ctrl+C to stop.")
    print(f"========================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    if FASTAPI_AVAILABLE:
        try:
            import uvicorn
            uvicorn.run("api.server:app", host="0.0.0.0", port=port, reload=True)
        except Exception:
            run_standalone(port)
    else:
        run_standalone(port)

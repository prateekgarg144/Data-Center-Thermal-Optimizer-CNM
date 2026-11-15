import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import { MathTex } from '../components/MathTex';
import { Download, ExternalLink, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { downloadUrl } from '../lib/api';

export const TheoryPage: React.FC = () => {
  // COP interactive slider
  const [qVal, setQVal] = useState<number>(12.5); // kW
  const [activeUnit, setActiveUnit] = useState<number>(1);

  // Receding horizon animation step (1 to 5)
  const [activeLoopStep, setActiveLoopStep] = useState<number>(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLoopStep(prev => (prev >= 5 ? 1 : prev + 1));
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // Unit COP parameters from config.py:
  // Unit 1: COP0 = 5.5, slope = 0.025
  // Unit 2: COP0 = 5.4, slope = 0.024
  // Unit 3: COP0 = 5.5, slope = 0.025
  const cop0 = activeUnit === 2 ? 5.4 : 5.5;
  const slope = activeUnit === 2 ? 0.024 : 0.025;

  const currentCOP = Math.max(cop0 - slope * qVal, 0.1);
  const currentElectric = qVal / currentCOP;

  // Clean data array with exact ticks: 0, 5, 10, 15, 20, 25 kW
  const copData = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25].map(q => {
    const c = cop0 - slope * q;
    return {
      q,
      cop: parseFloat(c.toFixed(3)),
      electric_kw: parseFloat((q / c).toFixed(3)),
    };
  });

  const downloadFiles = [
    { name: 'summary.csv', label: 'Overall Summary Metrics (CSV)' },
    { name: 'timeseries_normal_workload_simplex.csv', label: 'Normal Workload (Simplex Trace)' },
    { name: 'timeseries_high_workload_simplex.csv', label: 'High Workload (Simplex Trace)' },
    { name: 'timeseries_workload_spike_simplex.csv', label: 'Workload Spike (Simplex Trace)' },
    { name: 'timeseries_hot_ambient_simplex.csv', label: 'Hot Ambient (Simplex Trace)' },
  ];

  return (
    <div className="max-w-site mx-auto px-6 py-8 space-y-16">
      {/* 1. Header */}
      <div className="border-b border-border pb-6 space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-text">
          Mathematical Model & Theory
        </h1>
        <p className="text-muted text-sm">
          Physical lumped-parameter thermal dynamics, cooling allocation coupling, and equipment efficiency formulation.
        </p>
      </div>

      {/* 2. Four KaTeX Equation Cards */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-accent uppercase tracking-wider block mb-1">
            System Formulation
          </span>
          <h2 className="font-sans font-bold text-xl text-text">
            Governing Equations
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Equation 1: Rack Power */}
          <div className="panel p-6 space-y-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              01. Server Rack Electrical Power
            </span>
            <div className="bg-surface-2 p-3 rounded-lg border border-border overflow-x-auto text-center py-4">
              <MathTex math="P_i(t) = P_{\text{idle},i} + \left(P_{\text{max},i} - P_{\text{idle},i}\right) U_i(t)" />
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Electrical power consumed by servers in rack <MathTex math="i" inline /> scales linearly with computation utilization <MathTex math="U_i(t) \in [0, 1]" inline />. Idle power is 2&ndash;3 kW; maximum is 10&ndash;15 kW.
            </p>
          </div>

          {/* Equation 2: Forward-Euler Thermal Dynamics */}
          <div className="panel p-6 space-y-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              02. Lumped Thermal Dynamics (Euler)
            </span>
            <div className="bg-surface-2 p-3 rounded-lg border border-border overflow-x-auto text-center py-4">
              <MathTex math="T_i(t+1) = T_i(t) + \frac{\Delta t}{C_i} \left[ P_i(t) - K_i \left(T_i(t) - T_a\right) - Q_i(t) \right]" />
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Temperature update with step <MathTex math="\Delta t = 5/60\text{ h}" inline />. Net heat is server generation minus passive ambient dissipation <MathTex math="K_i(T_i - T_a)" inline /> minus delivered cooling <MathTex math="Q_i" inline />.
            </p>
          </div>

          {/* Equation 3: Cooling Matrix A */}
          <div className="panel p-6 space-y-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              03. Cooling Delivery Coupling (Matrix A)
            </span>
            <div className="bg-surface-2 p-3 rounded-lg border border-border overflow-x-auto text-center py-4">
              <MathTex math="Q_i(t) = \sum_{j=1}^{3} A_{ij} q_j(t)" />
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Cooling delivered to rack <MathTex math="i" inline /> is a linear combination of the 3 cooling-unit thermal outputs <MathTex math="q_j(t)" inline />, weighted by matrix <MathTex math="A" inline /> gains.
            </p>
          </div>

          {/* Equation 4: COP Curve & Electrical Power */}
          <div className="panel p-6 space-y-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              04. Equipment Electricity & Load-Dependent COP
            </span>
            <div className="bg-surface-2 p-3 rounded-lg border border-border overflow-x-auto text-center py-4">
              <MathTex math="P_{\text{elec},j}(t) = \frac{q_j(t)}{\text{COP}_{0,j} - \text{slope}_j \cdot q_j(t)}" />
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Cooling electricity draw. As thermal load <MathTex math="q_j" inline /> increases towards 25 kW, COP degrades, causing nonlinear growth in electricity per kW of cooling.
            </p>
          </div>
        </div>
      </section>

      {/* 3. COP Explorer (Fixed clean stacked charts) */}
      <section className="panel p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-sans font-bold text-base text-text">
              Interactive COP & Power Response Explorer
            </h2>
            <p className="text-muted text-xs mt-0.5">
              Inspect how cooling efficiency degrades under increasing thermal output (0 to 25 kW).
            </p>
          </div>

          {/* Unit selector */}
          <div className="flex items-center space-x-1.5">
            {[1, 2, 3].map(u => (
              <button
                key={u}
                onClick={() => setActiveUnit(u)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  activeUnit === u
                    ? 'bg-surface-2 text-accent font-semibold border border-border'
                    : 'text-muted hover:text-text'
                }`}
              >
                Unit 0{u}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Stacked Charts (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Chart 1: COP vs Output */}
            <div>
              <div className="flex justify-between text-xs text-muted mb-1">
                <span className="text-accent font-medium">1. Coefficient of Performance (COP)</span>
                <span className="font-mono text-text">COP = {currentCOP.toFixed(3)}</span>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={copData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis dataKey="q" ticks={[0, 5, 10, 15, 20, 25]} stroke="var(--muted)" fontSize={10} />
                    <YAxis domain={[4.6, 5.6]} stroke="var(--muted)" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono',
                      }}
                      formatter={(val: number) => [val.toFixed(3), 'COP']}
                    />
                    <Line type="monotone" dataKey="cop" stroke="#7FB8FF" strokeWidth={2} dot={false} />
                    <ReferenceDot x={qVal} y={parseFloat(currentCOP.toFixed(3))} r={4} fill="#7FB8FF" stroke="#BBD9FF" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Electric kW vs Output */}
            <div>
              <div className="flex justify-between text-xs text-muted mb-1">
                <span className="text-warm font-medium">2. Cooling Electrical Power Draw (kW)</span>
                <span className="font-mono text-text">{currentElectric.toFixed(2)} kW elec</span>
              </div>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={copData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      dataKey="q"
                      ticks={[0, 5, 10, 15, 20, 25]}
                      stroke="var(--muted)"
                      fontSize={10}
                      unit=" kW"
                    />
                    <YAxis domain={[0, 6.0]} stroke="var(--muted)" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono',
                      }}
                      formatter={(val: number) => [`${val.toFixed(2)} kW`, 'Electrical']}
                    />
                    <Line type="monotone" dataKey="electric_kw" stroke="#E6B86A" strokeWidth={2} dot={false} />
                    <ReferenceDot x={qVal} y={parseFloat(currentElectric.toFixed(3))} r={4} fill="#E6B86A" stroke="#FFF" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right: Slider & Readout (4 cols) */}
          <div className="lg:col-span-4 panel p-5 bg-surface-2/60 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Thermal Output (<MathTex math="q_j" inline />)</span>
                <span className="font-mono font-bold text-accent">{qVal.toFixed(1)} kW</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="25.0"
                step="0.5"
                value={qVal}
                onChange={e => setQVal(parseFloat(e.target.value))}
                className="w-full accent-accent cursor-pointer h-1.5 bg-surface rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-muted">
                <span>0 kW</span>
                <span>12.5 kW</span>
                <span>25 kW (Max)</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-border font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted">COP Rating:</span>
                <span className="text-accent font-bold">{currentCOP.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Electrical Power:</span>
                <span className="text-warm font-bold">{currentElectric.toFixed(3)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">COP₀ intercept:</span>
                <span className="text-text">{cop0.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Linear slope:</span>
                <span className="text-text">{slope.toFixed(3)} /kW</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Receding-Horizon Control Loop Diagram */}
      <section className="panel p-6 space-y-6">
        <div>
          <span className="text-xs font-semibold text-accent uppercase tracking-wider block mb-1">
            Execution Cycle
          </span>
          <h2 className="font-sans font-bold text-base text-text">
            Receding-Horizon Loop (Every 5 Minutes)
          </h2>
        </div>

        {/* 5-Step Horizontal Diagram with Animated Highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { step: 1, title: 'Sample State', desc: 'Read rack temperatures T(t) and workloads' },
            { step: 2, title: 'Compute Heat', desc: 'Calculate electrical power and server heat' },
            { step: 3, title: 'Optimize q*(t)', desc: 'Solve for cooling output under safety bounds' },
            { step: 4, title: 'Dispatch', desc: 'Deliver cooling respecting ramp limits' },
            { step: 5, title: 'Advance Time', desc: 'Euler state update: t ← t + 5 min' },
          ].map(s => {
            const isHighlighted = s.step === activeLoopStep;
            return (
              <div
                key={s.step}
                className={`panel p-4 transition-all duration-300 ${
                  isHighlighted
                    ? 'border-accent bg-surface-2 ring-1 ring-accent'
                    : 'opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      isHighlighted ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    0{s.step}
                  </span>
                  {isHighlighted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                  )}
                </div>
                <h3 className="font-sans font-bold text-xs text-text mb-1">{s.title}</h3>
                <p className="text-[11px] text-muted leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Limitations (From README only) & Extensions Roadmap */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Limitations (7 cols) */}
        <div className="lg:col-span-7 panel p-6 space-y-4">
          <h2 className="font-sans font-bold text-base text-text">
            Important Modeling Limitations
          </h2>
          <p className="text-xs text-muted">
            Directly from the project specification and academic documentation:
          </p>

          <ol className="space-y-2.5 text-xs text-muted list-decimal list-inside leading-relaxed">
            <li>Each rack is represented by one lumped thermal zone. Detailed airflow, hot/cold aisle recirculation, and CFD are omitted.</li>
            <li>The cooling-distribution matrix <MathTex math="A" inline /> is assumed. Its coefficients should be calibrated against physical telemetry.</li>
            <li>Workloads are synthetic, reproducible test scenarios rather than live production traces.</li>
            <li>The COP curve is an illustrative linear function, not an empirical manufacturer performance map.</li>
            <li>The optimizer operates as a one-step receding-horizon controller, not a multi-step predictive model.</li>
            <li>Assumes server electrical power becomes heat within the modeled zone without lag.</li>
            <li>This is an academic simulation and does not issue commands to real data-center hardware.</li>
          </ol>
        </div>

        {/* Extensions Roadmap (5 cols) */}
        <div className="lg:col-span-5 panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-bold text-base text-text">
              Future Extensions
            </h2>
            <span className="chip-tag">Illustrative</span>
          </div>

          <div className="space-y-4 text-xs">
            {[
              { title: 'Sensor Calibration', desc: 'Calibrate A, C, K, and COP curves against physical rack measurements.' },
              { title: 'Multi-Step MPC', desc: 'Formulate a multi-step model predictive controller with future workload forecasts.' },
              { title: 'Workload Migration', desc: 'Add virtual machine task scheduling as a joint decision variable with cooling.' },
              { title: 'Chiller & Fan Curves', desc: 'Incorporate psychrometric wet-bulb models and minimum equipment thresholds.' },
            ].map((ext, idx) => (
              <div key={idx} className="border-l-2 border-border pl-3 space-y-1">
                <span className="font-sans font-bold text-text block">{ext.title}</span>
                <p className="text-muted leading-relaxed">{ext.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Footer with CSV Downloads & Info */}
      <footer className="border-t border-border pt-12 pb-6 space-y-8 text-xs text-muted">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <span className="font-bold text-text uppercase tracking-wider block">
              Download Simulation Data
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {downloadFiles.map(f => (
                <a
                  key={f.name}
                  href={downloadUrl(f.name)}
                  download={f.name}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{f.name}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-2 md:text-right">
            <span className="font-bold text-text uppercase tracking-wider block">
              Project Specification
            </span>
            <p className="md:ml-auto max-w-sm">
              Academic research console for study of energy-efficient cooling allocation. Python &middot; FastAPI &middot; React &middot; TypeScript.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-border text-center">
          Data Center Thermal Optimizer &middot; Course Viva Demonstration
        </div>
      </footer>
    </div>
  );
};

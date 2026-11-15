import React, { useState } from 'react';
import { BookOpen, Sliders, ArrowRight, Activity, Cpu } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceDot } from 'recharts';

export const UnderTheHood: React.FC = () => {
  const [activeUnit, setActiveUnit] = useState<number>(1); // Unit 1, 2, or 3
  const [thermalOutputQ, setThermalOutputQ] = useState<number>(15.0); // kW
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  // COP parameter curves:
  // Unit 1: COP0 = 5.5, slope = 0.025
  // Unit 2: COP0 = 5.4, slope = 0.024
  // Unit 3: COP0 = 5.5, slope = 0.025
  const cop0 = activeUnit === 2 ? 5.4 : 5.5;
  const slope = activeUnit === 2 ? 0.024 : 0.025;

  const currentCOP = Math.max(cop0 - slope * thermalOutputQ, 0.1);
  const currentElectricKw = thermalOutputQ / currentCOP;

  // Generate COP curve points from 0 to 25 kW
  const curvePoints = Array.from({ length: 26 }, (_, i) => {
    const q = i * 1.0;
    const c = cop0 - slope * q;
    const p = q / c;
    return {
      q,
      cop: parseFloat(c.toFixed(3)),
      electric_kw: parseFloat(p.toFixed(3)),
    };
  });

  const glossary: Record<string, { name: string; unit: string; desc: string }> = {
    P_i: { name: 'Server Rack Electrical Power', unit: 'kW', desc: 'Converts computation work into server power draw' },
    P_idle: { name: 'Idle Power', unit: 'kW', desc: 'Baseline chassis power consumed even when utilization is zero' },
    P_max: { name: 'Maximum Rated Power', unit: 'kW', desc: 'Peak server power draw under 100% computational load' },
    U_i: { name: 'Server Workload Utilization', unit: '[0, 1]', desc: 'Normalized compute utilization factor' },
    T_i: { name: 'Rack-Zone Temperature', unit: '°C', desc: 'Lumped temperature state of the server intake air zone' },
    T_a: { name: 'Ambient Temperature', unit: '°C', desc: 'External ambient facility boundary temperature' },
    C_i: { name: 'Thermal Capacitance', unit: 'kWh/°C', desc: 'Thermal inertia resisting rapid temperature fluctuation (0.55–0.65 kWh/°C)' },
    K_i: { name: 'Heat Transfer Coefficient', unit: 'kW/°C', desc: 'Passive conduction / dissipation to ambient (0.22–0.25 kW/°C)' },
    Q_i: { name: 'Effective Rack Cooling', unit: 'kW thermal', desc: 'Total net cooling delivered to rack zone i by all units' },
    q_j: { name: 'Unit Cooling Thermal Output', unit: 'kW thermal', desc: 'Primary optimization control variable (0 to 25 kW)' },
    COP: { name: 'Coefficient of Performance', unit: 'dimensionless', desc: 'Thermal output delivered per unit electrical power (heat moved / electricity spent)' },
    A: { name: 'Distribution Gain Matrix', unit: 'dimensionless', desc: 'Effective matrix coupling cooling units to rack thermal zones' },
  };

  return (
    <section id="under-the-hood" className="relative py-24 px-6 md:px-12 max-w-[1500px] mx-auto">
      <div className="mb-12">
        <span className="section-label">Theoretical Architecture</span>
        <h2 className="font-display text-3xl md:text-5xl text-mist font-bold mt-2">
          Under the Hood: Mathematical Model
        </h2>
        <p className="text-slate text-sm md:text-base mt-2 max-w-2xl">
          A physical lumped-parameter simulation model discretized with Forward Euler integration.
          Hover any mathematical symbol to view its calibrated parameter assumptions.
        </p>
      </div>

      {/* Equations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Card 1: Power */}
        <div className="glass-card p-6 border-tide hover:border-aqua/40 transition-colors">
          <div className="text-xs font-mono text-aqua mb-2 uppercase tracking-wider">
            01. Server Rack Power & Heat
          </div>
          <div className="bg-abyss/80 p-4 rounded-xl border border-tide font-mono text-sm text-foam overflow-x-auto my-3">
            P_i(t) = P_{`{idle,i}`} + (P_{`{max,i}`} - P_{`{idle,i}`}) \cdot U_i(t)
          </div>
          <p className="text-xs text-slate leading-relaxed">
            Electrical power consumed by servers is converted into thermal heat. Linear affine model between idle draw (2–3 kW)
            and maximum rated rack capacity (10–15 kW).
          </p>
        </div>

        {/* Card 2: Thermal Dynamics */}
        <div className="glass-card p-6 border-tide hover:border-aqua/40 transition-colors">
          <div className="text-xs font-mono text-aqua mb-2 uppercase tracking-wider">
            02. Forward-Euler Lumped Dynamics
          </div>
          <div className="bg-abyss/80 p-4 rounded-xl border border-tide font-mono text-sm text-foam overflow-x-auto my-3">
            T_i(t+1) = T_i(t) + \frac{`{\\Delta t}`}{`{C_i}`} \left[ P_i(t) - K_i(T_i(t) - T_a) - Q_i(t) \right]
          </div>
          <p className="text-xs text-slate leading-relaxed">
            First-order energy balance with discrete time step &Delta;t = 5 minutes. Rack temperature rises with server heat,
            dissipates passively to ambient air ($T_a$), and drops with active cooling ($Q_i$).
          </p>
        </div>

        {/* Card 3: Coupling Matrix */}
        <div className="glass-card p-6 border-tide hover:border-aqua/40 transition-colors">
          <div className="text-xs font-mono text-aqua mb-2 uppercase tracking-wider">
            03. Cooling Delivery Coupling (Matrix A)
          </div>
          <div className="bg-abyss/80 p-4 rounded-xl border border-tide font-mono text-sm text-foam overflow-x-auto my-3">
            Q_i(t) = \sum_{`{j=1}`}^3 A_{`{ij}`} \cdot q_j(t)
          </div>
          <p className="text-xs text-slate leading-relaxed">
            Cooling delivery is zoned: Unit 1 primarily chills Racks 1–2 ($A_{`{11}`}=0.4, A_{`{21}`}=0.45$), Unit 2 dominates Rack 3 ($A_{`{32}`}=0.65$),
            and Unit 3 feeds Racks 4–5 ($A_{`{43}`}=0.45, A_{`{53}`}=0.4$).
          </p>
        </div>

        {/* Card 4: Load-Dependent COP */}
        <div className="glass-card p-6 border-tide hover:border-aqua/40 transition-colors">
          <div className="text-xs font-mono text-aqua mb-2 uppercase tracking-wider">
            04. Nonlinear Electrical Input Power
          </div>
          <div className="bg-abyss/80 p-4 rounded-xl border border-tide font-mono text-sm text-foam overflow-x-auto my-3">
            P_{`{elec,j}`}(t) = \frac{`{q_j(t)}`}{`{COP_{0,j} - slope_j \\cdot q_j(t)}}`}
          </div>
          <p className="text-xs text-slate leading-relaxed">
            Chiller efficiency degrades as thermal lift and heat exchanger load increase. Pushing a cooling unit to its 25 kW ceiling
            costs quadratically more electrical power per kW thermal.
          </p>
        </div>
      </div>

      {/* Interactive COP Curve Explorer */}
      <div className="glass-card p-6 md:p-8 border border-tide mb-12">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="font-display text-xl text-mist font-bold">
              Interactive COP & Power Response Curve
            </h3>
            <p className="text-xs font-mono text-slate mt-1">
              Drag cooling thermal output $q_j$ to observe COP degradation and electrical power draw live.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {[1, 2, 3].map(u => (
              <button
                key={u}
                onClick={() => setActiveUnit(u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                  activeUnit === u
                    ? 'border-aqua bg-aqua/15 text-aqua font-bold'
                    : 'border-tide bg-deep/50 text-slate hover:text-mist'
                }`}
              >
                Cooling Unit 0{u}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-center">
          {/* Recharts COP & Power Plot */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curvePoints} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#17394A" opacity={0.5} />
                <XAxis
                  dataKey="q"
                  stroke="#8FA9B3"
                  fontSize={11}
                  unit=" kW"
                  label={{ value: 'Thermal Output q (kW)', position: 'insideBottomRight', offset: -5, fill: '#8FA9B3', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#4FE3D0"
                  fontSize={11}
                  domain={[4.5, 6.0]}
                  label={{ value: 'COP', angle: -90, position: 'insideLeft', fill: '#4FE3D0', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#FFC15E"
                  fontSize={11}
                  domain={[0, 6.0]}
                  label={{ value: 'Electric kW', angle: 90, position: 'insideRight', fill: '#FFC15E', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E2230',
                    borderColor: '#17394A',
                    borderRadius: '8px',
                    color: '#E8F3F1',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cop"
                  name="COP (Efficiency)"
                  stroke="#4FE3D0"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="electric_kw"
                  name="Electrical Power (kW)"
                  stroke="#FFC15E"
                  strokeWidth={2}
                  dot={false}
                />
                <ReferenceDot
                  yAxisId="left"
                  x={thermalOutputQ}
                  y={parseFloat(currentCOP.toFixed(3))}
                  r={5}
                  fill="#4FE3D0"
                  stroke="#BDF5EC"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Slider & Readout */}
          <div className="bg-deep/70 p-6 rounded-xl border border-tide space-y-5 font-mono">
            <div>
              <div className="flex justify-between text-xs text-slate mb-2">
                <span>Thermal Output ($q_{activeUnit}$)</span>
                <span className="text-aqua font-bold text-sm tabular-nums">{thermalOutputQ.toFixed(1)} kW</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="25.0"
                step="0.5"
                value={thermalOutputQ}
                onChange={e => setThermalOutputQ(parseFloat(e.target.value))}
                className="w-full accent-aqua cursor-pointer h-2 bg-deep rounded-lg"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-tide text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate">COP at {thermalOutputQ} kW:</span>
                <span className="text-aqua font-bold text-base tabular-nums">{currentCOP.toFixed(3)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate">Electric Draw:</span>
                <span className="text-amber font-bold text-base tabular-nums">{currentElectricKw.toFixed(3)} kW</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate">Equivalent EER:</span>
                <span className="text-foam font-bold tabular-nums">{(currentCOP * 3.412).toFixed(2)} BTU/Wh</span>
              </div>
            </div>

            <div className="text-[11px] text-slate/80 bg-abyss/60 p-2.5 rounded-lg border border-tide/50">
              Notice: As thermal output approaches 25 kW, COP drops by {(slope * thermalOutputQ).toFixed(3)}, compounding electricity draw.
            </div>
          </div>
        </div>
      </div>

      {/* Receding-Horizon Control Loop Sequence */}
      <div className="glass-card p-6 md:p-8 border border-tide">
        <h3 className="font-display text-xl text-mist font-bold mb-6">
          Receding-Horizon Optimization Loop (Every 5 Minutes)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { step: '01', title: 'Sample State', desc: 'Read current temperature T(t) and rack workload demand U(t).' },
            { step: '02', title: 'Predict Heat', desc: 'Compute rack electrical draw P_i(t) and net thermal generation.' },
            { step: '03', title: 'Solve QP / NM', desc: 'Find q*(t) minimizing electricity while keeping predicted T within safe band.' },
            { step: '04', title: 'Dispatch Cooling', desc: 'Deliver thermal output to cooling units; respect 25 kW/step ramp limits.' },
            { step: '05', title: 'Advance Time', desc: 'Euler state update: T(t+1) = T(t) + dt/C [P - K(T-Ta) - Aq].' },
          ].map((item, idx) => (
            <div key={idx} className="bg-deep/50 p-4 rounded-xl border border-tide/60 relative">
              <span className="text-aqua font-mono text-xs font-bold block mb-1">{item.step}</span>
              <h4 className="font-display text-sm font-semibold text-mist mb-2">{item.title}</h4>
              <p className="text-[11px] text-slate font-mono leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

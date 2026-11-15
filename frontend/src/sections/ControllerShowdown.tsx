import React, { useState } from 'react';
import { Trophy, Clock, AlertCircle, Cpu, Zap, Activity } from 'lucide-react';
import { type SummaryRow, METHOD_LABELS, METHOD_COLORS, SCENARIO_LABELS } from '../lib/types';

interface ControllerShowdownProps {
  summaryData: SummaryRow[];
}

export const ControllerShowdown: React.FC<ControllerShowdownProps> = ({ summaryData }) => {
  const [activeScenario, setActiveScenario] = useState<string>('normal_workload');
  const [gridResolution, setGridResolution] = useState<number>(5.0); // kW grid step
  const [unitCount, setUnitCount] = useState<number>(3); // 3 cooling units

  const scenarioRows = summaryData.filter(r => r.scenario === activeScenario);

  const baselineRow = scenarioRows.find(r => r.method === 'baseline');
  const simplexRow = scenarioRows.find(r => r.method === 'simplex');
  const exhaustiveRow = scenarioRows.find(r => r.method === 'exhaustive');

  const baselineEnergy = baselineRow?.cooling_energy_kwh ?? 74.53;
  const simplexEnergy = simplexRow?.cooling_energy_kwh ?? 71.97;
  const exhaustiveEnergy = exhaustiveRow?.cooling_energy_kwh ?? 72.62;

  // Max energy for normalized race bars
  const maxEnergy = Math.max(baselineEnergy, simplexEnergy, exhaustiveEnergy, 1.0);

  // Grid search theoretical combinations: (cooling_max / grid_step + 1)^m
  // With cooling_max = 25 kW
  const pointsPerDim = Math.floor(25.0 / gridResolution) + 1;
  const totalCombinations = Math.pow(pointsPerDim, unitCount);
  const estimatedTimeSec = (totalCombinations * 0.000008 * 96).toFixed(2); // 96 steps

  return (
    <section id="controller-showdown" className="relative py-24 px-6 md:px-12 max-w-[1500px] mx-auto">
      <div className="mb-12">
        <span className="section-label">Algorithmic Head-to-Head</span>
        <h2 className="font-display text-3xl md:text-5xl text-mist font-bold mt-2">
          Controller Showdown
        </h2>
        <p className="text-slate text-sm md:text-base mt-2 max-w-2xl">
          Comparing a fast proportional heuristic, finite grid enumeration, and constrained Nelder–Mead optimization.
          Each algorithm trades off compute complexity against cooling electricity and violation safety.
        </p>

        {/* Scenario filter chips */}
        <div className="flex flex-wrap gap-2 mt-6">
          {Object.entries(SCENARIO_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setActiveScenario(k)}
              className={`chip ${activeScenario === k ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cumulative Energy Race */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Simplex Card */}
        <div className="glass-card p-6 border-aqua/40 relative overflow-hidden bg-gradient-to-b from-aqua/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-aqua/15 text-aqua">
                <Trophy className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-bold text-mist text-lg">Nelder–Mead</h3>
                <span className="text-[11px] font-mono text-aqua">Constrained Simplex</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-aqua/20 text-aqua border border-aqua/30">
              Optimal
            </span>
          </div>

          <div className="space-y-4 my-6">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate mb-1">
                <span>Electricity Consumed</span>
                <span className="text-aqua font-bold">{simplexEnergy.toFixed(2)} kWh</span>
              </div>
              <div className="h-3 w-full bg-deep rounded-full overflow-hidden border border-tide">
                <div
                  className="h-full bg-aqua rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${(simplexEnergy / maxEnergy) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-tide/60">
              <div>
                <span className="text-slate block">Runtime</span>
                <span className="text-mist font-semibold">
                  {simplexRow?.optimizer_runtime_seconds.toFixed(3) ?? '1.728'}s
                </span>
              </div>
              <div>
                <span className="text-slate block">Violations</span>
                <span className="text-aqua font-semibold">
                  {simplexRow?.temperature_violation_steps ?? 0} steps
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate leading-relaxed border-t border-tide/50 pt-4">
            Derivative-free local search over continuous setpoints with penalty functions and constrained SLSQP fallback.
            Achieves the lowest energy while strictly respecting rack thermal bounds.
          </p>
        </div>

        {/* Exhaustive Grid Search Card */}
        <div className="glass-card p-6 border-foam/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-foam/15 text-foam">
                <Cpu className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-bold text-mist text-lg">Exhaustive Grid</h3>
                <span className="text-[11px] font-mono text-foam">5 kW Resolution</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono text-foam bg-foam/10 border border-foam/20">
              Discretized
            </span>
          </div>

          <div className="space-y-4 my-6">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate mb-1">
                <span>Electricity Consumed</span>
                <span className="text-foam font-bold">{exhaustiveEnergy.toFixed(2)} kWh</span>
              </div>
              <div className="h-3 w-full bg-deep rounded-full overflow-hidden border border-tide">
                <div
                  className="h-full bg-foam rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${(exhaustiveEnergy / maxEnergy) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-tide/60">
              <div>
                <span className="text-slate block">Runtime</span>
                <span className="text-mist font-semibold">
                  {exhaustiveRow?.optimizer_runtime_seconds.toFixed(3) ?? '0.634'}s
                </span>
              </div>
              <div>
                <span className="text-slate block">Violations</span>
                <span className="text-foam font-semibold">
                  {exhaustiveRow?.temperature_violation_steps ?? 0} steps
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate leading-relaxed border-t border-tide/50 pt-4">
            Evaluates a discrete lattice of points across 3 cooling units. Guaranteed globally optimal over the coarse grid,
            but discretization granularity restricts continuous efficiency gains.
          </p>
        </div>

        {/* Baseline Card */}
        <div className="glass-card p-6 border-amber/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-amber/15 text-amber">
                <Zap className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-bold text-mist text-lg">Baseline</h3>
                <span className="text-[11px] font-mono text-amber">Proportional + LstSq</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono text-amber bg-amber/10 border border-amber/20">
              Reference
            </span>
          </div>

          <div className="space-y-4 my-6">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate mb-1">
                <span>Electricity Consumed</span>
                <span className="text-amber font-bold">{baselineEnergy.toFixed(2)} kWh</span>
              </div>
              <div className="h-3 w-full bg-deep rounded-full overflow-hidden border border-tide">
                <div
                  className="h-full bg-amber rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${(baselineEnergy / maxEnergy) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-tide/60">
              <div>
                <span className="text-slate block">Runtime</span>
                <span className="text-mist font-semibold">
                  {baselineRow?.optimizer_runtime_seconds.toFixed(4) ?? '0.0032'}s
                </span>
              </div>
              <div>
                <span className="text-slate block">Violations</span>
                <span className={`font-semibold ${baselineRow?.temperature_violation_steps ? 'text-ember' : 'text-slate'}`}>
                  {baselineRow?.temperature_violation_steps ?? 0} steps
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate leading-relaxed border-t border-tide/50 pt-4">
            Proportional controller targeting 25.5°C using least-squares allocation. Extremely fast, but ignores COP curve
            curvature and can incur thermal violations under heavy load spikes.
          </p>
        </div>
      </div>

      {/* Complexity Explosion Visualizer */}
      <div className="glass-card p-6 md:p-8 border border-tide">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center space-x-2 text-amber text-xs font-mono uppercase tracking-wider mb-2">
              <AlertCircle className="w-4 h-4" />
              <span>Curse of Dimensionality</span>
            </div>
            <h3 className="font-display text-2xl text-mist font-bold mb-3">
              Why Grid Search Fails in Real Data Centers
            </h3>
            <p className="text-slate text-sm leading-relaxed mb-6">
              Exhaustive search must evaluate all permutations in &Omicron;((L/&Delta;)<sup>m</sup>) combinatorial space.
              While a 3-unit system with a coarse 5 kW step only checks ~216 candidate points per time step,
              refining resolution or expanding to 6 cooling units explodes compute time into hours.
            </p>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <div className="flex justify-between text-slate mb-1">
                  <span>Grid Step ($\Delta$ kW)</span>
                  <span className="text-aqua font-bold">{gridResolution.toFixed(1)} kW</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={gridResolution}
                  onChange={e => setGridResolution(parseFloat(e.target.value))}
                  className="w-full accent-aqua cursor-pointer h-1.5 bg-deep rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate mb-1">
                  <span>Cooling Units ($m$)</span>
                  <span className="text-foam font-bold">{unitCount} Units</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="6"
                  step="1"
                  value={unitCount}
                  onChange={e => setUnitCount(parseInt(e.target.value))}
                  className="w-full accent-foam cursor-pointer h-1.5 bg-deep rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-deep/80 p-6 rounded-xl border border-tide space-y-4 font-mono">
            <div className="text-xs text-slate uppercase tracking-wider">Combinatorial Blowup Metric</div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl md:text-5xl font-bold text-ember tabular-nums">
                {totalCombinations.toLocaleString()}
              </span>
              <span className="text-xs text-slate">candidate points / step</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-tide text-xs">
              <div>
                <span className="text-slate block">Points per Axis:</span>
                <span className="text-mist font-semibold">{pointsPerDim} setpoints</span>
              </div>
              <div>
                <span className="text-slate block">Estimated 8h Run:</span>
                <span className={`font-semibold ${parseFloat(estimatedTimeSec) > 60 ? 'text-ember' : 'text-aqua'}`}>
                  ~{estimatedTimeSec} seconds
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate/80 bg-abyss/60 p-3 rounded-lg border border-tide/50">
              Nelder–Mead evaluates only ~15–30 points per time step regardless of resolution, converging in fractions of a second.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

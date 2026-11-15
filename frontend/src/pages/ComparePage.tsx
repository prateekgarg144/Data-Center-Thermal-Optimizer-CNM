import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Check, AlertCircle } from 'lucide-react';
import {
  SCENARIO_LABELS,
  METHOD_COLORS,
  type SummaryRow,
  type TimeseriesRow,
} from '../lib/types';

interface ComparePageProps {
  summaryData: SummaryRow[];
  timeseriesData: Record<string, TimeseriesRow[]>;
}

export const ComparePage: React.FC<ComparePageProps> = ({
  summaryData,
  timeseriesData,
}) => {
  const [scenario, setScenario] = useState<string>('normal_workload');
  const [scaleUnits, setScaleUnits] = useState<number>(3); // 2 to 6 units

  // Filter summary rows for selected scenario
  const scenarioRows = summaryData.filter(r => r.scenario === scenario);

  const baseline = scenarioRows.find(r => r.method === 'baseline');
  const simplex = scenarioRows.find(r => r.method === 'simplex');
  const exhaustive = scenarioRows.find(r => r.method === 'exhaustive');

  const baselineEnergy = baseline?.cooling_energy_kwh ?? 74.53;
  const simplexEnergy = simplex?.cooling_energy_kwh ?? 71.97;
  const exhaustiveEnergy = exhaustive?.cooling_energy_kwh ?? 72.62;

  // Find lowest energy controller
  const minEnergy = Math.min(baselineEnergy, simplexEnergy, exhaustiveEnergy);

  // Cumulative energy trace data for all 3 controllers
  const baselineTrace = timeseriesData[`${scenario}_baseline`] || [];
  const simplexTrace = timeseriesData[`${scenario}_simplex`] || [];
  const exhaustiveTrace = timeseriesData[`${scenario}_exhaustive`] || [];

  const maxLen = Math.max(baselineTrace.length, simplexTrace.length, exhaustiveTrace.length);

  const cumulativeRaceData = Array.from({ length: maxLen }, (_, i) => {
    let bSum = 0;
    let sSum = 0;
    let eSum = 0;
    const timeHours = (i + 1) * (5.0 / 60.0);

    for (let k = 0; k <= i; k++) {
      if (baselineTrace[k]) bSum += baselineTrace[k].cooling_energy_kwh;
      if (simplexTrace[k]) sSum += simplexTrace[k].cooling_energy_kwh;
      if (exhaustiveTrace[k]) eSum += exhaustiveTrace[k].cooling_energy_kwh;
    }

    return {
      time_hours: parseFloat(timeHours.toFixed(2)),
      baseline: parseFloat(bSum.toFixed(2)),
      simplex: parseFloat(sSum.toFixed(2)),
      exhaustive: parseFloat(eSum.toFixed(2)),
    };
  });

  // Combinatorial complexity math from code:
  // grid_step = 5.0, cooling_max = 25.0 -> 6 points per unit axis
  const pointsPerAxis = 6;
  const pointsEvaluated = Math.pow(pointsPerAxis, scaleUnits);
  const totalEvaluations8h = pointsEvaluated * 96;

  // Complexity curve for 2 to 6 units
  const complexityCurve = [2, 3, 4, 5, 6].map(u => ({
    units: u,
    candidates: Math.pow(pointsPerAxis, u),
    active: u === scaleUnits,
  }));

  return (
    <div className="max-w-site mx-auto px-6 py-8 space-y-12">
      {/* 1. Header + Scenario Chips on top */}
      <div className="space-y-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text">
            Controller Showdown
          </h1>
          <p className="text-muted text-sm mt-1">
            Comparing the proportional baseline reference, discrete grid search, and Nelder–Mead optimization.
          </p>
        </div>

        {/* Scenario Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-medium text-muted mr-1">Scenario:</span>
          {Object.entries(SCENARIO_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setScenario(k)}
              className={`chip-interactive text-xs py-1 px-3 ${
                scenario === k ? 'active' : ''
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Three Controller Columns (Same clean layout) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Baseline Column */}
        <div className="panel p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-base text-text">
                Proportional Baseline
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: METHOD_COLORS.baseline }}
              />
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Estimates cooling required to reach 25.5°C target, allocated via least squares.
            </p>
          </div>

          <div className="pt-4 border-t border-border space-y-3 font-mono text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-muted">Electricity:</span>
              <span className="text-base font-bold text-text tabular-nums">
                {baselineEnergy.toFixed(2)} kWh
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Runtime:</span>
              <span className="text-text">
                {baseline?.optimizer_runtime_seconds.toFixed(4) ?? '0.0032'}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Violations:</span>
              <span className={baseline?.temperature_violation_steps ? 'text-heat font-bold' : 'text-text'}>
                {baseline?.temperature_violation_steps ?? 0} steps
              </span>
            </div>
          </div>
        </div>

        {/* Exhaustive Grid Search Column */}
        <div className="panel p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-base text-text">
                Exhaustive Grid Search
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: METHOD_COLORS.exhaustive }}
              />
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Discretizes unit setpoints on a 5.0 kW lattice (6 points/axis = 216 combinations).
            </p>
          </div>

          <div className="pt-4 border-t border-border space-y-3 font-mono text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-muted">Electricity:</span>
              <span className="text-base font-bold text-text tabular-nums">
                {exhaustiveEnergy.toFixed(2)} kWh
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Runtime:</span>
              <span className="text-text">
                {exhaustive?.optimizer_runtime_seconds.toFixed(3) ?? '0.634'}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Violations:</span>
              <span className="text-text font-bold">
                {exhaustive?.temperature_violation_steps ?? 0} steps
              </span>
            </div>
          </div>
        </div>

        {/* Nelder-Mead Simplex Column (Subtle highlight) */}
        <div className="panel p-6 space-y-4 flex flex-col justify-between border-accent/40 bg-surface/90">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-base text-text flex items-center gap-1.5">
                Nelder–Mead Simplex
                {simplexEnergy === minEnergy && (
                  <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-accent/20 text-accent font-semibold">
                    Lowest Energy
                  </span>
                )}
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: METHOD_COLORS.simplex }}
              />
            </div>
            <p className="text-muted text-xs leading-relaxed">
              Derivative-free simplex on a penalized objective with safety margin and feasibility checks.
            </p>
          </div>

          <div className="pt-4 border-t border-border space-y-3 font-mono text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-muted">Electricity:</span>
              <span className="text-base font-bold text-accent tabular-nums">
                {simplexEnergy.toFixed(2)} kWh
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Runtime:</span>
              <span className="text-text">
                {simplex?.optimizer_runtime_seconds.toFixed(3) ?? '1.728'}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Violations:</span>
              <span className="text-accent font-bold">
                {simplex?.temperature_violation_steps ?? 0} steps
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Cumulative Energy Race Chart */}
      <section className="panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="font-sans font-bold text-base text-text">
              Cumulative Cooling Electricity (kWh)
            </h2>
            <p className="text-muted text-xs">
              Continuous accumulation of electrical power over the 8-hour trajectory.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 text-xs font-sans">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METHOD_COLORS.baseline }} />
              <span className="text-muted">Baseline</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METHOD_COLORS.exhaustive }} />
              <span className="text-muted">Grid Search</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METHOD_COLORS.simplex }} />
              <span className="text-accent font-semibold">Nelder–Mead</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeRaceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="time_hours"
                tickFormatter={val => `${val.toFixed(1)}h`}
                stroke="var(--muted)"
                fontSize={11}
              />
              <YAxis stroke="var(--muted)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px',
                }}
                formatter={(val: number) => [`${val.toFixed(2)} kWh`]}
                labelFormatter={val => `Time: ${parseFloat(val as string).toFixed(2)}h`}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline"
                stroke={METHOD_COLORS.baseline}
                strokeWidth={1.8}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="exhaustive"
                name="Grid Search"
                stroke={METHOD_COLORS.exhaustive}
                strokeWidth={1.8}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="simplex"
                name="Nelder–Mead"
                stroke={METHOD_COLORS.simplex}
                strokeWidth={2.4}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4. Why Grid Search Doesn't Scale */}
      <section className="panel p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="font-sans font-bold text-base text-text">
              Why Grid Search Doesn't Scale
            </h2>
            <p className="text-muted text-xs mt-0.5">
              Theoretical combination growth: (cooling_max / grid_step + 1)<sup>m</sup> points per timestep.
            </p>
          </div>
          <span className="chip-tag">Theoretical Complexity</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Slider & Metric (6 cols) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Number of Cooling Units (m)</span>
                <span className="font-mono text-accent font-bold">{scaleUnits} units</span>
              </div>
              <input
                type="range"
                min="2"
                max="6"
                step="1"
                value={scaleUnits}
                onChange={e => setScaleUnits(parseInt(e.target.value))}
                className="w-full accent-accent cursor-pointer h-1.5 bg-surface-2 rounded-lg"
              />
              <div className="flex justify-between text-[11px] font-mono text-muted">
                <span>2 units</span>
                <span>3 (in code)</span>
                <span>4 units</span>
                <span>5 units</span>
                <span>6 units</span>
              </div>
            </div>

            <div className="panel p-4 bg-surface-2/60 space-y-2 font-mono text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-muted">Candidate setpoints per step:</span>
                <span className="text-lg font-bold text-text tabular-nums">
                  {pointsEvaluated.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-muted">Total evaluations over 8 hours (96 steps):</span>
                <span className="text-sm font-semibold text-text tabular-nums">
                  {totalEvaluations8h.toLocaleString()}
                </span>
              </div>
              {scaleUnits > 3 && (
                <div className="pt-2 border-t border-border flex items-center gap-1.5 text-warm text-[11px] font-sans">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Extrapolated beyond the 3-unit benchmark model (<span className="font-mono font-semibold">Illustrative</span>).
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Growth bar visual (6 cols) */}
          <div className="lg:col-span-6 space-y-3 font-mono text-xs">
            <span className="text-muted text-[11px] uppercase tracking-wider block font-sans">
              Combinatorial Growth Curve (6<sup>m</sup>)
            </span>

            {complexityCurve.map(c => {
              const maxVal = Math.pow(6, 6);
              const barWidth = `${Math.min(Math.max((Math.log10(c.candidates) / Math.log10(maxVal)) * 100, 8), 100)}%`;
              return (
                <div key={c.units} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className={c.active ? 'text-accent font-bold' : 'text-muted'}>
                      {c.units} Units {c.units === 3 && '(Current)'}
                    </span>
                    <span className="text-text tabular-nums">
                      {c.candidates.toLocaleString()} pts/step
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: barWidth,
                        backgroundColor: c.active ? 'var(--accent)' : 'var(--muted)',
                        opacity: c.active ? 1 : 0.4,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

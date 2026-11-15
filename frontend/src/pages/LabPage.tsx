import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import { MathTex } from '../components/MathTex';
import {
  SCENARIO_LABELS,
  METHOD_LABELS,
  METHOD_COLORS,
  RACK_COLORS,
  type SummaryRow,
  type TimeseriesRow,
  type RunConfig,
} from '../lib/types';
import { runExperiment } from '../lib/api';

interface LabPageProps {
  summaryData: SummaryRow[];
  timeseriesData: Record<string, TimeseriesRow[]>;
  onSimulationRun: (newSummary: SummaryRow[], newTraces: Record<string, TimeseriesRow[]>) => void;
  isLiveApi: boolean;
}

export const LabPage: React.FC<LabPageProps> = ({
  summaryData,
  timeseriesData,
  onSimulationRun,
  isLiveApi,
}) => {
  // Setup state
  const [scenario, setScenario] = useState<string>('normal_workload');
  const [method, setMethod] = useState<'simplex' | 'baseline' | 'exhaustive'>('simplex');
  const [ambientTemp, setAmbientTemp] = useState<number>(30.0);
  const [workloadMultiplier, setWorkloadMultiplier] = useState<number>(1.0);
  const [horizonHours, setHorizonHours] = useState<number>(8.0);
  const [minTemp, setMinTemp] = useState<number>(18.0);
  const [maxTemp, setMaxTemp] = useState<number>(27.0);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'temp' | 'units' | 'energy' | 'inspector'>('temp');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  // Scrubber state
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active timeseries
  const activeKey = `${scenario}_${method}`;
  const trace = timeseriesData[activeKey] || timeseriesData[`${scenario}_simplex`] || [];
  const maxSteps = Math.max(trace.length - 1, 0);

  // Active step snapshot
  const activeStep = trace[Math.min(stepIndex, trace.length - 1)] || null;

  // Active summary
  const scenarioSummaries = summaryData.filter(s => s.scenario === scenario);
  const activeSummary =
    scenarioSummaries.find(s => s.method === method) ||
    scenarioSummaries.find(s => s.method === 'simplex');
  const baselineSummary = scenarioSummaries.find(s => s.method === 'baseline');

  const baselineEnergy = baselineSummary?.cooling_energy_kwh ?? 74.53;
  const currentEnergy = activeSummary?.cooling_energy_kwh ?? 71.97;
  const savingsPct =
    activeSummary?.savings_vs_baseline_percent ??
    ((baselineEnergy - currentEnergy) / baselineEnergy) * 100;
  const violations = activeSummary?.temperature_violation_steps ?? 0;
  const meanPower = activeSummary?.average_cooling_power_kw ?? 8.99;
  const solveRuntime = activeSummary?.optimizer_runtime_seconds ?? 1.73;

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setStepIndex(prev => {
          if (prev >= maxSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 150);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, maxSteps]);

  // Run experiment handler
  const handleRun = async () => {
    setIsRunning(true);
    setRunMessage(null);
    try {
      const config: RunConfig = {
        scenario,
        ambient_temp: ambientTemp,
        workload_multiplier: workloadMultiplier,
        horizon_hours: horizonHours,
        temp_min: minTemp,
        temp_max: maxTemp,
        controller: 'all',
      };

      const result = await runExperiment(config);
      if (result && result.summary && result.summary.rows) {
        const newTraces: Record<string, TimeseriesRow[]> = {};
        for (const [m, tObj] of Object.entries(result.timeseries)) {
          newTraces[`${scenario}_${m}`] = tObj.rows;
        }
        onSimulationRun(result.summary.rows, newTraces);
        setStepIndex(0);
        setRunMessage('Experiment complete & charts updated.');
        setTimeout(() => setRunMessage(null), 4000);
      }
    } catch {
      setRunMessage('Using offline saved results (FastAPI backend is offline).');
      setTimeout(() => setRunMessage(null), 4000);
    } finally {
      setIsRunning(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!trace || trace.length === 0) return;
    const headers = Object.keys(trace[0]).join(',');
    const rows = trace.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeseries_${scenario}_${method}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Cumulative energy data array for chart
  const cumulativeData = trace.map((row, i) => {
    let sum = 0;
    for (let k = 0; k <= i; k++) {
      sum += trace[k].cooling_energy_kwh;
    }
    return {
      time_hours: row.time_hours,
      cumulative_energy: parseFloat(sum.toFixed(3)),
    };
  });

  return (
    <div className="max-w-site mx-auto px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text">
            Interactive Lab
          </h1>
          <p className="text-muted text-sm mt-0.5">
            Real-time simulation engine evaluating cooling allocation at each 5-minute timestep.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn-secondary text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Trace (CSV)</span>
        </button>
      </div>

      {/* Main Layout: 3 Columns (Left Rail 300px, Main Chart Center, Compact Tanks Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr_240px] gap-6 items-start">
        {/* 1. Left Rail: Sticky Experiment Setup */}
        <aside className="panel p-5 space-y-5 lg:sticky lg:top-20">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-accent" />
              Experiment Setup
            </span>
          </div>

          {/* Scenario Chips */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted block">
              Workload Scenario
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(SCENARIO_LABELS).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setScenario(k)}
                  className={`chip-interactive text-xs py-1 px-2.5 ${
                    scenario === k ? 'active' : ''
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Controller Segmented Control */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted block">
              Control Strategy
            </label>
            <div className="grid grid-cols-3 gap-1 bg-surface-2 p-1 rounded-lg border border-border">
              {(['simplex', 'baseline', 'exhaustive'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-1.5 rounded text-xs font-medium transition-all ${
                    method === m
                      ? 'bg-surface text-text font-semibold border border-border'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {m === 'simplex' ? 'Simplex' : m === 'baseline' ? 'Baseline' : 'Grid'}
                </button>
              ))}
            </div>
          </div>

          {/* Ambient Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted">
                Ambient Temp (<MathTex math="T_a" inline />)
              </span>
              <span className="font-mono font-semibold text-text tabular-nums">
                {ambientTemp.toFixed(1)}°C
              </span>
            </div>
            <input
              type="range"
              min="20.0"
              max="40.0"
              step="0.5"
              value={ambientTemp}
              onChange={e => setAmbientTemp(parseFloat(e.target.value))}
              className="w-full accent-accent cursor-pointer h-1.5 bg-surface-2 rounded-lg"
            />
          </div>

          {/* Workload Multiplier Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted">Workload Multiplier</span>
              <span className="font-mono font-semibold text-text tabular-nums">
                {workloadMultiplier.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.25"
              max="1.50"
              step="0.05"
              value={workloadMultiplier}
              onChange={e => setWorkloadMultiplier(parseFloat(e.target.value))}
              className="w-full accent-accent cursor-pointer h-1.5 bg-surface-2 rounded-lg"
            />
          </div>

          {/* Advanced Collapsible Panel */}
          <div className="border-t border-border pt-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs font-semibold text-muted hover:text-text py-1"
            >
              <span>Advanced Parameters</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-3">
                {/* Horizon */}
                <div className="space-y-1">
                  <label className="text-xs text-muted block">Simulation Horizon</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[2.0, 4.0, 6.0, 8.0].map(h => (
                      <button
                        key={h}
                        onClick={() => setHorizonHours(h)}
                        className={`py-1 rounded text-xs font-mono border text-center ${
                          horizonHours === h
                            ? 'border-accent bg-accent/10 text-accent font-bold'
                            : 'border-border text-muted hover:text-text'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thermal bounds */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted">
                    <span>Lower Bound (<MathTex math="T_{min}" inline />)</span>
                    <span className="font-mono text-warm font-semibold">{minTemp.toFixed(1)}°C</span>
                  </div>
                  <input
                    type="range"
                    min="10.0"
                    max="22.0"
                    step="0.5"
                    value={minTemp}
                    onChange={e => setMinTemp(Math.min(parseFloat(e.target.value), maxTemp - 1))}
                    className="w-full accent-warm cursor-pointer h-1.5 bg-surface-2 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted">
                    <span>Upper Bound (<MathTex math="T_{max}" inline />)</span>
                    <span className="font-mono text-heat font-semibold">{maxTemp.toFixed(1)}°C</span>
                  </div>
                  <input
                    type="range"
                    min="24.0"
                    max="35.0"
                    step="0.5"
                    value={maxTemp}
                    onChange={e => setMaxTemp(Math.max(parseFloat(e.target.value), minTemp + 1))}
                    className="w-full accent-heat cursor-pointer h-1.5 bg-surface-2 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Solid Ice-Blue Run Button */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="w-full btn-primary py-3"
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Experiment</span>
              </>
            )}
          </button>

          {runMessage && (
            <div className="text-[11px] text-accent text-center font-sans bg-surface-2 p-2 rounded border border-border">
              {runMessage}
            </div>
          )}
        </aside>

        {/* 2. Center: ONE Large Tabbed Chart + Scrubber */}
        <main className="panel p-6 space-y-6">
          {/* Chart Header & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center space-x-1.5">
              {[
                { id: 'temp', label: 'Temperatures' },
                { id: 'units', label: 'Cooling Units' },
                { id: 'energy', label: 'Cumulative Energy' },
                { id: 'inspector', label: 'Rack Inspector' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === t.id
                      ? 'bg-surface-2 text-text font-semibold border border-border'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <span className="chip-tag font-mono">
              {METHOD_LABELS[method]} &middot; {SCENARIO_LABELS[scenario]}
            </span>
          </div>

          {/* TAB 1: Temperatures Chart */}
          {activeTab === 'temp' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs text-muted">
                <span>Discrete-time temperature response across 5 rack zones</span>
                <div className="flex items-center space-x-3 text-[11px] font-mono">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-heat inline-block" /> Upper ({maxTemp}°C)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-warm inline-block" /> Lower ({minTemp}°C)
                  </span>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trace} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      dataKey="time_hours"
                      tickFormatter={val => `${val.toFixed(1)}h`}
                      stroke="var(--muted)"
                      fontSize={11}
                    />
                    <YAxis
                      domain={[Math.floor(minTemp - 2), Math.ceil(maxTemp + 2)]}
                      stroke="var(--muted)"
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '11px',
                      }}
                      formatter={(val: number) => [`${val.toFixed(2)} °C`]}
                      labelFormatter={val => `Time: ${parseFloat(val as string).toFixed(2)}h`}
                    />
                    <ReferenceLine y={maxTemp} stroke="var(--heat)" strokeDasharray="4 4" />
                    <ReferenceLine y={minTemp} stroke="var(--warm)" strokeDasharray="4 4" />
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Line
                        key={i}
                        type="monotone"
                        dataKey={`rack_${i + 1}_temp_c`}
                        name={`Rack ${i + 1}`}
                        stroke={RACK_COLORS[i]}
                        strokeWidth={1.8}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 2: Cooling Units Dispatch Chart */}
          {activeTab === 'units' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs text-muted">
                <span>Thermal output delivered by each unit (kW thermal)</span>
                <span className="text-[11px] font-mono">Max: 25.0 kW/unit</span>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trace} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      dataKey="time_hours"
                      tickFormatter={val => `${val.toFixed(1)}h`}
                      stroke="var(--muted)"
                      fontSize={11}
                    />
                    <YAxis stroke="var(--muted)" fontSize={11} domain={[0, 75]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '11px',
                      }}
                    />
                    <Area
                      type="stepAfter"
                      dataKey="cooling_unit_1_kw_thermal"
                      name="Unit 1 (Racks 1-2)"
                      stroke="#7FB8FF"
                      fill="#7FB8FF"
                      fillOpacity={0.25}
                    />
                    <Area
                      type="stepAfter"
                      dataKey="cooling_unit_2_kw_thermal"
                      name="Unit 2 (Rack 3)"
                      stroke="#BBD9FF"
                      fill="#BBD9FF"
                      fillOpacity={0.25}
                    />
                    <Area
                      type="stepAfter"
                      dataKey="cooling_unit_3_kw_thermal"
                      name="Unit 3 (Racks 4-5)"
                      stroke="#E6B86A"
                      fill="#E6B86A"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 3: Cumulative Energy Chart */}
          {activeTab === 'energy' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs text-muted">
                <span>Integrated cooling electricity over simulation horizon</span>
                <span className="font-mono text-accent text-xs font-semibold">
                  Total: {currentEnergy.toFixed(2)} kWh
                </span>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulativeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative_energy"
                      name="Cooling Electricity"
                      stroke="var(--accent)"
                      strokeWidth={2.2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 4: Rack Inspector Table */}
          {activeTab === 'inspector' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs text-muted">
                <span>
                  Snapshot at Step {stepIndex + 1} / {maxSteps + 1} (t ={' '}
                  {activeStep ? activeStep.time_hours.toFixed(2) : '0.00'}h)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border border-border rounded-lg overflow-hidden">
                  <thead className="bg-surface-2 text-muted border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Rack Zone</th>
                      <th className="py-2.5 px-3">Temperature</th>
                      <th className="py-2.5 px-3">Heat Load (<MathTex math="P_i" inline />)</th>
                      <th className="py-2.5 px-3">Cooling (<MathTex math="Q_i" inline />)</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const temp = activeStep
                        ? (activeStep[`rack_${i + 1}_temp_c` as keyof TimeseriesRow] as number)
                        : 22.0;
                      const heat = activeStep
                        ? (activeStep[`rack_${i + 1}_heat_kw` as keyof TimeseriesRow] as number)
                        : 5.0;
                      const cooling = activeStep
                        ? (activeStep[`rack_${i + 1}_cooling_kw` as keyof TimeseriesRow] as number)
                        : 0.0;
                      const isOver = temp > maxTemp;
                      const isUnder = temp < minTemp;

                      return (
                        <tr key={i} className="hover:bg-surface-2/40">
                          <td className="py-2.5 px-3 font-bold text-text">Rack 0{i + 1}</td>
                          <td className="py-2.5 px-3 text-accent font-semibold">{temp.toFixed(2)} °C</td>
                          <td className="py-2.5 px-3 text-warm">{heat.toFixed(2)} kW</td>
                          <td className="py-2.5 px-3 text-muted">{cooling.toFixed(2)} kW</td>
                          <td className="py-2.5 px-3">
                            {isOver ? (
                              <span className="text-heat font-semibold">Violation</span>
                            ) : isUnder ? (
                              <span className="text-warm">Below min</span>
                            ) : (
                              <span className="text-accent">Safe</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Timeline Scrubber Bar under Chart */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted font-mono">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded bg-surface-2 text-accent hover:bg-surface border border-border"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setStepIndex(0);
                  }}
                  className="p-1.5 rounded bg-surface-2 text-muted hover:text-text border border-border"
                  aria-label="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="text-text font-medium">
                  Step {stepIndex + 1} / {maxSteps + 1}
                </span>
              </div>

              <span className="text-text font-semibold tabular-nums">
                t = {activeStep ? activeStep.time_hours.toFixed(2) : '0.00'} hours
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={maxSteps}
              value={stepIndex}
              onChange={e => {
                setIsPlaying(false);
                setStepIndex(parseInt(e.target.value));
              }}
              className="w-full accent-accent cursor-pointer h-1.5 bg-surface-2 rounded-lg"
            />
          </div>
        </main>

        {/* 3. Right Narrow Panel: Compact 5 Tanks + 3 Key KPIs */}
        <aside className="panel p-5 space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text">
              Rack Tanks (t={activeStep ? activeStep.time_hours.toFixed(1) : '0.0'}h)
            </span>
          </div>

          {/* Compact 5 Rack Tanks */}
          <div className="grid grid-cols-5 gap-1.5 h-44 items-end">
            {Array.from({ length: 5 }).map((_, i) => {
              const temp = activeStep
                ? (activeStep[`rack_${i + 1}_temp_c` as keyof TimeseriesRow] as number)
                : 22.0;
              const fillPct = Math.min(Math.max((temp - minTemp) / (maxTemp - minTemp) * 80, 15), 100);
              const isOver = temp > maxTemp;
              const tankColor = isOver ? '#FF6B4A' : temp > 25.5 ? '#E6B86A' : '#7FB8FF';

              return (
                <div key={i} className="flex flex-col items-center space-y-1">
                  <span className="font-mono text-[10px] text-muted">{temp.toFixed(1)}°</span>
                  <div className="w-full h-32 rounded border border-border bg-surface-2 overflow-hidden flex flex-col justify-end p-0.5 relative">
                    <div
                      className="w-full rounded-xs transition-all duration-300 relative"
                      style={{
                        height: `${fillPct}%`,
                        backgroundColor: tankColor,
                        opacity: 0.75,
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/70" />
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-text font-bold">R{i + 1}</span>
                </div>
              );
            })}
          </div>

          {/* 3 Key KPIs only */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div>
              <span className="text-[11px] text-muted block uppercase tracking-wider">Cooling Energy</span>
              <div className="font-mono text-xl font-bold text-text tabular-nums">
                {currentEnergy.toFixed(2)} <span className="text-xs font-normal text-muted">kWh</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-muted block uppercase tracking-wider">vs Baseline</span>
              <div
                className={`font-mono text-xl font-bold tabular-nums ${
                  savingsPct >= 0 ? 'text-accent' : 'text-heat'
                }`}
              >
                {savingsPct >= 0 ? `+${savingsPct.toFixed(2)}%` : `${savingsPct.toFixed(2)}%`}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-muted block uppercase tracking-wider">Violations</span>
              <div
                className={`font-mono text-xl font-bold tabular-nums ${
                  violations > 0 ? 'text-heat' : 'text-accent'
                }`}
              >
                {violations} <span className="text-xs font-normal text-muted">steps</span>
              </div>
            </div>
          </div>

          {/* Details Popover Toggle */}
          <div className="pt-2 border-t border-border relative">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-xs text-muted hover:text-text font-medium py-1"
            >
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Additional Diagnostics
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showDetails && (
              <div className="mt-2 p-3 rounded-lg bg-surface-2 border border-border text-xs space-y-2 font-mono text-muted">
                <div className="flex justify-between">
                  <span>Mean Cooling Power:</span>
                  <span className="text-text font-bold">{meanPower.toFixed(2)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimizer Solver Time:</span>
                  <span className="text-text font-bold">{solveRuntime.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Safety Margin:</span>
                  <span className="text-accent font-bold">0.02°C</span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

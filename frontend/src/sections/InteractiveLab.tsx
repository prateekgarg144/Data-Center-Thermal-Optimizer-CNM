import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Download,
  AlertTriangle,
  Zap,
  Thermometer,
  Layers,
  ChevronRight,
  Sparkles,
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
import { RackTank } from '../components/RackTank';
import { useCountUp } from '../hooks/useAnimations';
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

interface InteractiveLabProps {
  initialSummary: SummaryRow[];
  initialTimeseries: Record<string, TimeseriesRow[]>;
  onSimulationRun?: (newSummary: SummaryRow[], newTimeseries: Record<string, TimeseriesRow[]>) => void;
  onBurstBubbles: () => void;
}

export const InteractiveLab: React.FC<InteractiveLabProps> = ({
  initialSummary,
  initialTimeseries,
  onSimulationRun,
  onBurstBubbles,
}) => {
  // Experiment configuration state
  const [selectedScenario, setSelectedScenario] = useState<string>('normal_workload');
  const [selectedMethod, setSelectedMethod] = useState<'simplex' | 'baseline' | 'exhaustive'>('simplex');
  const [ambientTemp, setAmbientTemp] = useState<number>(30.0);
  const [workloadMultiplier, setWorkloadMultiplier] = useState<number>(1.0);
  const [horizonHours, setHorizonHours] = useState<number>(8.0);
  const [minTemp, setMinTemp] = useState<number>(18.0);
  const [maxTemp, setMaxTemp] = useState<number>(27.0);

  // Runtime / data states
  const [summaryData, setSummaryData] = useState<SummaryRow[]>(initialSummary);
  const [timeseriesData, setTimeseriesData] = useState<Record<string, TimeseriesRow[]>>(initialTimeseries);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'thermal' | 'dispatch' | 'state' | 'diagnostics'>('thermal');

  // Timeline scrubber
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update internal states if props change
  useEffect(() => {
    if (initialSummary.length > 0) setSummaryData(initialSummary);
  }, [initialSummary]);

  useEffect(() => {
    if (Object.keys(initialTimeseries).length > 0) {
      setTimeseriesData(initialTimeseries);
    }
  }, [initialTimeseries]);

  // Current active trace
  const activeTraceKey = `${selectedScenario}_${selectedMethod}`;
  const currentTrace = timeseriesData[activeTraceKey] || timeseriesData[`${selectedScenario}_simplex`] || [];

  const maxSteps = Math.max(currentTrace.length - 1, 0);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= maxSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 150);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, maxSteps]);

  // Current step snapshot
  const activeStepData = currentTrace[Math.min(currentStepIndex, currentTrace.length - 1)] || null;

  // Active scenario summary stats
  const scenarioSummaries = summaryData.filter(s => s.scenario === selectedScenario);
  const activeMethodSummary =
    scenarioSummaries.find(s => s.method === selectedMethod) ||
    scenarioSummaries.find(s => s.method === 'simplex');

  const baselineSummary = scenarioSummaries.find(s => s.method === 'baseline');
  const baselineEnergy = baselineSummary?.cooling_energy_kwh ?? 74.53;
  const currentEnergy = activeMethodSummary?.cooling_energy_kwh ?? 71.97;
  const savingsPct =
    activeMethodSummary?.savings_vs_baseline_percent ??
    ((baselineEnergy - currentEnergy) / baselineEnergy) * 100;

  const peakTemp = activeMethodSummary?.maximum_rack_temperature_c ?? 26.98;
  const violationSteps = activeMethodSummary?.temperature_violation_steps ?? 0;
  const meanPower = activeMethodSummary?.average_cooling_power_kw ?? 8.99;
  const solverRuntime = activeMethodSummary?.optimizer_runtime_seconds ?? 1.73;

  // Animated KPI numbers
  const animEnergy = useCountUp(currentEnergy, 1000);
  const animSavings = useCountUp(savingsPct, 1000);
  const animPeakTemp = useCountUp(peakTemp, 1000);
  const animPower = useCountUp(meanPower, 1000);

  // Run simulation handler
  const handleRunExperiment = async () => {
    setIsRunning(true);
    try {
      const config: RunConfig = {
        scenario: selectedScenario,
        ambient_temp: ambientTemp,
        workload_multiplier: workloadMultiplier,
        horizon_hours: horizonHours,
        temp_min: minTemp,
        temp_max: maxTemp,
        controller: 'all',
      };

      const result = await runExperiment(config);
      if (result && result.summary && result.summary.rows) {
        setSummaryData(result.summary.rows);

        const newTraces: Record<string, TimeseriesRow[]> = {};
        for (const [m, traceObj] of Object.entries(result.timeseries)) {
          newTraces[`${selectedScenario}_${m}`] = traceObj.rows;
        }
        setTimeseriesData(prev => ({ ...prev, ...newTraces }));
        setCurrentStepIndex(0);
        onBurstBubbles();

        if (onSimulationRun) {
          onSimulationRun(result.summary.rows, newTraces);
        }
      }
    } catch (err) {
      console.warn('API run failed, simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // Download active CSV
  const handleDownloadCSV = () => {
    if (!currentTrace || currentTrace.length === 0) return;
    const headers = Object.keys(currentTrace[0]).join(',');
    const rows = currentTrace.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeseries_${selectedScenario}_${selectedMethod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="interactive-lab" className="relative py-20 px-6 md:px-12 max-w-[1500px] mx-auto">
      {/* Section Header */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="section-label">Interactive Research Console</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-aqua animate-ping" />
        </div>
        <h2 className="font-display text-3xl md:text-5xl text-mist font-bold tracking-tight">
          Optimization & Immersion Lab
        </h2>
        <p className="text-slate text-sm md:text-base mt-2 max-w-2xl">
          Real-time simulation engine evaluating cooling-unit allocation at each 5-minute time step.
          Adjust workload scenarios, ambient temperature, and thermal boundaries to observe system dynamics.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="glass-card p-4">
          <div className="text-[11px] font-mono text-slate uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Cooling Energy</span>
            <Zap className="w-3.5 h-3.5 text-aqua" />
          </div>
          <div className="font-mono text-2xl md:text-3xl font-bold text-mist tabular-nums">
            {animEnergy.toFixed(2)} <span className="text-xs text-slate font-normal">kWh</span>
          </div>
          <div className="text-[10px] font-mono text-slate mt-1">Integral across {horizonHours}h</div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[11px] font-mono text-slate uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>vs Baseline</span>
            <Sparkles className="w-3.5 h-3.5 text-aqua" />
          </div>
          <div
            className={`font-mono text-2xl md:text-3xl font-bold tabular-nums ${
              animSavings >= 0 ? 'text-aqua' : 'text-ember'
            }`}
          >
            {animSavings >= 0 ? `+${animSavings.toFixed(2)}%` : `${animSavings.toFixed(2)}%`}
          </div>
          <div className="text-[10px] font-mono text-slate mt-1">
            {animSavings >= 0 ? 'Electricity saved' : 'Higher consumption'}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[11px] font-mono text-slate uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Peak Rack Temp</span>
            <Thermometer className="w-3.5 h-3.5 text-amber" />
          </div>
          <div
            className={`font-mono text-2xl md:text-3xl font-bold tabular-nums ${
              animPeakTemp > maxTemp ? 'text-ember' : 'text-mist'
            }`}
          >
            {animPeakTemp.toFixed(2)} <span className="text-xs text-slate font-normal">°C</span>
          </div>
          <div className="text-[10px] font-mono text-slate mt-1">Bound: {maxTemp.toFixed(1)}°C</div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[11px] font-mono text-slate uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Violations</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${violationSteps > 0 ? 'text-ember' : 'text-aqua'}`} />
          </div>
          <div
            className={`font-mono text-2xl md:text-3xl font-bold tabular-nums ${
              violationSteps > 0 ? 'text-ember' : 'text-aqua'
            }`}
          >
            {violationSteps} <span className="text-xs text-slate font-normal">steps</span>
          </div>
          <div className="text-[10px] font-mono text-slate mt-1">Safety margin: 0.02°C</div>
        </div>

        <div className="glass-card p-4 col-span-2 md:col-span-1">
          <div className="text-[11px] font-mono text-slate uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Mean Power / Solv</span>
            <Layers className="w-3.5 h-3.5 text-foam" />
          </div>
          <div className="font-mono text-2xl md:text-3xl font-bold text-mist tabular-nums">
            {animPower.toFixed(2)} <span className="text-xs text-slate font-normal">kW</span>
          </div>
          <div className="text-[10px] font-mono text-slate mt-1">Solve: {solverRuntime.toFixed(3)}s</div>
        </div>
      </div>

      {/* Main Workspace Layout: Left Rail + Right Console */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 items-start">
        {/* Left Rail: Experiment Setup Controls */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-tide pb-3">
            <span className="font-display font-semibold text-mist text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-aqua" />
              Experiment Controls
            </span>
            <span className="text-[10px] font-mono text-slate">Config & Bounds</span>
          </div>

          {/* Scenario Selection Chips */}
          <div>
            <label className="block text-xs font-mono text-slate uppercase tracking-wider mb-2.5">
              Workload Scenario
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SCENARIO_LABELS).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSelectedScenario(k)}
                  className={`chip ${selectedScenario === k ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Controller Selector */}
          <div>
            <label className="block text-xs font-mono text-slate uppercase tracking-wider mb-2.5">
              Control Strategy
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['simplex', 'baseline', 'exhaustive'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMethod(m)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-mono transition-all border text-center ${
                    selectedMethod === m
                      ? 'border-aqua bg-aqua/10 text-aqua font-semibold'
                      : 'border-tide bg-deep/50 text-slate hover:text-mist'
                  }`}
                >
                  {m === 'simplex' ? 'Nelder–Mead' : m === 'baseline' ? 'Baseline' : 'Grid Search'}
                </button>
              ))}
            </div>
          </div>

          {/* Ambient Temperature Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-slate">Ambient Temp ($T_a$)</span>
              <span className="text-aqua font-semibold tabular-nums">{ambientTemp.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="20.0"
              max="40.0"
              step="0.5"
              value={ambientTemp}
              onChange={e => setAmbientTemp(parseFloat(e.target.value))}
              className="w-full accent-aqua cursor-pointer h-1.5 bg-deep rounded-lg"
            />
          </div>

          {/* Workload Multiplier Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-slate">Workload Multiplier</span>
              <span className="text-aqua font-semibold tabular-nums">{workloadMultiplier.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="1.50"
              step="0.05"
              value={workloadMultiplier}
              onChange={e => setWorkloadMultiplier(parseFloat(e.target.value))}
              className="w-full accent-aqua cursor-pointer h-1.5 bg-deep rounded-lg"
            />
          </div>

          {/* Simulation Horizon Chips */}
          <div>
            <label className="block text-xs font-mono text-slate uppercase tracking-wider mb-2">
              Simulation Horizon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2.0, 4.0, 6.0, 8.0].map(h => (
                <button
                  key={h}
                  onClick={() => setHorizonHours(h)}
                  className={`py-1.5 rounded text-xs font-mono border text-center transition-all ${
                    horizonHours === h
                      ? 'border-aqua bg-aqua/15 text-aqua font-bold'
                      : 'border-tide bg-deep/40 text-slate hover:text-mist'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Thermal Envelope Bounds */}
          <div className="space-y-3 pt-2 border-t border-tide">
            <span className="text-xs font-mono text-mist font-semibold block">Thermal Operating Envelope</span>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate">{'Lower Limit ($T_{min}$)'}</span>
                <span className="text-amber font-semibold tabular-nums">{minTemp.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min="10.0"
                max="24.0"
                step="0.5"
                value={minTemp}
                onChange={e => setMinTemp(Math.min(parseFloat(e.target.value), maxTemp - 1))}
                className="w-full accent-amber cursor-pointer h-1.5 bg-deep rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-slate">{'Upper Limit ($T_{max}$)'}</span>
                <span className="text-ember font-semibold tabular-nums">{maxTemp.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min="22.0"
                max="35.0"
                step="0.5"
                value={maxTemp}
                onChange={e => setMaxTemp(Math.max(parseFloat(e.target.value), minTemp + 1))}
                className="w-full accent-ember cursor-pointer h-1.5 bg-deep rounded-lg"
              />
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunExperiment}
            disabled={isRunning}
            className="w-full btn-primary flex items-center justify-center gap-2 mt-4 py-3.5 disabled:opacity-50"
            aria-label="Run optimization experiment"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-aqua border-t-transparent rounded-full animate-spin" />
                <span>Simulating Dynamics...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-aqua" />
                <span>Run Optimization Experiment</span>
              </>
            )}
          </button>
        </div>

        {/* Right Main Console */}
        <div className="glass-card p-6 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between border-b border-tide pb-3 gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('thermal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeTab === 'thermal'
                    ? 'bg-tide text-aqua font-bold border border-aqua/30'
                    : 'text-slate hover:text-mist'
                }`}
              >
                01. Thermal Response & Tanks
              </button>
              <button
                onClick={() => setActiveTab('dispatch')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeTab === 'dispatch'
                    ? 'bg-tide text-aqua font-bold border border-aqua/30'
                    : 'text-slate hover:text-mist'
                }`}
              >
                02. Unit Dispatch & Power
              </button>
              <button
                onClick={() => setActiveTab('state')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeTab === 'state'
                    ? 'bg-tide text-aqua font-bold border border-aqua/30'
                    : 'text-slate hover:text-mist'
                }`}
              >
                03. State Inspector
              </button>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeTab === 'diagnostics'
                    ? 'bg-tide text-aqua font-bold border border-aqua/30'
                    : 'text-slate hover:text-mist'
                }`}
              >
                04. Math & Diagnostics
              </button>
            </div>

            {/* Export CSV button */}
            <button
              onClick={handleDownloadCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-tide bg-deep/60 text-slate hover:text-aqua text-xs font-mono transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* TAB 1: Thermal Dynamics & Rack Tanks */}
          {activeTab === 'thermal' && (
            <div className="space-y-8">
              {/* Rack Tank Immersion View */}
              <div className="glass-card p-6 bg-deep/40 border border-tide/80">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-display text-lg text-mist font-semibold">
                      Live Immersion Tanks ({METHOD_LABELS[selectedMethod]})
                    </h3>
                    <p className="text-xs font-mono text-slate mt-0.5">
                      Temperature state at step {currentStepIndex + 1} / {maxSteps + 1} (Time:{' '}
                      {activeStepData ? activeStepData.time_hours.toFixed(2) : '0.00'}h)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-aqua" />
                    <span className="text-xs font-mono text-aqua">5 Rack Zones</span>
                  </div>
                </div>

                {/* 5 Vertical Tanks */}
                <div className="grid grid-cols-5 gap-2 sm:gap-6 justify-items-center">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const temp = activeStepData
                      ? (activeStepData[`rack_${i + 1}_temp_c` as keyof TimeseriesRow] as number)
                      : 22.0;
                    const heat = activeStepData
                      ? (activeStepData[`rack_${i + 1}_heat_kw` as keyof TimeseriesRow] as number)
                      : 5.0;
                    const cooling = activeStepData
                      ? (activeStepData[`rack_${i + 1}_cooling_kw` as keyof TimeseriesRow] as number)
                      : 0.0;
                    return (
                      <RackTank
                        key={i}
                        rackIndex={i}
                        temp={temp || 22.0}
                        heatKw={heat || 0}
                        coolingKw={cooling || 0}
                        minTemp={minTemp}
                        maxTemp={maxTemp}
                        ambientTemp={ambientTemp}
                      />
                    );
                  })}
                </div>

                {/* Timeline Scrubber Bar */}
                <div className="mt-8 pt-4 border-t border-tide/60 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-2 rounded-lg bg-tide/80 text-aqua hover:bg-aqua/20 transition-all"
                        aria-label={isPlaying ? 'Pause simulation timeline' : 'Play simulation timeline'}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStepIndex(0);
                        }}
                        className="p-2 rounded-lg bg-tide/50 text-slate hover:text-mist transition-all"
                        aria-label="Reset simulation timeline"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <span className="text-mist font-semibold">
                        Step: {currentStepIndex + 1} / {maxSteps + 1}
                      </span>
                    </div>
                    <span className="text-aqua tabular-nums font-semibold">
                      t = {activeStepData ? activeStepData.time_hours.toFixed(2) : '0.00'} hours
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={maxSteps}
                    value={currentStepIndex}
                    onChange={e => {
                      setIsPlaying(false);
                      setCurrentStepIndex(parseInt(e.target.value));
                    }}
                    className="w-full accent-aqua cursor-pointer h-2 bg-deep rounded-lg"
                  />
                </div>
              </div>

              {/* Temperature Trajectories Chart */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-base text-mist font-semibold">
                    Rack Temperature Trajectories vs Safe Envelope
                  </h3>
                  <div className="flex items-center space-x-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-slate">
                      <span className="w-2.5 h-0.5 bg-ember border-dashed inline-block" /> Upper Limit ({maxTemp}°C)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate">
                      <span className="w-2.5 h-0.5 bg-amber border-dashed inline-block" /> Lower Limit ({minTemp}°C)
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentTrace} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#17394A" opacity={0.5} />
                      <XAxis
                        dataKey="time_hours"
                        tickFormatter={val => `${val.toFixed(1)}h`}
                        stroke="#8FA9B3"
                        fontSize={11}
                      />
                      <YAxis domain={[Math.floor(minTemp - 2), Math.ceil(maxTemp + 2)]} stroke="#8FA9B3" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0E2230',
                          borderColor: '#17394A',
                          borderRadius: '8px',
                          color: '#E8F3F1',
                          fontFamily: 'JetBrains Mono',
                          fontSize: '11px',
                        }}
                        formatter={(val: number) => [`${val.toFixed(2)} °C`]}
                        labelFormatter={val => `Time: ${parseFloat(val as string).toFixed(2)}h`}
                      />
                      <ReferenceLine y={maxTemp} stroke="#FF7A59" strokeDasharray="4 4" />
                      <ReferenceLine y={minTemp} stroke="#FFC15E" strokeDasharray="4 4" />
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
            </div>
          )}

          {/* TAB 2: Unit Dispatch & Electric Power */}
          {activeTab === 'dispatch' && (
            <div className="space-y-8">
              {/* Cooling Units Thermal Dispatch */}
              <div>
                <h3 className="font-display text-base text-mist font-semibold mb-2">
                  Cooling-Unit Thermal Dispatch ($q_j$, kW Thermal)
                </h3>
                <p className="text-xs text-slate font-mono mb-4">
                  Each unit operates under a 25 kW maximum capacity constraint and a 25 kW/step ramp constraint.
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentTrace} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#17394A" opacity={0.5} />
                      <XAxis
                        dataKey="time_hours"
                        tickFormatter={val => `${val.toFixed(1)}h`}
                        stroke="#8FA9B3"
                        fontSize={11}
                      />
                      <YAxis stroke="#8FA9B3" fontSize={11} />
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
                      <Area
                        type="stepAfter"
                        dataKey="cooling_unit_1_kw_thermal"
                        name="Unit 1 (Racks 1-2)"
                        stroke="#4FE3D0"
                        fill="#4FE3D0"
                        fillOpacity={0.2}
                      />
                      <Area
                        type="stepAfter"
                        dataKey="cooling_unit_2_kw_thermal"
                        name="Unit 2 (Rack 3)"
                        stroke="#BDF5EC"
                        fill="#BDF5EC"
                        fillOpacity={0.2}
                      />
                      <Area
                        type="stepAfter"
                        dataKey="cooling_unit_3_kw_thermal"
                        name="Unit 3 (Racks 4-5)"
                        stroke="#FFC15E"
                        fill="#FFC15E"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Total Rack Heat vs Instantaneous Cooling Electricity */}
              <div>
                <h3 className="font-display text-base text-mist font-semibold mb-2">
                  Thermal Heat Load vs Electric Cooling Power (kW)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentTrace} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#17394A" opacity={0.5} />
                      <XAxis
                        dataKey="time_hours"
                        tickFormatter={val => `${val.toFixed(1)}h`}
                        stroke="#8FA9B3"
                        fontSize={11}
                      />
                      <YAxis stroke="#8FA9B3" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0E2230',
                          borderColor: '#17394A',
                          borderRadius: '8px',
                          color: '#E8F3F1',
                          fontFamily: 'JetBrains Mono',
                          fontSize: '11px',
                        }}
                        formatter={(val: number) => [`${val.toFixed(2)} kW`]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_rack_heat_kw"
                        name="Total Server Heat"
                        stroke="#FFC15E"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="cooling_electric_kw"
                        name="Cooling Electricity"
                        stroke="#4FE3D0"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Per-Rack State Inspector */}
          {activeTab === 'state' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base text-mist font-semibold">
                    Rack Thermal Balance at Step {currentStepIndex + 1}
                  </h3>
                  <p className="text-xs text-slate font-mono mt-0.5">
                    Forward Euler parameters: &Delta;t = 5 min, Ambient = {ambientTemp}°C
                  </p>
                </div>
                <span className="text-aqua font-mono text-xs tabular-nums">
                  t = {activeStepData ? activeStepData.time_hours.toFixed(2) : '0.00'}h
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border border-tide rounded-xl overflow-hidden">
                  <thead className="bg-deep/80 text-slate uppercase border-b border-tide">
                    <tr>
                      <th className="py-3 px-4">Zone</th>
                      <th className="py-3 px-4">Previous Temp</th>
                      <th className="py-3 px-4">Current Temp</th>
                      <th className="py-3 px-4">Heat Gen ($P_i$)</th>
                      <th className="py-3 px-4">Cooling Recv ($Q_i$)</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tide/60">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const temp = activeStepData
                        ? (activeStepData[`rack_${i + 1}_temp_c` as keyof TimeseriesRow] as number)
                        : 22.0;
                      const prevTemp = activeStepData
                        ? (activeStepData[`rack_${i + 1}_previous_temp_c` as keyof TimeseriesRow] as number)
                        : 22.0;
                      const heat = activeStepData
                        ? (activeStepData[`rack_${i + 1}_heat_kw` as keyof TimeseriesRow] as number)
                        : 5.0;
                      const cooling = activeStepData
                        ? (activeStepData[`rack_${i + 1}_cooling_kw` as keyof TimeseriesRow] as number)
                        : 0.0;
                      const isOver = temp > maxTemp;
                      const isUnder = temp < minTemp;

                      return (
                        <tr key={i} className="hover:bg-tide/20 transition-colors">
                          <td className="py-3 px-4 text-mist font-bold">Rack 0{i + 1}</td>
                          <td className="py-3 px-4 text-slate">{prevTemp.toFixed(2)} °C</td>
                          <td className="py-3 px-4 text-aqua font-semibold">{temp.toFixed(2)} °C</td>
                          <td className="py-3 px-4 text-amber">{heat.toFixed(2)} kW</td>
                          <td className="py-3 px-4 text-foam">{cooling.toFixed(2)} kW</td>
                          <td className="py-3 px-4">
                            {isOver ? (
                              <span className="px-2 py-0.5 rounded bg-ember/20 text-ember border border-ember/30">
                                Overheating
                              </span>
                            ) : isUnder ? (
                              <span className="px-2 py-0.5 rounded bg-amber/20 text-amber border border-amber/30">
                                Overcooling
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-aqua/20 text-aqua border border-aqua/30">
                                Optimal
                              </span>
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

          {/* TAB 4: Mathematics & Algorithm Comparison */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6 font-mono text-xs text-slate">
              <h3 className="font-display text-base text-mist font-semibold">
                Objective Formulation & Controller Comparison
              </h3>

              <div className="glass-card p-4 bg-deep/60 border border-tide space-y-3">
                <div className="text-aqua font-bold text-sm">Instantaneous Objective Function:</div>
                <div className="text-mist bg-abyss/80 p-3 rounded-lg border border-tide overflow-x-auto text-xs">
                  min_{`{q_1, q_2, q_3}`} \sum_{`{j=1}`}^3 \frac{`{q_j}`}{`{COP_{0,j} - slope_j \cdot q_j}`} + \lambda
                  ||q(t) - q(t-1)||^2
                </div>
                <p>
                  Subject to: T_min &le; T_i(t+1) &le; T_max, 0 &le; q_j(t) &le; 25 kW, |q_j(t) - q_j(t-1)| &le; 25 kW/step.
                </p>
              </div>

              {/* Scorecard Table from dashboard */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border border-tide rounded-xl overflow-hidden">
                  <thead className="bg-deep text-mist uppercase border-b border-tide">
                    <tr>
                      <th className="py-2.5 px-3">Algorithm</th>
                      <th className="py-2.5 px-3">Energy (kWh)</th>
                      <th className="py-2.5 px-3">Savings (%)</th>
                      <th className="py-2.5 px-3">Peak Temp (°C)</th>
                      <th className="py-2.5 px-3">Violations</th>
                      <th className="py-2.5 px-3">Runtime (s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tide/50">
                    {scenarioSummaries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-tide/20">
                        <td className="py-2.5 px-3 text-mist font-bold">{METHOD_LABELS[row.method as keyof typeof METHOD_LABELS] || row.method}</td>
                        <td className="py-2.5 px-3 text-aqua">{row.cooling_energy_kwh.toFixed(3)}</td>
                        <td className="py-2.5 px-3">
                          {row.savings_vs_baseline_percent !== undefined
                            ? `${row.savings_vs_baseline_percent.toFixed(2)}%`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3">{row.maximum_rack_temperature_c.toFixed(2)}</td>
                        <td className="py-2.5 px-3">{row.temperature_violation_steps}</td>
                        <td className="py-2.5 px-3">{row.optimizer_runtime_seconds.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

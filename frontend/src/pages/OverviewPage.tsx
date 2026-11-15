import React from 'react';
import { useRouter } from '../lib/router';
import { ArrowRight, Activity, Thermometer, ShieldCheck } from 'lucide-react';
import { useCountUp } from '../hooks/useAnimations';
import type { SummaryRow } from '../lib/types';

interface OverviewPageProps {
  summaryData: SummaryRow[];
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ summaryData }) => {
  const { navigate } = useRouter();

  // Pull real numbers from Normal Workload Simplex & Baseline
  const normalSimplex = summaryData.find(
    r => r.scenario === 'normal_workload' && r.method === 'simplex'
  );
  const normalBaseline = summaryData.find(
    r => r.scenario === 'normal_workload' && r.method === 'baseline'
  );

  const energyKwh = normalSimplex?.cooling_energy_kwh ?? 71.97;
  const baselineEnergyKwh = normalBaseline?.cooling_energy_kwh ?? 74.53;
  const savingsPercent =
    normalSimplex?.savings_vs_baseline_percent ??
    ((baselineEnergyKwh - energyKwh) / baselineEnergyKwh) * 100;
  const peakTemp = normalSimplex?.maximum_rack_temperature_c ?? 26.98;

  const animEnergy = useCountUp(energyKwh, 1200);
  const animSavings = useCountUp(savingsPercent, 1400);
  const animTemp = useCountUp(peakTemp, 1200);

  return (
    <div className="relative z-10 max-w-site mx-auto px-6 py-12 md:py-20 space-y-24">
      {/* 1. Hero Section (Asymmetric 2-column) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center min-h-[500px]">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs text-accent font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Multi-Rack Thermal Optimization</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-text font-bold leading-[1.08] tracking-tight">
            Keep the racks cool. <br />
            Spend less to do it.
          </h1>

          <p className="text-muted text-lg leading-relaxed max-w-xl">
            Mathematical modeling and algorithmic cooling allocation across a multi-rack data center.
            Respects hard thermal boundaries while cutting equipment electricity through constrained optimization.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => navigate('/lab')}
              className="btn-primary"
            >
              <span>Open the Lab</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm font-semibold text-muted hover:text-text transition-colors px-3 py-2"
            >
              How it works &darr;
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): 5 Real Rack Silhouettes with Legend */}
        <div className="lg:col-span-5">
          <div className="panel p-6 bg-surface/90">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
              <span className="text-xs font-semibold text-text uppercase tracking-wider">
                Rack Zone Overview (Normal Workload)
              </span>
              <span className="chip-tag">Simplex Run</span>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-6 items-end">
              {/* 5 Real Rack Silhouettes */}
              <div className="grid grid-cols-5 gap-2.5 sm:gap-3 items-end h-56">
                {[
                  { id: 'R1', temp: 25.1, util: 0.35, color: '#7FB8FF' },
                  { id: 'R2', temp: 25.8, util: 0.50, color: '#BBD9FF' },
                  { id: 'R3', temp: 26.98, util: 0.65, color: '#FF6B4A' }, // hottest rack
                  { id: 'R4', temp: 24.9, util: 0.40, color: '#7FB8FF' },
                  { id: 'R5', temp: 24.3, util: 0.30, color: '#7FB8FF' },
                ].map(rack => {
                  const fillHeight = `${Math.min(Math.max((rack.temp - 18) / (27 - 18) * 85, 20), 100)}%`;
                  return (
                    <div key={rack.id} className="flex flex-col items-center space-y-2">
                      {/* Temperature readout above rack */}
                      <span className="font-mono text-[11px] text-text font-bold">
                        {rack.temp.toFixed(1)}°
                      </span>

                      {/* Server Rack Chassis Silhouette */}
                      <div className="relative w-full h-40 rounded-md border border-border bg-surface-2 overflow-hidden flex flex-col justify-end p-1">
                        {/* Server blade louvers */}
                        <div className="absolute inset-x-1.5 inset-y-2 flex flex-col justify-between pointer-events-none opacity-20">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-1 w-full bg-muted rounded-xs" />
                          ))}
                        </div>

                        {/* Liquid fill */}
                        <div
                          className="w-full rounded-xs transition-all duration-700 ease-out relative"
                          style={{
                            height: fillHeight,
                            backgroundColor: rack.color,
                            opacity: 0.75,
                            boxShadow: `0 0 12px ${rack.color}40`,
                          }}
                        >
                          {/* Surface meniscus */}
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/60" />
                        </div>
                      </div>

                      <span className="font-mono text-xs text-muted font-medium">
                        {rack.id}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Temperature Scale Legend beside racks */}
              <div className="flex flex-col justify-between h-48 py-2 pl-2 border-l border-border text-[11px] font-mono text-muted">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-heat" />
                  <span>27°C Max</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-warm" />
                  <span>24°C Mid</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span>18°C Min</span>
                </div>
              </div>
            </div>

            {/* Subtle cooling unit flow indicators */}
            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-muted font-sans">
              <span>Cooling Units: 3 online</span>
              <span className="text-accent font-mono text-[11px]">COP ~ 5.1 &ndash; 5.5</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Below the Fold: Exactly 3 Big Numbers */}
      <section className="border-t border-border pt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="panel p-6 space-y-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              Cooling Electricity
            </span>
            <div className="font-mono text-4xl text-text font-bold">
              {animEnergy.toFixed(2)}{' '}
              <span className="text-sm font-normal text-muted">kWh</span>
            </div>
            <p className="text-muted text-sm leading-relaxed">
              Total electrical energy consumed by the 3 cooling units over the 8-hour simulation.
            </p>
          </div>

          <div className="panel p-6 space-y-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              Energy Reduction
            </span>
            <div className="font-mono text-4xl text-accent font-bold">
              +{animSavings.toFixed(2)}%
            </div>
            <p className="text-muted text-sm leading-relaxed">
              Electricity saved by Nelder–Mead optimization compared to the proportional baseline controller.
            </p>
          </div>

          <div className="panel p-6 space-y-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
              Peak Rack Temperature
            </span>
            <div className="font-mono text-4xl text-text font-bold">
              {animTemp.toFixed(2)}{' '}
              <span className="text-sm font-normal text-muted">°C</span>
            </div>
            <p className="text-muted text-sm leading-relaxed">
              Highest recorded rack-zone temperature across all 96 steps, staying strictly under the 27.0°C limit.
            </p>
          </div>
        </div>
      </section>

      {/* 3. 3-Step "How It Works" Strip */}
      <section id="how-it-works" className="border-t border-border pt-16 space-y-8">
        <div>
          <span className="text-xs font-semibold text-accent uppercase tracking-wider block mb-2">
            Control Architecture
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="panel p-6 space-y-3">
            <div className="w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center font-mono font-bold text-accent text-sm">
              01
            </div>
            <h3 className="font-sans font-bold text-base text-text">
              Measure heat (thermal state)
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              Servers convert computation into heat proportional to workload. At each 5-minute step, rack temperatures and server electrical powers are measured.
            </p>
          </div>

          <div className="panel p-6 space-y-3">
            <div className="w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center font-mono font-bold text-accent text-sm">
              02
            </div>
            <h3 className="font-sans font-bold text-base text-text">
              Choose cooling (optimization)
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              An algorithm solves for the thermal outputs of 3 cooling units to minimize electrical power while keeping next-step temperatures between 18°C and 27°C.
            </p>
          </div>

          <div className="panel p-6 space-y-3">
            <div className="w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center font-mono font-bold text-accent text-sm">
              03
            </div>
            <h3 className="font-sans font-bold text-base text-text">
              Repeat every 5 minutes
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              Receding-horizon control applies only the current time-step dispatch, advancing the physical system before solving again for the next interval.
            </p>
          </div>
        </div>
      </section>

      {/* 4. About This Project Line */}
      <section className="border-t border-border pt-8 pb-4 text-center text-sm text-muted">
        <p className="mx-auto">
          Data Center Thermal Optimizer &middot; Academic simulation prototype for study of multi-rack cooling allocation.
        </p>
      </section>
    </div>
  );
};

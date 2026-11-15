import React from 'react';
import { ShieldAlert, Compass, CheckCircle2, Milestone, ArrowUpRight } from 'lucide-react';

export const Limitations: React.FC = () => {
  const roadmapItems = [
    {
      quarter: 'Phase 1',
      title: 'Physical Parameter Calibration',
      status: 'Research Complete',
      desc: 'Calibrate thermal capacitance (C), ambient loss (K), and distribution gains against real data center sensor telemetry.',
    },
    {
      quarter: 'Phase 2',
      title: 'Multi-Step Receding Horizon MPC',
      status: 'Next Iteration',
      desc: 'Expand from 1-step myopic optimization to an 8-step lookahead horizon with predicted workload forecasts.',
    },
    {
      quarter: 'Phase 3',
      title: 'Workload Migration Co-Optimization',
      status: 'Planned',
      desc: 'Jointly optimize VM/container task placement and cooling output, migrating compute away from hot racks.',
    },
    {
      quarter: 'Phase 4',
      title: 'Chiller Plant & Psychrometric Coupling',
      status: 'Proposed',
      desc: 'Incorporate wet-bulb temperatures, economizer free-cooling thresholds, and humidity/latent heat dynamics.',
    },
  ];

  return (
    <section id="limitations" className="relative py-24 px-6 md:px-12 max-w-[1500px] mx-auto">
      <div className="mb-12">
        <span className="section-label">Academic Transparency</span>
        <h2 className="font-display text-3xl md:text-5xl text-mist font-bold mt-2">
          Model Limitations & Roadmap
        </h2>
        <p className="text-slate text-sm md:text-base mt-2 max-w-2xl">
          This project is an academic simulation designed for algorithmic comparison.
          Below is a candid breakdown of what is simplified and where the research goes next.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {/* Simplified Assumptions Card */}
        <div className="glass-card p-6 md:p-8 border border-tide">
          <div className="flex items-center space-x-2 text-amber text-xs font-mono uppercase tracking-wider mb-4">
            <ShieldAlert className="w-4 h-4" />
            <span>Academic Simplifications</span>
          </div>
          <h3 className="font-display text-xl text-mist font-bold mb-4">
            Scope & Boundaries of the Current Model
          </h3>

          <ul className="space-y-4 font-mono text-xs text-slate">
            <li className="flex items-start space-x-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-1.5 shrink-0" />
              <span>
                <strong className="text-mist">Lumped-Parameter Dynamics:</strong> Each rack zone is modeled as a single lumped thermal node, omitting 3D CFD spatial recirculation, aisle containment leakage, and height-dependent stratification.
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-1.5 shrink-0" />
              <span>
                <strong className="text-mist">Coupling Matrix as Model Gains:</strong> Coefficients in matrix A represent effective thermal transfer gains, not literal airflow volumetric fractions.
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-1.5 shrink-0" />
              <span>
                <strong className="text-mist">Illustrative Linear COP:</strong> COP curves follow idealized linear degradation (COP<sub>0</sub> &minus; slope &middot; q) rather than multi-stage compressor lift curves with ambient humidity dependencies.
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-1.5 shrink-0" />
              <span>
                <strong className="text-mist">Static Server Workloads:</strong> Compute workloads are exogenous inputs; the optimizer cannot reallocate virtual machines or shed batch jobs to cooler racks.
              </span>
            </li>
          </ul>
        </div>

        {/* Real-World Context Card */}
        <div className="glass-card p-6 md:p-8 border border-tide bg-deep/40">
          <div className="flex items-center space-x-2 text-aqua text-xs font-mono uppercase tracking-wider mb-4">
            <Compass className="w-4 h-4" />
            <span>Industrial Validation</span>
          </div>
          <h3 className="font-display text-xl text-mist font-bold mb-4">
            How This Translates to Physical Facilities
          </h3>

          <p className="text-xs text-slate font-mono leading-relaxed mb-4">
            In physical data centers, HVAC and immersion chillers account for 30–45% of total facility electricity (PUE 1.3–1.6).
            Even modest 3–7% reductions in cooling electricity yield massive megawatt-hour savings at scale and lower peak grid demand.
          </p>

          <div className="bg-abyss/80 p-4 rounded-xl border border-tide space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-slate">
              <span>Facility Scale:</span>
              <span className="text-mist">5 racks, 3 cooling units</span>
            </div>
            <div className="flex justify-between items-center text-slate">
              <span>Simulation Horizon:</span>
              <span className="text-mist">8.0 hours @ 5-min intervals</span>
            </div>
            <div className="flex justify-between items-center text-slate">
              <span>Simplex Energy Delta:</span>
              <span className="text-aqua font-bold">1.7% to 7.4% reduction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="glass-card p-6 md:p-8 border border-tide">
        <h3 className="font-display text-xl text-mist font-bold mb-8 flex items-center gap-2">
          <Milestone className="w-5 h-5 text-aqua" />
          Research & Extension Roadmap
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {roadmapItems.map((item, idx) => (
            <div key={idx} className="relative pl-6 border-l-2 border-tide/80 space-y-2">
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-deep border-2 border-aqua" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-aqua font-bold uppercase">{item.quarter}</span>
                <span className="text-[10px] font-mono text-slate px-2 py-0.5 rounded bg-tide/50">
                  {item.status}
                </span>
              </div>
              <h4 className="font-display text-sm font-semibold text-mist">{item.title}</h4>
              <p className="text-xs text-slate font-mono leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

import { motion } from 'framer-motion';
import { useCountUp, useInView, useTilt } from '../hooks/useAnimations';
import type { SummaryRow } from '../lib/types';

interface Props {
  summaryData: SummaryRow[];
  onRunClick: () => void;
}

export default function Hero({ summaryData, onRunClick }: Props) {
  const [ref, inView] = useInView();
  const tilt = useTilt(6);

  // Pull real KPIs from summary data
  const simplexNormal = summaryData.find(r => r.scenario === 'normal_workload' && r.method === 'simplex');
  const baselineNormal = summaryData.find(r => r.scenario === 'normal_workload' && r.method === 'baseline');
  const peakTemp = simplexNormal?.maximum_rack_temperature_c ?? 26.98;
  const energySaved = simplexNormal?.savings_vs_baseline_percent ?? 3.43;
  const totalEnergy = simplexNormal?.cooling_energy_kwh ?? 71.97;

  const animPeak = useCountUp(peakTemp, 1500, inView);
  const animSaved = useCountUp(energySaved, 1800, inView);

  const words = 'Keep the racks cool. Spend less to do it.'.split(' ');

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Asymmetric layout */}
      <div className="relative z-10 w-full max-w-[1500px] mx-auto px-6 md:px-12 py-24 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-16 items-center">

        {/* Left: text */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="section-label">Thermal systems optimization</span>
          </motion.div>

          <h1 className="font-display text-hero-sm md:text-hero leading-[1.05] tracking-tight">
            {words.map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.3em]"
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: 0.15 + i * 0.08,
                  duration: 0.6,
                  ease: [0.2, 0.8, 0.2, 1],
                }}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="text-slate text-lg md:text-xl max-w-xl leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            Mathematical modelling and algorithmic cooling allocation
            for a five-rack, three-unit data center. Compare a proportional
            baseline, grid search, and Nelder–Mead optimization across
            real workload scenarios.
          </motion.p>

          {/* Live mini readout */}
          <motion.div
            className="flex flex-wrap gap-6"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.1, duration: 0.6 }}
          >
            <div className="glass-card px-5 py-4">
              <div className="text-xs text-slate font-mono uppercase tracking-wider mb-1">Peak temperature</div>
              <div className="font-mono text-2xl font-bold text-mist tabular-nums">{animPeak.toFixed(2)}°C</div>
            </div>
            <div className="glass-card px-5 py-4">
              <div className="text-xs text-slate font-mono uppercase tracking-wider mb-1">Energy saved vs baseline</div>
              <div className="font-mono text-2xl font-bold text-aqua tabular-nums">{animSaved.toFixed(2)}%</div>
            </div>
            <div className="glass-card px-5 py-4">
              <div className="text-xs text-slate font-mono uppercase tracking-wider mb-1">Cooling energy (Simplex)</div>
              <div className="font-mono text-2xl font-bold text-mist tabular-nums">{totalEnergy.toFixed(1)} kWh</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.3, duration: 0.6 }}
          >
            <button
              onClick={onRunClick}
              className="btn-primary text-base px-8 py-4 mt-4"
              aria-label="Run optimization experiment"
            >
              Run experiment
            </button>
          </motion.div>
        </div>

        {/* Right: rack glow visual */}
        <motion.div
          className="hidden lg:block relative"
          initial={{ opacity: 0, x: 40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div
            ref={tilt.ref}
            style={tilt.style}
            onMouseMove={tilt.onMouseMove}
            onMouseLeave={tilt.onMouseLeave}
            className="relative"
          >
            <RackGlowVisual peakTemp={peakTemp} />
          </div>
        </motion.div>
      </div>

      {/* Decorative gradient orb — NOT a neon blob, a subtle ambient glow */}
      <div
        className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.06]"
        style={{
          background: 'radial-gradient(circle, rgba(79,227,208,1) 0%, transparent 70%)',
        }}
      />
    </section>
  );
}

function RackGlowVisual({ peakTemp }: { peakTemp: number }) {
  const rackHeights = [0.35, 0.50, 0.65, 0.40, 0.30]; // normal utilization
  const tempNorm = (peakTemp - 18) / (27 - 18); // 0..1

  return (
    <div className="relative w-full aspect-[4/3]">
      {/* Background panel */}
      <div className="absolute inset-0 glass-card rounded-2xl p-6">
        <div className="text-xs font-mono text-slate mb-4 tracking-wider">RACK ZONE OVERVIEW</div>

        <div className="flex items-end gap-3 h-[70%] px-4">
          {rackHeights.map((h, i) => {
            const tempColor = h > 0.6
              ? `rgba(255, 122, 89, ${0.3 + h * 0.4})`
              : `rgba(79, 227, 208, ${0.2 + h * 0.3})`;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  className="w-full rounded-t-md relative overflow-hidden"
                  style={{
                    height: `${h * 100}%`,
                    background: `linear-gradient(180deg, ${tempColor}, rgba(14, 34, 48, 0.8))`,
                    border: '1px solid rgba(23, 57, 74, 0.6)',
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${h * 100}%` }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {/* Glow at top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-3"
                    style={{
                      background: `linear-gradient(180deg, ${tempColor}, transparent)`,
                      filter: 'blur(4px)',
                    }}
                  />
                </motion.div>
                <span className="text-xs font-mono text-slate">R{i + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Temperature scale */}
        <div className="absolute right-4 top-12 bottom-12 w-2 rounded-full overflow-hidden"
          style={{ background: 'var(--deep)', border: '1px solid var(--tide)' }}
        >
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-full"
            style={{
              background: 'linear-gradient(180deg, var(--ember), var(--amber), var(--aqua))',
            }}
            initial={{ height: '0%' }}
            animate={{ height: `${tempNorm * 100}%` }}
            transition={{ delay: 1.2, duration: 1 }}
          />
        </div>
      </div>
    </div>
  );
}

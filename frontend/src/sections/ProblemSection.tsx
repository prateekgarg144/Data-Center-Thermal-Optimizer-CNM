import { motion } from 'framer-motion';
import { useInView } from '../hooks/useAnimations';

/**
 * Section 2: "The Problem" — rack silhouettes that heat up,
 * cooling units sending particle lines weighted by the A matrix.
 */

const A_MATRIX = [
  [0.40, 0.00, 0.00],
  [0.45, 0.00, 0.00],
  [0.03, 0.65, 0.03],
  [0.00, 0.00, 0.45],
  [0.00, 0.00, 0.40],
];

const RACK_LABELS = ['R1', 'R2', 'R3', 'R4', 'R5'];
const UNIT_LABELS = ['CU-1', 'CU-2', 'CU-3'];
const BASE_UTIL = [0.35, 0.50, 0.65, 0.40, 0.30];

export default function ProblemSection() {
  const [ref, inView] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-32 px-6 md:px-12"
      id="problem"
    >
      <div className="max-w-[1500px] mx-auto">
        <motion.span
          className="section-label"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
        >
          The challenge
        </motion.span>

        <motion.h2
          className="font-display text-3xl md:text-5xl mt-4 mb-6 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          Five racks generate heat. Three cooling units fight it.
        </motion.h2>

        <motion.p
          className="text-slate text-lg max-w-2xl mb-16"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Each rack converts electrical power into heat proportional to its utilization.
          The cooling units distribute their output across racks according to a fixed
          distribution matrix A. The question: how much should each unit output
          to minimize electricity while keeping temperatures safe?
        </motion.p>

        {/* Rack + Cooling Unit visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">

          {/* Racks */}
          <div className="flex items-end gap-4 justify-center h-64">
            {BASE_UTIL.map((util, i) => (
              <RackSilhouette key={i} index={i} util={util} inView={inView} />
            ))}
          </div>

          {/* Connection lines (A matrix) */}
          <div className="hidden lg:block">
            <AMatrixVisual inView={inView} />
          </div>

          {/* Cooling Units */}
          <div className="flex gap-6 justify-center">
            {UNIT_LABELS.map((label, j) => (
              <motion.div
                key={j}
                className="glass-card p-4 w-28 text-center"
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.5 + j * 0.1, duration: 0.5 }}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(79, 227, 208, 0.1)', border: '1px solid var(--tide)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--aqua)" strokeWidth="1.5">
                    <path d="M12 2v20M2 12h20M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
                  </svg>
                </div>
                <div className="font-mono text-sm font-semibold text-mist">{label}</div>
                <div className="text-xs text-slate mt-1">25 kW max</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* A matrix detail */}
        <motion.div
          className="mt-16 glass-card p-6 md:p-8 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div className="text-sm font-mono text-aqua mb-3 tracking-wider">
            DISTRIBUTION MATRIX A
          </div>
          <p className="text-slate text-sm mb-4">
            Each cell shows how much of a cooling unit's thermal output reaches a rack.
            Unit 1 mainly serves racks 1–2, unit 2 serves rack 3, unit 3 serves racks 4–5.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-slate">
                  <th className="text-left pr-4 py-2"></th>
                  {UNIT_LABELS.map(u => <th key={u} className="px-4 py-2 text-center">{u}</th>)}
                </tr>
              </thead>
              <tbody>
                {A_MATRIX.map((row, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--tide)' }}>
                    <td className="pr-4 py-2 text-mist font-semibold">{RACK_LABELS[i]}</td>
                    {row.map((val, j) => (
                      <td key={j} className="px-4 py-2 text-center tabular-nums"
                        style={{
                          color: val > 0.3 ? 'var(--aqua)' : val > 0 ? 'var(--slate)' : 'rgba(143,169,179,0.3)',
                          fontWeight: val > 0.3 ? 600 : 400,
                        }}
                      >
                        {val.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function RackSilhouette({ index, util, inView }: { index: number; util: number; inView: boolean }) {
  const height = 40 + util * 160;
  const heatColor = util > 0.6
    ? `rgba(255, 122, 89, ${0.4 + util * 0.3})`
    : `rgba(79, 227, 208, ${0.15 + util * 0.2})`;

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.2 + index * 0.08, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <motion.div
        className="w-12 md:w-16 rounded-t-md relative overflow-hidden"
        style={{
          border: '1px solid var(--tide)',
          background: `linear-gradient(180deg, ${heatColor}, var(--deep))`,
        }}
        initial={{ height: 0 }}
        animate={inView ? { height } : {}}
        transition={{ delay: 0.4 + index * 0.1, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* Utilization bars inside rack */}
        {Array.from({ length: Math.floor(util * 6) + 1 }).map((_, k) => (
          <div
            key={k}
            className="mx-1 my-1 h-1.5 rounded-full"
            style={{
              background: heatColor,
              opacity: 0.6 + Math.random() * 0.3,
              width: `${50 + Math.random() * 40}%`,
            }}
          />
        ))}
      </motion.div>
      <span className="text-xs font-mono text-slate">R{index + 1}</span>
      <span className="text-xs font-mono tabular-nums" style={{ color: heatColor }}>
        {(util * 100).toFixed(0)}%
      </span>
    </motion.div>
  );
}

function AMatrixVisual({ inView }: { inView: boolean }) {
  return (
    <motion.div
      className="w-32 h-48 flex flex-col items-center justify-center gap-2"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      <svg width="120" height="160" viewBox="0 0 120 160" className="opacity-60">
        {/* Lines from racks (left) to units (right), weighted by A */}
        {A_MATRIX.map((row, i) =>
          row.map((val, j) => {
            if (val === 0) return null;
            const y1 = 16 + i * 32;
            const y2 = 32 + j * 48;
            return (
              <motion.line
                key={`${i}-${j}`}
                x1="0" y1={y1}
                x2="120" y2={y2}
                stroke="var(--aqua)"
                strokeWidth={val * 3}
                strokeOpacity={0.3 + val * 0.5}
                initial={{ pathLength: 0 }}
                animate={inView ? { pathLength: 1 } : {}}
                transition={{ delay: 0.8 + i * 0.05 + j * 0.05, duration: 0.6 }}
              />
            );
          })
        )}
      </svg>
      <span className="text-xs font-mono text-slate">A · q</span>
    </motion.div>
  );
}

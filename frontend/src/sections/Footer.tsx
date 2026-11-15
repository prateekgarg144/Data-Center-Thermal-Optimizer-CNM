import React from 'react';
import { Download, FileText, Github, Terminal, Activity } from 'lucide-react';
import { downloadUrl } from '../lib/api';

export const Footer: React.FC = () => {
  const downloadFiles = [
    { name: 'summary.csv', label: 'Overall Summary Metrics (CSV)' },
    { name: 'timeseries_normal_workload_simplex.csv', label: 'Normal Workload (Simplex Trace)' },
    { name: 'timeseries_high_workload_simplex.csv', label: 'High Workload (Simplex Trace)' },
    { name: 'timeseries_workload_spike_simplex.csv', label: 'Workload Spike (Simplex Trace)' },
    { name: 'timeseries_hot_ambient_simplex.csv', label: 'Hot Ambient (Simplex Trace)' },
  ];

  return (
    <footer className="border-t border-tide/80 bg-deep/30 py-16 px-6 md:px-12 text-slate font-mono text-xs">
      <div className="max-w-[1500px] mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Abstract */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded-md border border-aqua/40 bg-aqua/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-aqua" />
              </div>
              <span className="font-display font-bold text-sm text-mist tracking-wide">
                DATA CENTER THERMAL OPTIMIZER
              </span>
            </div>
            <p className="text-slate text-xs leading-relaxed max-w-md">
              A discrete-time thermodynamic simulation framework studying optimal cooling allocation across five server rack zones.
              Minimizes electrical power under strict thermal constraints using constrained derivative-free optimization.
            </p>
            <div className="text-[11px] text-slate/70">
              Stack: Python 3.10+ · NumPy · SciPy · FastAPI · React 18 · TypeScript · Vite · Tailwind CSS
            </div>
          </div>

          {/* Direct Downloads */}
          <div className="space-y-3">
            <div className="text-mist font-bold uppercase tracking-wider text-[11px]">
              Export Simulation Artifacts
            </div>
            <ul className="space-y-2">
              {downloadFiles.map(file => (
                <li key={file.name}>
                  <a
                    href={downloadUrl(file.name)}
                    download={file.name}
                    className="flex items-center space-x-2 hover:text-aqua transition-colors text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5 text-aqua/70" />
                    <span>{file.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick CLI Commands */}
          <div className="space-y-3">
            <div className="text-mist font-bold uppercase tracking-wider text-[11px]">
              Terminal Quickstart
            </div>
            <div className="bg-abyss p-3 rounded-lg border border-tide space-y-2 text-[10px]">
              <div className="text-slate flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-aqua" />
                <span>Backend API:</span>
              </div>
              <code className="text-foam block">uvicorn api.server:app --port 8000</code>
              <div className="text-slate flex items-center gap-1.5 pt-1">
                <Terminal className="w-3 h-3 text-aqua" />
                <span>Frontend UI:</span>
              </div>
              <code className="text-foam block">cd frontend && npm run dev</code>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-tide/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            © 2026 Data Center Thermal Optimizer · Academic simulation prototype.
          </div>
          <div className="flex items-center space-x-6">
            <a href="#interactive-lab" className="hover:text-aqua transition-colors">
              Back to Lab Top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

import React, { useEffect, useState, useRef } from 'react';
import { HashRouterProvider, useRouter } from './lib/router';
import { BubbleEngine } from './lib/bubbleEngine';
import { fetchSummary, fetchTimeseries, fetchConfig } from './lib/api';
import { type SummaryRow, type TimeseriesRow } from './lib/types';
import { useTheme } from './hooks/useAnimations';

import { Navbar } from './components/Navbar';
import { CommandPalette } from './components/CommandPalette';

import { OverviewPage } from './pages/OverviewPage';
import { LabPage } from './pages/LabPage';
import { ComparePage } from './pages/ComparePage';
import { TheoryPage } from './pages/TheoryPage';

const AppContent: React.FC = () => {
  const { route } = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();

  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [timeseriesData, setTimeseriesData] = useState<Record<string, TimeseriesRow[]>>({});
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);

  const bubbleEngineRef = useRef<BubbleEngine | null>(null);

  // Initialize Canvas & Data Loading
  useEffect(() => {
    // 1. Canvas Bubble Engine
    const canvas = document.getElementById('bubble-canvas') as HTMLCanvasElement | null;
    if (canvas && !bubbleEngineRef.current) {
      bubbleEngineRef.current = new BubbleEngine(canvas);
    }

    // 2. Fetch Data & Manage 1.2s max loading screen (first visit only)
    const initData = async () => {
      const loadingScreen = document.getElementById('loading-screen');
      const hasVisited = sessionStorage.getItem('visited');

      if (hasVisited && loadingScreen) {
        loadingScreen.classList.add('done');
      }

      try {
        const cfg = await fetchConfig();
        if (cfg) setIsLiveApi(true);

        const summary = await fetchSummary();
        setSummaryData(summary);

        const [simplex, baseline, exhaustive] = await Promise.all([
          fetchTimeseries('normal_workload', 'simplex'),
          fetchTimeseries('normal_workload', 'baseline'),
          fetchTimeseries('normal_workload', 'exhaustive'),
        ]);

        setTimeseriesData({
          normal_workload_simplex: simplex,
          normal_workload_baseline: baseline,
          normal_workload_exhaustive: exhaustive,
        });
      } catch (err) {
        console.warn('Data initialization notice:', err);
      } finally {
        sessionStorage.setItem('visited', '1');
        if (loadingScreen) {
          setTimeout(() => loadingScreen.classList.add('done'), 400);
        }
      }
    };

    initData();

    return () => {
      if (bubbleEngineRef.current) {
        bubbleEngineRef.current.destroy();
        bubbleEngineRef.current = null;
      }
    };
  }, []);

  // Set bubble mode based on active route
  useEffect(() => {
    if (bubbleEngineRef.current) {
      if (route === '/') {
        bubbleEngineRef.current.setPageMode('overview');
      } else {
        bubbleEngineRef.current.setPageMode('subdued');
      }
    }
  }, [route]);

  const handleSimulationRun = (
    newSummary: SummaryRow[],
    newTraces: Record<string, TimeseriesRow[]>
  ) => {
    setSummaryData(newSummary);
    setTimeseriesData(prev => ({ ...prev, ...newTraces }));
  };

  return (
    <div className="relative min-h-screen text-text selection:bg-accent/30 selection:text-text">
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
        isLiveApi={isLiveApi}
      />

      <main>
        {route === '/' && <OverviewPage summaryData={summaryData} />}
        {route === '/lab' && (
          <LabPage
            summaryData={summaryData}
            timeseriesData={timeseriesData}
            onSimulationRun={handleSimulationRun}
            isLiveApi={isLiveApi}
          />
        )}
        {route === '/compare' && (
          <ComparePage
            summaryData={summaryData}
            timeseriesData={timeseriesData}
          />
        )}
        {route === '/theory' && <TheoryPage />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <HashRouterProvider>
      <AppContent />
    </HashRouterProvider>
  );
};

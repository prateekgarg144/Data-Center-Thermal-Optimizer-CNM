/**
 * API client with CSV fallback when the FastAPI server is unreachable.
 */
import Papa from 'papaparse';
import type { SummaryRow, TimeseriesRow, ExperimentResult, RunConfig, ScenarioInfo } from './types';

const API_BASE = '/api';

async function tryFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function loadCSV<T>(path: string): Promise<T[]> {
  const res = await fetch(path);
  if (!res.ok) return [];
  const text = await res.text();
  const result = Papa.parse<T>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return result.data;
}

export async function fetchScenarios(): Promise<ScenarioInfo[]> {
  const data = await tryFetch<{ scenarios: ScenarioInfo[] }>(`${API_BASE}/scenarios`);
  if (data) return data.scenarios;
  // Fallback
  return [
    { key: 'low_workload', label: 'Low workload' },
    { key: 'normal_workload', label: 'Normal workload' },
    { key: 'high_workload', label: 'High workload' },
    { key: 'workload_spike', label: 'Workload spike' },
    { key: 'hot_ambient', label: 'Hot ambient' },
  ];
}

export async function fetchSummary(): Promise<SummaryRow[]> {
  const data = await tryFetch<{ rows: SummaryRow[] }>(`${API_BASE}/summary`);
  if (data) return data.rows;
  return loadCSV<SummaryRow>('/data/summary.csv');
}

export async function fetchTimeseries(scenario: string, method: string): Promise<TimeseriesRow[]> {
  const data = await tryFetch<{ rows: TimeseriesRow[] }>(
    `${API_BASE}/timeseries/${scenario}?method=${method}`
  );
  if (data) return data.rows;
  return loadCSV<TimeseriesRow>(`/data/timeseries_${scenario}_${method}.csv`);
}

export async function runExperiment(config: RunConfig): Promise<ExperimentResult> {
  const res = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Experiment failed: ${err}`);
  }
  return (await res.json()) as ExperimentResult;
}

export async function fetchConfig() {
  return tryFetch<Record<string, unknown>>(`${API_BASE}/config`);
}

export function downloadUrl(filename: string): string {
  return `${API_BASE}/download/${filename}`;
}

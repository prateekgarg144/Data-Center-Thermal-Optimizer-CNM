// Data types for the Data Center Thermal Optimizer

export interface ScenarioInfo {
  key: string;
  label: string;
}

export interface SummaryRow {
  scenario: string;
  method: string;
  cooling_energy_kwh: number;
  average_cooling_power_kw: number;
  maximum_rack_temperature_c: number;
  minimum_rack_temperature_c: number;
  temperature_violation_steps: number;
  optimizer_runtime_seconds: number;
  savings_vs_baseline_percent?: number;
}

export interface TimeseriesRow {
  step: number;
  time_hours: number;
  method: string;
  ambient_c: number;
  total_rack_heat_kw: number;
  cooling_unit_1_kw_thermal: number;
  cooling_unit_2_kw_thermal: number;
  cooling_unit_3_kw_thermal?: number;
  cooling_electric_kw: number;
  cooling_energy_kwh: number;
  max_temp_c: number;
  min_temp_c: number;
  temperature_violation_count: number;
  rack_1_temp_c: number;
  rack_2_temp_c: number;
  rack_3_temp_c: number;
  rack_4_temp_c: number;
  rack_5_temp_c: number;
  rack_1_heat_kw: number;
  rack_2_heat_kw: number;
  rack_3_heat_kw: number;
  rack_4_heat_kw: number;
  rack_5_heat_kw: number;
  rack_1_cooling_kw: number;
  rack_2_cooling_kw: number;
  rack_3_cooling_kw: number;
  rack_4_cooling_kw: number;
  rack_5_cooling_kw: number;
  rack_1_previous_temp_c: number;
  rack_2_previous_temp_c: number;
  rack_3_previous_temp_c: number;
  rack_4_previous_temp_c: number;
  rack_5_previous_temp_c: number;
}

export interface RunConfig {
  scenario: string;
  ambient_temp: number;
  workload_multiplier: number;
  horizon_hours: number;
  temp_min: number;
  temp_max: number;
  controller: string;
}

export interface ExperimentResult {
  scenario: string;
  config: {
    ambient_temp: number;
    workload_multiplier: number;
    horizon_hours: number;
    temp_min: number;
    temp_max: number;
  };
  summary: {
    columns: string[];
    rows: SummaryRow[];
  };
  timeseries: Record<string, {
    columns: string[];
    rows: TimeseriesRow[];
  }>;
}

export type Method = 'baseline' | 'simplex' | 'exhaustive';

export const METHOD_LABELS: Record<Method, string> = {
  baseline: 'Proportional Baseline',
  simplex: 'Nelder–Mead Simplex',
  exhaustive: 'Exhaustive Grid Search',
};

export const METHOD_COLORS: Record<Method, string> = {
  baseline: '#E6B86A',   // sand
  exhaustive: '#C9D6DF', // pale slate
  simplex: '#7FB8FF',    // ice blue
};

export const SCENARIO_LABELS: Record<string, string> = {
  low_workload: 'Low Workload',
  normal_workload: 'Normal Workload',
  high_workload: 'High Workload',
  workload_spike: 'Workload Spike',
  hot_ambient: 'Hot Ambient',
};

// Continuous temperature scale: ice blue -> pale -> sand -> coral
export const RACK_COLORS = [
  '#7FB8FF',
  '#BBD9FF',
  '#E6B86A',
  '#FFA085',
  '#FF6B4A',
];

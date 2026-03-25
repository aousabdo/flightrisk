/* Centralized color palette for all charts */

// Risk level colors
export const RISK = {
  critical: '#dc2626',  // red-600
  high: '#ef4444',      // red-500
  medium: '#f59e0b',    // amber-500
  low: '#22c55e',       // green-500
  safe: '#3b82f6',      // blue-500
};

// Chart colors
export const CHART = {
  atRisk: '#ef4444',    // red-500 — always used for "at risk" bars
  safe: '#93c5fd',      // blue-300 — always used for "safe/not at risk" bars
  primary: '#3b82f6',   // blue-500
  secondary: '#8b5cf6', // violet-500
  accent: '#f59e0b',    // amber-500
};

// Department colors
export const DEPT = {
  'Sales': '#3b82f6',
  'Research & Development': '#8b5cf6',
  'Human Resources': '#14b8a6',
};

// Categorical palette for pie charts and multi-series
export const CATEGORICAL = [
  '#3b82f6', '#ef4444', '#14b8a6', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899',
];

// Risk badge style helper
export function getRiskBadgeClass(riskPct) {
  if (riskPct >= 80) return 'bg-red-100 text-red-600';
  if (riskPct >= 50) return 'bg-amber-100 text-amber-600';
  if (riskPct >= 20) return 'bg-orange-100 text-orange-600';
  return 'bg-green-100 text-green-600';
}

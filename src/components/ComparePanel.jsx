import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, ReferenceLine,
} from 'recharts';
import { X, Trash2, GitCompareArrows } from 'lucide-react';
import { useCompare } from '../hooks/useCompare';
import { useData } from '../hooks/useEmployees';
import { formatCurrencyFull } from '../lib/costs';
import { getRiskLevel } from '../lib/scores';

function MiniGauge({ probability }) {
  const pct = (probability || 0) * 100;
  const { level, color } = getRiskLevel(probability);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (probability * circumference);
  const colorMap = { red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e' };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="7" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={colorMap[color]}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="gauge-animate"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{pct.toFixed(0)}%</span>
          <span className="text-[9px] text-slate-400">{level}</span>
        </div>
      </div>
    </div>
  );
}

const METRICS = [
  { key: 'JobLevel', label: 'Job Level' },
  { key: 'YearsAtCompany', label: 'Tenure (yrs)' },
  { key: 'MonthlyIncome', label: 'Monthly Income', format: 'currency' },
  { key: 'DistanceFromHome', label: 'Distance (mi)' },
  { key: 'Education', label: 'Education' },
  { key: 'WorkLifeBalance', label: 'Work-Life Balance' },
  { key: 'PerformanceRating', label: 'Performance' },
  { key: 'OverTime', label: 'Overtime' },
  { key: 'BusinessTravel', label: 'Business Travel' },
  { key: 'attrition_cost', label: 'Cost Exposure', format: 'currency' },
];

export default function ComparePanel() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { explanations } = useData();
  const [open, setOpen] = useState(false);

  const featureDataMap = useMemo(() => {
    const map = {};
    compareList.forEach(emp => {
      const expl = explanations[emp.Name] || [];
      const seen = new Set();
      map[emp.EmployeeNumber] = expl
        .filter(f => { if (seen.has(f.feature)) return false; seen.add(f.feature); return true; })
        .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
        .slice(0, 6)
        .map(f => ({ name: f.description || f.feature, weight: f.weight }));
    });
    return map;
  }, [compareList, explanations]);

  if (compareList.length === 0) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-500 transition-all hover:scale-105"
      >
        <GitCompareArrows className="w-4 h-4" />
        <span className="text-sm font-medium">Compare ({compareList.length})</span>
      </button>

      {/* Full-screen overlay */}
      {open && (
        <div className="fixed inset-0 z-[80] bg-slate-950/95 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <GitCompareArrows className="w-5 h-5" />
                Employee Comparison
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearCompare}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Employee headers */}
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
              {compareList.map(emp => (
                <div key={emp.EmployeeNumber} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center relative">
                  <button
                    onClick={() => removeFromCompare(emp.EmployeeNumber)}
                    className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <img
                    src={`https://i.pravatar.cc/150?u=${encodeURIComponent(emp.Name)}`}
                    alt={emp.Name}
                    className="w-16 h-16 rounded-full mx-auto mb-3 ring-2 ring-slate-700 object-cover"
                  />
                  <h3 className="text-sm font-semibold text-white">{emp.Name}</h3>
                  <p className="text-[11px] text-slate-400">{emp.JobRole}</p>
                  <p className="text-[11px] text-slate-500">{emp.Department}</p>
                  <div className="mt-3 flex justify-center">
                    <MiniGauge probability={emp.prob_of_attrition} />
                  </div>
                  <div className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    emp.label === 'Yes'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {emp.label === 'Yes' ? 'Predicted to Leave' : 'Predicted to Stay'}
                  </div>
                </div>
              ))}
            </div>

            {/* Metrics comparison table */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-xs font-semibold text-slate-400 px-4 py-3 uppercase tracking-wider">Metric</th>
                    {compareList.map(emp => (
                      <th key={emp.EmployeeNumber} className="text-center text-xs font-semibold text-slate-400 px-4 py-3">
                        {emp.Name.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map(({ key, label, format }) => (
                    <tr key={key} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="text-xs text-slate-300 px-4 py-2.5">{label}</td>
                      {compareList.map(emp => (
                        <td key={emp.EmployeeNumber} className="text-center text-xs font-medium text-white px-4 py-2.5">
                          {format === 'currency' ? formatCurrencyFull(emp[key] || 0) : String(emp[key] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Risk Factors side by side */}
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Risk Factors</h3>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
              {compareList.map(emp => {
                const data = featureDataMap[emp.EmployeeNumber] || [];
                return (
                  <div key={emp.EmployeeNumber} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-2 text-center">{emp.Name.split(' ')[0]}</p>
                    {data.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={data} layout="vertical" margin={{ left: 5, right: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis type="number" stroke="#64748b" fontSize={9} />
                          <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={8} width={100} />
                          <ReferenceLine x={0} stroke="#475569" />
                          <Tooltip
                            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }}
                            formatter={v => [v.toFixed(4), 'Weight']}
                          />
                          <Bar dataKey="weight" radius={[0, 3, 3, 0]}>
                            {data.map((entry, i) => (
                              <Cell key={i} fill={entry.weight > 0 ? '#ef4444' : '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-[10px] text-slate-500 text-center py-4">No data</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

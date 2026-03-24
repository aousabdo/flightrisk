import { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
} from 'recharts';
import {
  FlaskConical, Play, RotateCcw, TrendingDown, TrendingUp,
  ArrowRight, Check, Minus,
} from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { predictAttrition } from '../lib/predict';
import { formatCurrencyFull } from '../lib/costs';

function EditableField({ label, value, onChange, type = 'text', options }) {
  if (options) {
    return (
      <div>
        <label className="block text-xs text-slate-400 mb-1">{label}</label>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

function DeltaIndicator({ original, updated }) {
  const origPct = (original * 100).toFixed(1);
  const updPct = (updated * 100).toFixed(1);
  const delta = updated - original;
  const deltaPct = (delta * 100).toFixed(1);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-400">{origPct}%</span>
      <ArrowRight className="w-4 h-4 text-slate-600" />
      <span className={`text-sm font-semibold ${delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-red-400' : 'text-slate-300'}`}>
        {updPct}%
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        delta < -0.01 ? 'bg-emerald-500/20 text-emerald-400' :
        delta > 0.01 ? 'bg-red-500/20 text-red-400' :
        'bg-slate-700 text-slate-400'
      }`}>
        {delta < 0 ? '' : '+'}{deltaPct}%
      </span>
    </div>
  );
}

export default function WhatIfAnalysis() {
  const { employees, modelReady, loading } = useData();
  const [selectedId, setSelectedId] = useState(null);
  const [edits, setEdits] = useState({});
  const [results, setResults] = useState([]);

  const atRiskEmployees = useMemo(() =>
    employees.filter(e => e.label === 'Yes').sort((a, b) => b.prob_of_attrition - a.prob_of_attrition),
    [employees]
  );

  const selectedEmployee = useMemo(() =>
    atRiskEmployees.find(e => e.EmployeeNumber === selectedId),
    [atRiskEmployees, selectedId]
  );

  const editableFields = [
    { key: 'OverTime', label: 'Overtime', options: ['Yes', 'No'] },
    { key: 'MonthlyIncome', label: 'Monthly Income', type: 'number' },
    { key: 'BusinessTravel', label: 'Business Travel', options: ['Travel_Frequently', 'Travel_Rarely', 'Non-Travel'] },
    { key: 'StockOptionLevel', label: 'Stock Options', options: ['0', '1', '2', '3'] },
    { key: 'WorkLifeBalance', label: 'Work-Life Balance', options: ['Bad', 'Good', 'Better', 'Best'] },
    { key: 'TrainingTimesLastYear', label: 'Training (times/yr)', type: 'number' },
    { key: 'YearsSinceLastPromotion', label: 'Years Since Promotion', type: 'number' },
    { key: 'PerformanceRating', label: 'Performance Rating', options: ['Low', 'High', 'Excellent', 'Outstanding'] },
    { key: 'DistanceFromHome', label: 'Distance From Home', type: 'number' },
    { key: 'EnvironmentSatisfaction', label: 'Environment Satisfaction', options: ['Low', 'Medium', 'High', 'Very High'] },
    { key: 'JobSatisfaction', label: 'Job Satisfaction', options: ['Low', 'Medium', 'High', 'Very High'] },
  ];

  function selectEmployee(emp) {
    setSelectedId(emp.EmployeeNumber);
    setEdits({});
    setResults([]);
  }

  function getEditedValue(key) {
    if (key in edits) return edits[key];
    return selectedEmployee?.[key] ?? '';
  }

  function updateField(key, value) {
    setEdits(prev => ({ ...prev, [key]: value }));
  }

  function runPrediction() {
    if (!selectedEmployee || !modelReady) return;
    const modified = { ...selectedEmployee, ...edits };
    const newProb = predictAttrition(modified);
    setResults(prev => [
      ...prev,
      {
        id: Date.now(),
        changes: { ...edits },
        originalProb: selectedEmployee.prob_of_attrition,
        newProb,
      },
    ]);
  }

  function applyQuickAction(action) {
    if (!selectedEmployee) return;
    switch (action) {
      case 'remove-overtime':
        setEdits(prev => ({ ...prev, OverTime: 'No' }));
        break;
      case 'increase-salary-10':
        setEdits(prev => ({ ...prev, MonthlyIncome: Math.round(selectedEmployee.MonthlyIncome * 1.1) }));
        break;
      case 'increase-salary-20':
        setEdits(prev => ({ ...prev, MonthlyIncome: Math.round(selectedEmployee.MonthlyIncome * 1.2) }));
        break;
      case 'promote':
        setEdits(prev => ({ ...prev, YearsSinceLastPromotion: 0 }));
        break;
      case 'improve-wlb':
        setEdits(prev => ({ ...prev, WorkLifeBalance: 'Best' }));
        break;
      case 'add-training':
        setEdits(prev => ({ ...prev, TrainingTimesLastYear: (selectedEmployee.TrainingTimesLastYear || 0) + 2 }));
        break;
    }
  }

  function reset() {
    setEdits({});
    setResults([]);
  }

  const comparisonData = useMemo(() => {
    if (!results.length || !selectedEmployee) return [];
    const latest = results[results.length - 1];
    return [
      { name: 'Original', value: latest.originalProb * 100, fill: '#ef4444' },
      { name: 'Modified', value: latest.newProb * 100, fill: latest.newProb < latest.originalProb ? '#22c55e' : '#f59e0b' },
    ];
  }, [results, selectedEmployee]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">What-If Analysis</h2>
        <p className="text-sm text-slate-400 mt-1">Modify employee attributes and see how attrition risk changes in real-time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Employee Selector */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">At-Risk Employees</h3>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {atRiskEmployees.slice(0, 50).map(emp => (
                <button
                  key={emp.EmployeeNumber}
                  onClick={() => selectEmployee(emp)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    selectedId === emp.EmployeeNumber
                      ? 'bg-blue-600/20 border border-blue-500/30 text-white'
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <p className="font-medium truncate">{emp.Name}</p>
                  <p className="text-slate-500">{emp.JobRole} &middot; {((emp.prob_of_attrition || 0) * 100).toFixed(0)}% risk</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor + Results */}
        <div className="lg:col-span-3 space-y-4">
          {selectedEmployee ? (
            <>
              {/* Quick Actions */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'remove-overtime', label: 'Remove Overtime' },
                    { id: 'increase-salary-10', label: 'Raise Salary 10%' },
                    { id: 'increase-salary-20', label: 'Raise Salary 20%' },
                    { id: 'promote', label: 'Promote' },
                    { id: 'improve-wlb', label: 'Improve Work-Life' },
                    { id: 'add-training', label: 'Add Training' },
                  ].map(action => (
                    <button
                      key={action.id}
                      onClick={() => applyQuickAction(action.id)}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Editing: {selectedEmployee.Name}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={reset}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                    <button
                      onClick={runPrediction}
                      disabled={!modelReady || Object.keys(edits).length === 0}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 rounded-lg text-xs text-white font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" /> Run Prediction
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {editableFields.map(field => (
                    <EditableField
                      key={field.key}
                      label={field.label}
                      value={getEditedValue(field.key)}
                      onChange={v => updateField(field.key, v)}
                      type={field.type}
                      options={field.options}
                    />
                  ))}
                </div>
                {Object.keys(edits).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(edits).map(([key, val]) => (
                      <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">
                        {key}: {String(selectedEmployee[key])} &rarr; {String(val)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Prediction Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={comparisonData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                            formatter={v => [`${v.toFixed(1)}%`, 'Risk']}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {comparisonData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {results.map((r, i) => (
                        <div key={r.id} className="bg-slate-800/50 rounded-lg p-3">
                          <p className="text-xs text-slate-400 mb-2">Scenario {i + 1}</p>
                          <DeltaIndicator original={r.originalProb} updated={r.newProb} />
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(r.changes).map(([k, v]) => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                                {k}={String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <FlaskConical className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">Select an at-risk employee to begin scenario analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

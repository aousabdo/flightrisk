import { useState, useMemo, useCallback } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { Play, RotateCcw, TrendingUp, ChevronUp } from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { predictAttrition } from '../lib/predict';
import { formatCurrency, formatCurrencyFull } from '../lib/costs';

export default function WhatIfAnalysis() {
  const { employees, departments, modelReady, loading } = useData();
  const [tab, setTab] = useState('whatif');
  const [deptFilter, setDeptFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [edits, setEdits] = useState({});
  const [predictions, setPredictions] = useState(null);

  // Overtime, WorkLife, Travel, Performance dropdowns
  const [overtime, setOvertime] = useState('Original');
  const [worklife, setWorklife] = useState('Original');
  const [travel, setTravel] = useState('Original');
  const [performance, setPerformance] = useState('Original');
  const [salaryIncrease, setSalaryIncrease] = useState(0);

  const atRisk = useMemo(() => {
    let data = employees.filter(e => e.label === 'Yes');
    if (deptFilter) data = data.filter(e => e.Department === deptFilter);
    return data;
  }, [employees, deptFilter]);

  const scatterData = useMemo(() =>
    atRisk.map(e => ({
      x: e.employee_score || 50,
      y: e.attrition_cost || 0,
      name: e.Name,
      id: e.EmployeeNumber,
      prob: e.prob_of_attrition,
      dept: e.Department,
    })),
    [atRisk]
  );

  function toggleRow(id) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedRows.size === atRisk.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(atRisk.map(e => e.EmployeeNumber)));
  }

  const selectedEmployees = useMemo(() =>
    atRisk.filter(e => selectedRows.has(e.EmployeeNumber)),
    [atRisk, selectedRows]
  );

  function promote() {
    // Set years since promotion to 0 for selected
    const newEdits = { ...edits };
    selectedRows.forEach(id => {
      if (!newEdits[id]) newEdits[id] = {};
      newEdits[id].YearsSinceLastPromotion = 0;
    });
    setEdits(newEdits);
  }

  function resetAll() {
    setEdits({});
    setOvertime('Original');
    setWorklife('Original');
    setTravel('Original');
    setPerformance('Original');
    setSalaryIncrease(0);
    setPredictions(null);
  }

  function generatePredictions() {
    if (!modelReady || selectedRows.size === 0) return;
    const results = [];
    selectedRows.forEach(id => {
      const emp = atRisk.find(e => e.EmployeeNumber === id);
      if (!emp) return;
      const modified = { ...emp, ...(edits[id] || {}) };
      if (overtime !== 'Original') modified.OverTime = overtime;
      if (worklife !== 'Original') modified.WorkLifeBalance = worklife;
      if (travel !== 'Original') modified.BusinessTravel = travel;
      if (performance !== 'Original') modified.PerformanceRating = performance;
      if (salaryIncrease > 0) modified.MonthlyIncome = Math.round(emp.MonthlyIncome * (1 + salaryIncrease / 100));

      const newProb = predictAttrition(modified);
      results.push({
        ...emp,
        originalProb: emp.prob_of_attrition,
        updatedPrediction: newProb >= 0.5 ? 'Yes' : 'No',
        updatedProb: newProb,
        modifiedIncome: modified.MonthlyIncome,
      });
    });
    setPredictions(results);
    setTab('updated');
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-4">
        <button onClick={() => setTab('whatif')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'whatif' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent'}`}>
          What-if Analysis
        </button>
        <button onClick={() => setTab('updated')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'updated' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent'}`}>
          Updated Predictions
        </button>
      </div>

      {tab === 'whatif' && (
        <div className="space-y-4">
          {/* Department filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Select Department</label>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Scatter Plot */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm text-gray-600 mb-3">Attrition Cost by Employee Score for Employees who are predicted Leave</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="x" name="Employee Score" stroke="#9ca3af" fontSize={11}
                  label={{ value: 'Employee Score', position: 'bottom', fill: '#6b7280', fontSize: 11 }} />
                <YAxis dataKey="y" name="Attrition Cost ($)" stroke="#9ca3af" fontSize={11}
                  tickFormatter={v => formatCurrency(v)} />
                <Tooltip content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-white border border-gray-300 rounded p-2 text-xs shadow">
                      <p className="font-medium">{d?.name}</p>
                      <p>Score: {d?.x?.toFixed(1)}</p>
                      <p>Cost: {formatCurrencyFull(d?.y || 0)}</p>
                      <p>Risk: {((d?.prob || 0) * 100).toFixed(0)}%</p>
                    </div>
                  );
                }} />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={selectedRows.has(entry.id) ? '#ef4444' : '#4299e1'}
                      fillOpacity={0.6}
                      r={selectedRows.has(entry.id) ? 6 : 4}
                      cursor="pointer"
                      onClick={() => toggleRow(entry.id)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Overtime</label>
                <select value={overtime} onChange={e => setOvertime(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                  <option>Original</option><option>Yes</option><option>No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Worklife Balance</label>
                <select value={worklife} onChange={e => setWorklife(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                  <option>Original</option><option>Bad</option><option>Good</option><option>Better</option><option>Best</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Business Travel</label>
                <select value={travel} onChange={e => setTravel(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                  <option>Original</option><option>Non-Travel</option><option>Travel_Rarely</option><option>Travel_Frequently</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Performance Rating</label>
                <select value={performance} onChange={e => setPerformance(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                  <option>Original</option><option>Low</option><option>High</option><option>Excellent</option><option>Outstanding</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-500 mb-1">Increase Monthly Income by %: {salaryIncrease}%</label>
                <input type="range" min="0" max="50" value={salaryIncrease}
                  onChange={e => setSalaryIncrease(Number(e.target.value))}
                  className="w-full accent-blue-600" />
                <div className="flex justify-between text-[10px] text-gray-400">
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(v => <span key={v}>{v}</span>)}
                </div>
              </div>
              <button onClick={promote}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Promote
              </button>
              <button onClick={resetAll}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 flex items-center gap-1">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          {/* Selected Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Selected Data</h3>
              <span className="text-xs text-gray-400">Showing {selectedEmployees.length} of {atRisk.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">
                      <input type="checkbox" checked={selectedRows.size === atRisk.length} onChange={selectAll} />
                    </th>
                    {['EmployeeNumber', 'Name', 'MaritalStatus', 'OverTime', 'MonthlyIncome', 'MonthlyRate', 'DailyRate', 'BusinessTravel', 'StockOptionLevel', 'WorkLifeBalance', 'TrainingTimesLastYear', 'YearsInCurrentRole'].map(col => (
                      <th key={col} className="text-left py-2 px-2 text-gray-500 font-medium whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedEmployees.length > 0 ? selectedEmployees : atRisk.slice(0, 10)).map(emp => (
                    <tr key={emp.EmployeeNumber} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-1.5 px-2">
                        <input type="checkbox" checked={selectedRows.has(emp.EmployeeNumber)}
                          onChange={() => toggleRow(emp.EmployeeNumber)} />
                      </td>
                      <td className="py-1.5 px-2">{emp.EmployeeNumber}</td>
                      <td className="py-1.5 px-2 whitespace-nowrap">{emp.Name}</td>
                      <td className="py-1.5 px-2">{emp.MaritalStatus}</td>
                      <td className="py-1.5 px-2">{emp.OverTime}</td>
                      <td className="py-1.5 px-2">{emp.MonthlyIncome}</td>
                      <td className="py-1.5 px-2">{emp.MonthlyRate}</td>
                      <td className="py-1.5 px-2">{emp.DailyRate}</td>
                      <td className="py-1.5 px-2">{emp.BusinessTravel}</td>
                      <td className="py-1.5 px-2">{emp.StockOptionLevel}</td>
                      <td className="py-1.5 px-2">{emp.WorkLifeBalance}</td>
                      <td className="py-1.5 px-2">{emp.TrainingTimesLastYear}</td>
                      <td className="py-1.5 px-2">{emp.YearsInCurrentRole}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-start">
              <button
                onClick={generatePredictions}
                disabled={selectedRows.size === 0 || !modelReady}
                className="px-5 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate New Predictions
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'updated' && (
        <div className="space-y-4">
          {predictions && predictions.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Updated Predictions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {['Name', 'Department', 'JobRole', 'Original Prediction', 'Original Risk', 'Updated Prediction', 'Updated Risk', 'Change'].map(col => (
                        <th key={col} className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map(p => {
                      const delta = p.updatedProb - p.originalProb;
                      return (
                        <tr key={p.EmployeeNumber} className="border-b border-gray-100">
                          <td className="py-2 px-3 whitespace-nowrap">{p.Name}</td>
                          <td className="py-2 px-3">{p.Department}</td>
                          <td className="py-2 px-3">{p.JobRole}</td>
                          <td className="py-2 px-3">{p.label}</td>
                          <td className="py-2 px-3">{((p.originalProb || 0) * 100).toFixed(1)}%</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              p.updatedPrediction === 'Yes' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {p.updatedPrediction === 'Yes' ? 'Leave' : 'Stay'}
                            </span>
                          </td>
                          <td className="py-2 px-3">{(p.updatedProb * 100).toFixed(1)}%</td>
                          <td className="py-2 px-3">
                            <span className={delta < 0 ? 'text-green-600 font-medium' : delta > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                              {delta < 0 ? '' : '+'}{(delta * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-400">
              <p>No predictions generated yet. Go to the What-if Analysis tab, select employees, and click "Generate New Predictions".</p>
            </div>
          )}

          <button onClick={() => setTab('whatif')}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
            &larr; Previous
          </button>
        </div>
      )}
    </div>
  );
}

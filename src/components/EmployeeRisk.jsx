import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, ReferenceLine,
} from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, Search, Download, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { useModal } from '../hooks/useModal';
import { formatCurrencyFull } from '../lib/costs';
import ExportButton from './ExportButton';

/* ── Virtualized Employee Search Combobox ── */
function EmployeeCombobox({ employees, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return employees.slice(0, 50);
    const q = query.toLowerCase();
    return employees.filter(e =>
      e.Name.toLowerCase().includes(q) ||
      e.Department.toLowerCase().includes(q) ||
      e.JobRole.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [employees, query]);

  const selected = useMemo(() =>
    employees.find(e => e.EmployeeNumber === selectedId),
    [employees, selectedId]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll highlighted into view
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlightIdx];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx, open]);

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[highlightIdx]) { onSelect(filtered[highlightIdx].EmployeeNumber); setOpen(false); setQuery(''); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  }, [filtered, highlightIdx, onSelect]);

  const displayText = selected ? `${selected.Name}, ${((selected.prob_of_attrition || 0) * 100).toFixed(1)}%` : 'Select employee...';

  return (
    <div ref={containerRef} className="relative max-w-sm">
      {/* Trigger */}
      <button
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded bg-white text-gray-800 text-sm hover:bg-gray-50 transition-colors text-left"
      >
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1 truncate">{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setHighlightIdx(0); }}
                onKeyDown={handleKey}
                placeholder="Search by name, department, or role..."
                className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Results - virtualized (only renders 50 max) */}
          <div ref={listRef} className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No employees found</p>
            ) : (
              filtered.map((emp, i) => {
                const risk = ((emp.prob_of_attrition || 0) * 100);
                const isSelected = emp.EmployeeNumber === selectedId;
                const isHighlighted = i === highlightIdx;
                return (
                  <button
                    key={emp.EmployeeNumber}
                    onClick={() => { onSelect(emp.EmployeeNumber); setOpen(false); setQuery(''); }}
                    onMouseEnter={() => setHighlightIdx(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isHighlighted ? 'bg-blue-50' : isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <img
                      src={`https://i.pravatar.cc/32?u=${encodeURIComponent(emp.Name)}`}
                      alt="" className="w-7 h-7 rounded-full object-cover shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{emp.Name}</p>
                      <p className="text-[10px] text-gray-400">{emp.JobRole} · {emp.Department}</p>
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      risk >= 50 ? 'bg-red-100 text-red-600' : risk >= 20 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {risk.toFixed(1)}%
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">
              {filtered.length === 50 ? '50+ results' : `${filtered.length} results`}
              {query ? ` for "${query}"` : ' · type to search'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeRisk() {
  const { employees, explanations, departments, jobRoles, loading } = useData();
  const { openEmployee } = useModal();
  const [selectedId, setSelectedId] = useState(null);
  const [deptFilter, setDeptFilter] = useState([]);
  const [roleFilter, setRoleFilter] = useState([]);
  const [riskThreshold, setRiskThreshold] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Auto-select first employee
  const filteredEmployees = useMemo(() => {
    let data = [...employees];
    if (deptFilter.length) data = data.filter(e => deptFilter.includes(e.Department));
    if (roleFilter.length) data = data.filter(e => roleFilter.includes(e.JobRole));
    if (riskThreshold > 0) data = data.filter(e => (e.prob_of_attrition || 0) * 100 >= riskThreshold);
    return data.sort((a, b) => a.Name.localeCompare(b.Name));
  }, [employees, deptFilter, roleFilter, riskThreshold]);

  const employee = useMemo(() => {
    if (selectedId) return filteredEmployees.find(e => e.EmployeeNumber === selectedId) || filteredEmployees[0];
    return filteredEmployees[0];
  }, [filteredEmployees, selectedId]);

  const featureData = useMemo(() => {
    if (!employee) return [];
    const expl = explanations[employee.Name];
    if (!expl) return [];
    const seen = new Set();
    return expl
      .filter(f => { if (seen.has(f.feature)) return false; seen.add(f.feature); return true; })
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .slice(0, 8)
      .map(f => ({
        name: f.description || f.feature,
        weight: f.weight,
      }));
  }, [employee, explanations]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const risk = employee ? (employee.prob_of_attrition || 0) * 100 : 0;
  const prediction = employee?.label === 'Yes' ? 'Leave' : 'Stay';
  const isHighRisk = prediction === 'Leave';

  return (
    <div className="animate-fade-in">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-[#1a237e]/90 to-[#0d47a1]/80 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&q=80')] bg-cover bg-center mix-blend-overlay opacity-40" />
        <div className="relative px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Employee Attrition Prediction & Prevention</h1>
              <p className="text-white/80 text-sm">Select an employee to learn how best to prevent their attrition</p>
            </div>
            <div className="print:hidden">
              <ExportButton data={filteredEmployees} filename="employee-risk-data" />
            </div>
          </div>

          {/* Employee Selector */}
          <div className="mt-4">
            <EmployeeCombobox
              employees={filteredEmployees}
              selectedId={employee?.EmployeeNumber}
              onSelect={setSelectedId}
            />
          </div>

          {/* Risk & Prediction Cards */}
          {employee && (
            <div className="flex gap-4 mt-4">
              <div className={`flex items-center gap-3 px-5 py-3 rounded-lg ${isHighRisk ? 'bg-red-500/90' : 'bg-green-500/90'}`}>
                {isHighRisk ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                <div>
                  <p className="text-xs font-medium opacity-80">Attrition Risk</p>
                  <p className="text-xl font-bold">{risk.toFixed(1)}%</p>
                </div>
              </div>
              <div className={`flex items-center gap-3 px-5 py-3 rounded-lg ${isHighRisk ? 'bg-red-500/90' : 'bg-green-500/90'}`}>
                {isHighRisk ? <XCircle className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                <div>
                  <p className="text-xs font-medium opacity-80">Prediction</p>
                  <p className="text-xl font-bold">{prediction}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {employee && (
        <div className="flex flex-col lg:flex-row">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Attrition Cause & Prevention */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Attrition Cause & Prevention Recommendations</h2>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Feature Chart */}
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center mb-3">
                      <p className="text-sm font-medium text-gray-700">Name: {employee.Name}</p>
                      <p className="text-xs text-gray-500">Prediction: {prediction}</p>
                      <p className="text-xs text-gray-500">Probability of Attrition: {risk.toFixed(1)}%</p>
                    </div>
                    {featureData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={featureData} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" stroke="#9ca3af" fontSize={11} label={{ value: 'Weight', position: 'bottom', fill: '#6b7280', fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={160} />
                          <ReferenceLine x={0} stroke="#374151" />
                          <Tooltip
                            contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12 }}
                            formatter={v => [v.toFixed(4), 'Weight']}
                          />
                          <Bar dataKey="weight" radius={[0, 3, 3, 0]}>
                            {featureData.map((entry, i) => (
                              <Cell key={i} fill={entry.weight > 0 ? '#334155' : '#dc2626'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-8">No explanation data available.</p>
                    )}
                    <div className="flex items-center justify-center gap-6 mt-2">
                      <span className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-3 h-3 rounded bg-gray-700" /> Supports
                      </span>
                      <span className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-3 h-3 rounded bg-red-600" /> Contradicts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employee Card + Recommendations */}
                <div className="w-full lg:w-72 space-y-4">
                  {/* Employee Card */}
                  <div className="bg-blue-600 text-white rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={`https://i.pravatar.cc/150?u=${encodeURIComponent(employee.Name)}`}
                        alt={employee.Name}
                        className="w-12 h-12 rounded-full bg-white/20 object-cover"
                      />
                      <div>
                        <p className="font-semibold">{employee.Name}</p>
                        <p className="text-sm text-white/80">{employee.JobRole}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{employee.Department}</p>
                    <button
                      onClick={() => openEmployee(employee)}
                      className="mt-3 w-full px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded transition-colors"
                    >
                      View Full Details
                    </button>
                  </div>

                  {/* Personal Development */}
                  <div className="bg-red-500 text-white rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-1">Personal Development Recommendation</h4>
                    <p className="text-xs text-white/90">{employee.personal_development_strategy || 'N/A'}</p>
                  </div>

                  {/* Professional Development */}
                  <div className="bg-gray-500 text-white rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-1">Professional Development Recommendation</h4>
                    <p className="text-xs text-white/90">{employee.professional_development_strategy || 'N/A'}</p>
                  </div>

                  {/* Work Environment */}
                  <div className="bg-green-600 text-white rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-1">Work Environment Recommendation</h4>
                    <p className="text-xs text-white/90">{employee.work_environment_strategy || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overlay for mobile */}
          {filtersOpen && (
            <div className="fixed inset-0 bg-black/30 z-30 lg:z-30" onClick={() => setFiltersOpen(false)} />
          )}

          {/* Filter toggle button (visible when sidebar closed) */}
          {!filtersOpen && (
            <button
              onClick={() => setFiltersOpen(true)}
              className="fixed right-0 top-1/3 z-30 bg-gray-800 text-white px-2 py-3 rounded-l-lg shadow-lg hover:bg-gray-700 transition-colors"
              title="Open Filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}

          {/* Right Sidebar - Filters (collapsible) */}
          <div className={`
            fixed lg:static right-0 top-0 h-full z-40
            w-72 bg-gray-800 text-white p-5 space-y-5
            transform transition-transform duration-300 ease-in-out overflow-y-auto
            ${filtersOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-full'}
          `}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Employee Risk Filters</h3>
              <button onClick={() => setFiltersOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Risk Threshold */}
            <div>
              <p className="text-sm text-gray-300 mb-2">Filter By Attrition Risk</p>
              <div className="flex justify-center mb-2">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={riskThreshold > 50 ? '#ef4444' : riskThreshold > 20 ? '#f59e0b' : '#6b7280'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={251} strokeDashoffset={251 - (riskThreshold / 100) * 251}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{riskThreshold}</span>
                  </div>
                </div>
              </div>
              <input
                type="range" min="0" max="100" value={riskThreshold}
                onChange={e => setRiskThreshold(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Department Filter */}
            <div>
              <p className="text-sm text-gray-300 mb-2">Filter By Department</p>
              <select
                multiple
                value={deptFilter}
                onChange={e => setDeptFilter([...e.target.selectedOptions].map(o => o.value))}
                className="w-full px-2 py-1.5 rounded bg-gray-700 text-sm text-white border border-gray-600 focus:outline-none h-20"
              >
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Job Role Filter */}
            <div>
              <p className="text-sm text-gray-300 mb-2">Filter By Job Role</p>
              <select
                multiple
                value={roleFilter}
                onChange={e => setRoleFilter([...e.target.selectedOptions].map(o => o.value))}
                className="w-full px-2 py-1.5 rounded bg-gray-700 text-sm text-white border border-gray-600 focus:outline-none h-24"
              >
                {jobRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Apply / Reset */}
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-blue-600 rounded text-xs font-medium hover:bg-blue-500">
                Apply
              </button>
              <button
                onClick={() => { setDeptFilter([]); setRoleFilter([]); setRiskThreshold(0); }}
                className="flex-1 px-3 py-2 bg-gray-600 rounded text-xs font-medium hover:bg-gray-500"
              >
                Reset
              </button>
            </div>

            {/* Download */}
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 rounded text-xs text-gray-300 hover:bg-gray-600">
              <Download className="w-3.5 h-3.5" /> Download Employee Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

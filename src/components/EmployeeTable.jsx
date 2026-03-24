import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { formatCurrencyFull } from '../lib/costs';

function RiskBadge({ probability }) {
  const p = (probability || 0) * 100;
  let cls = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (p >= 70) cls = 'bg-red-500/20 text-red-400 border-red-500/30';
  else if (p >= 50) cls = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  else if (p >= 30) cls = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {p.toFixed(1)}%
    </span>
  );
}

export default function EmployeeTable() {
  const { employees, departments, jobRoles, loading } = useData();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [sortKey, setSortKey] = useState('prob_of_attrition');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const perPage = 25;

  const filtered = useMemo(() => {
    let data = [...employees];

    if (search) {
      const s = search.toLowerCase();
      data = data.filter(e =>
        (e.Name || '').toLowerCase().includes(s) ||
        (e.JobRole || '').toLowerCase().includes(s) ||
        (e.Department || '').toLowerCase().includes(s) ||
        String(e.EmployeeNumber).includes(s)
      );
    }
    if (deptFilter) data = data.filter(e => e.Department === deptFilter);
    if (riskFilter === 'high') data = data.filter(e => e.prob_of_attrition >= 0.5);
    else if (riskFilter === 'medium') data = data.filter(e => e.prob_of_attrition >= 0.3 && e.prob_of_attrition < 0.5);
    else if (riskFilter === 'low') data = data.filter(e => e.prob_of_attrition < 0.3);

    data.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [employees, search, deptFilter, riskFilter, sortKey, sortDir]);

  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const columns = [
    { key: 'Name', label: 'Employee', w: 'w-48' },
    { key: 'Department', label: 'Department', w: 'w-40' },
    { key: 'JobRole', label: 'Role', w: 'w-40' },
    { key: 'MonthlyIncome', label: 'Income', w: 'w-28' },
    { key: 'YearsAtCompany', label: 'Tenure', w: 'w-20' },
    { key: 'prob_of_attrition', label: 'Risk', w: 'w-24' },
    { key: 'attrition_cost', label: 'Cost Exposure', w: 'w-32' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Employees</h2>
        <p className="text-sm text-slate-400 mt-1">{filtered.length} employees found</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, role, department..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={riskFilter}
          onChange={e => { setRiskFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Risk Levels</option>
          <option value="high">High Risk (50%+)</option>
          <option value="medium">Medium Risk (30-50%)</option>
          <option value="low">Low Risk (&lt;30%)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${col.w}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {pageData.map(emp => (
                <tr
                  key={emp.EmployeeNumber}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/employees/${emp.EmployeeNumber}`)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{emp.Name}</p>
                      <p className="text-xs text-slate-500">#{emp.EmployeeNumber}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{emp.Department}</td>
                  <td className="px-4 py-3 text-slate-300">{emp.JobRole}</td>
                  <td className="px-4 py-3 text-slate-300">{formatCurrencyFull(emp.MonthlyIncome)}</td>
                  <td className="px-4 py-3 text-slate-300">{emp.YearsAtCompany}y</td>
                  <td className="px-4 py-3"><RiskBadge probability={emp.prob_of_attrition} /></td>
                  <td className="px-4 py-3 text-slate-300">{formatCurrencyFull(emp.attrition_cost || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Showing {page * perPage + 1}-{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

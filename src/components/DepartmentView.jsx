import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  ChevronRight, ChevronDown, Building2, Briefcase, User, Layers,
  AlertTriangle, Users, DollarSign, ArrowLeft, TrendingUp, Shield,
} from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { formatCurrency } from '../lib/costs';
import ExportButton from './ExportButton';

const RISK_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const DEPT_COLORS = { 'Sales': '#3b82f6', 'Research & Development': '#8b5cf6', 'Human Resources': '#06b6d4' };
const DEPT_COLOR_LIST = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b'];

/* ─── Circular Risk Gauge ─── */
function RiskGauge({ pct, size = 80 }) {
  const color = pct >= 20 ? RISK_COLORS.high : pct >= 10 ? RISK_COLORS.medium : RISK_COLORS.low;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        className="transform rotate-90 origin-center" fill={color}
        fontSize={size > 60 ? 16 : 12} fontWeight="bold">
        {pct}%
      </text>
    </svg>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          color === 'blue' ? 'bg-blue-100 text-blue-600' :
          color === 'red' ? 'bg-red-100 text-red-600' :
          color === 'green' ? 'bg-green-100 text-green-600' :
          'bg-purple-100 text-purple-600'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

/* ─── Department Card ─── */
function DepartmentCard({ name, total, atRisk, cost, topRiskEmployees, color, onClick }) {
  const pct = Math.round((atRisk / total) * 100);
  return (
    <button onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-left hover:shadow-md hover:border-blue-300 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="font-semibold text-gray-800">{name}</h3>
          </div>
          <p className="text-xs text-gray-400">{total} employees</p>
        </div>
        <RiskGauge pct={pct} size={64} />
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 rounded-lg p-2.5">
          <p className="text-[10px] text-red-500 font-medium">At Risk</p>
          <p className="text-lg font-bold text-red-600">{atRisk}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2.5">
          <p className="text-[10px] text-purple-500 font-medium">Cost Exposure</p>
          <p className="text-lg font-bold text-purple-600">{formatCurrency(cost)}</p>
        </div>
      </div>

      {/* Risk bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Risk Distribution</span>
          <span>{atRisk} / {total}</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: pct >= 20 ? RISK_COLORS.high : pct >= 10 ? RISK_COLORS.medium : RISK_COLORS.low,
            }}
          />
        </div>
      </div>

      {/* Top risk employees */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1.5">Highest Risk Employees</p>
        <div className="space-y-1">
          {topRiskEmployees.slice(0, 3).map(emp => (
            <div key={emp.EmployeeNumber} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={`https://i.pravatar.cc/32?u=${encodeURIComponent(emp.Name)}`}
                  alt="" className="w-5 h-5 rounded-full object-cover" />
                <span className="text-xs text-gray-600 truncate max-w-[120px]">{emp.Name}</span>
              </div>
              <span className="text-xs font-semibold text-red-500">
                {((emp.prob_of_attrition || 0) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center text-xs text-blue-500 font-medium group-hover:text-blue-700">
        Explore Department <ChevronRight className="w-3.5 h-3.5 ml-1" />
      </div>
    </button>
  );
}

/* ─── Department Detail (drill-down) ─── */
function DepartmentDetail({ dept, employees, onBack }) {
  const deptEmps = useMemo(() => employees.filter(e => e.Department === dept), [employees, dept]);
  const atRiskEmps = useMemo(() => deptEmps.filter(e => e.label === 'Yes'), [deptEmps]);

  const byRole = useMemo(() => {
    const roles = {};
    deptEmps.forEach(e => {
      if (!roles[e.JobRole]) roles[e.JobRole] = { total: 0, atRisk: 0, cost: 0 };
      roles[e.JobRole].total++;
      if (e.label === 'Yes') {
        roles[e.JobRole].atRisk++;
        roles[e.JobRole].cost += e.attrition_cost || 0;
      }
    });
    return Object.entries(roles)
      .map(([name, d]) => ({ name, ...d, safe: d.total - d.atRisk, rate: ((d.atRisk / d.total) * 100).toFixed(1) }))
      .sort((a, b) => b.atRisk - a.atRisk);
  }, [deptEmps]);

  const byFactor = useMemo(() => {
    const factors = [
      { key: 'OverTime', label: 'Overtime' },
      { key: 'BusinessTravel', label: 'Travel' },
      { key: 'WorkLifeBalance', label: 'Work-Life Bal.' },
    ];
    return factors.map(({ key, label }) => {
      const groups = {};
      deptEmps.forEach(e => {
        let val = e[key];
        if (key === 'WorkLifeBalance') val = ['', 'Low', 'Good', 'Better', 'Best'][val] || val;
        if (!groups[val]) groups[val] = { total: 0, atRisk: 0 };
        groups[val].total++;
        if (e.label === 'Yes') groups[val].atRisk++;
      });
      return {
        label,
        data: Object.entries(groups)
          .map(([name, d]) => ({ name, atRisk: d.atRisk, safe: d.total - d.atRisk, rate: d.total > 0 ? ((d.atRisk / d.total) * 100).toFixed(0) : 0 }))
          .sort((a, b) => (b.atRisk + b.safe) - (a.atRisk + a.safe)),
      };
    });
  }, [deptEmps]);

  const topRisk = useMemo(() =>
    [...atRiskEmps].sort((a, b) => (b.prob_of_attrition || 0) - (a.prob_of_attrition || 0)).slice(0, 15),
    [atRiskEmps]
  );

  const totalCost = atRiskEmps.reduce((s, e) => s + (e.attrition_cost || 0), 0);
  const pct = Math.round((atRiskEmps.length / deptEmps.length) * 100);

  return (
    <div className="animate-fade-in">
      {/* Back + Header */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Overview
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${DEPT_COLORS[dept] || '#3b82f6'}20`, color: DEPT_COLORS[dept] || '#3b82f6' }}>
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{dept}</h2>
          <p className="text-sm text-gray-500">{deptEmps.length} employees &middot; {atRiskEmps.length} at risk ({pct}%)</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Headcount" value={deptEmps.length} color="blue" />
        <StatCard icon={AlertTriangle} label="At Risk" value={`${atRiskEmps.length} (${pct}%)`} color="red" />
        <StatCard icon={Briefcase} label="Roles" value={byRole.length} color="green" />
        <StatCard icon={DollarSign} label="Cost Exposure" value={formatCurrency(totalCost)} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '750px' }}>
        {/* Left: Charts stacked - match right column height */}
        <div className="lg:col-span-2 flex flex-col gap-4" style={{ height: '750px' }}>
          {/* Risk by Role */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex-1">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Risk by Role</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={byRole} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={120} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="atRisk" name="At Risk" stackId="a" fill="#ef4444" />
                <Bar dataKey="safe" name="Safe" stackId="a" fill="#60a5fa" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk by Factor - 2-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {byFactor.slice(0, 2).map(({ label, data }) => (
              <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Risk by {label}</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={80} />
                    <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v, name) => [v, name]} />
                    <Bar dataKey="atRisk" name="At Risk" stackId="a" fill="#ef4444" />
                    <Bar dataKey="safe" name="Safe" stackId="a" fill="#60a5fa" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Scrollable top risk employees - same height */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col" style={{ height: '750px' }}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 shrink-0">Highest Risk Employees</h3>
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {topRisk.map((emp, i) => {
              const risk = ((emp.prob_of_attrition || 0) * 100).toFixed(0);
              return (
                <div key={emp.EmployeeNumber}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <img src={`https://i.pravatar.cc/40?u=${encodeURIComponent(emp.Name)}`}
                    alt="" className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{emp.Name}</p>
                    <p className="text-[10px] text-gray-400">{emp.JobRole} &middot; {formatCurrency(emp.attrition_cost || 0)}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    risk >= 80 ? 'bg-red-100 text-red-600' : risk >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {risk}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function DepartmentView() {
  const { employees, loading } = useData();
  const [selectedDept, setSelectedDept] = useState(null);

  const deptData = useMemo(() => {
    const depts = {};
    employees.forEach(e => {
      if (!depts[e.Department]) depts[e.Department] = { total: 0, atRisk: 0, cost: 0, topRisk: [] };
      depts[e.Department].total++;
      if (e.label === 'Yes') {
        depts[e.Department].atRisk++;
        depts[e.Department].cost += e.attrition_cost || 0;
        depts[e.Department].topRisk.push(e);
      }
    });
    // sort top risk employees in each dept
    Object.values(depts).forEach(d => {
      d.topRisk.sort((a, b) => (b.prob_of_attrition || 0) - (a.prob_of_attrition || 0));
    });
    return depts;
  }, [employees]);

  const deptRiskBar = useMemo(() =>
    Object.entries(deptData)
      .map(([name, d]) => ({ name, atRisk: d.atRisk, safe: d.total - d.atRisk, rate: ((d.atRisk / d.total) * 100).toFixed(1) }))
      .sort((a, b) => b.atRisk - a.atRisk),
    [deptData]
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (selectedDept) {
    return (
      <div className="p-6">
        <DepartmentDetail dept={selectedDept} employees={employees} onBack={() => setSelectedDept(null)} />
      </div>
    );
  }

  const totalAtRisk = employees.filter(e => e.label === 'Yes').length;
  const totalCost = employees.filter(e => e.label === 'Yes').reduce((s, e) => s + (e.attrition_cost || 0), 0);
  const orgPct = Math.round((totalAtRisk / employees.length) * 100);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-800">Department Explorer</h2>
        <ExportButton data={employees} filename="department-data" />
      </div>
      <p className="text-sm text-gray-500 mb-5">Click a department card to explore roles, risk, and employees</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Workforce" value={employees.length.toLocaleString()} color="blue" />
        <StatCard icon={AlertTriangle} label="At Risk" value={`${totalAtRisk} (${orgPct}%)`} color="red" />
        <StatCard icon={Building2} label="Departments" value={Object.keys(deptData).length} color="green" />
        <StatCard icon={DollarSign} label="Total Cost Exposure" value={formatCurrency(totalCost)} color="purple" />
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {Object.entries(deptData).sort((a, b) => b[1].atRisk - a[1].atRisk).map(([name, d], i) => (
          <DepartmentCard
            key={name}
            name={name}
            total={d.total}
            atRisk={d.atRisk}
            cost={d.cost}
            topRiskEmployees={d.topRisk}
            color={DEPT_COLORS[name] || DEPT_COLOR_LIST[i % DEPT_COLOR_LIST.length]}
            onClick={() => setSelectedDept(name)}
          />
        ))}
      </div>

      {/* Comparison chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Department Risk Comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={deptRiskBar}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="atRisk" name="At Risk" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="safe" name="Safe" fill="#60a5fa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  Treemap, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  PieChart, Pie,
} from 'recharts';
import { Building2, Users, AlertTriangle, DollarSign, ChevronRight } from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { formatCurrency, formatCurrencyFull } from '../lib/costs';

const DEPT_COLORS = {
  'Sales': '#3b82f6',
  'Research & Development': '#8b5cf6',
  'Human Resources': '#06b6d4',
};

function DeptCard({ name, data, onSelect, selected }) {
  const rate = ((data.atRisk / data.total) * 100).toFixed(1);
  return (
    <button
      onClick={() => onSelect(name)}
      className={`w-full text-left bg-slate-900/50 border rounded-xl p-5 transition-all ${
        selected ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{name}</h3>
        <ChevronRight className={`w-4 h-4 transition-transform ${selected ? 'rotate-90 text-blue-400' : 'text-slate-600'}`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-slate-500">Headcount</p>
          <p className="text-lg font-bold text-white">{data.total}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">At Risk</p>
          <p className="text-lg font-bold text-red-400">{data.atRisk}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Risk Rate</p>
          <p className="text-lg font-bold text-amber-400">{rate}%</p>
        </div>
      </div>
      <div className="mt-3 w-full bg-slate-800 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-red-500 to-amber-500"
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">Cost Exposure: {formatCurrency(data.cost)}</p>
    </button>
  );
}

export default function DepartmentView() {
  const { employees, stats, loading } = useData();
  const [selectedDept, setSelectedDept] = useState(null);

  const deptDetails = useMemo(() => {
    if (!stats) return {};
    return stats.byDept;
  }, [stats]);

  const roleBreakdown = useMemo(() => {
    if (!selectedDept) return [];
    const deptEmployees = employees.filter(e => e.Department === selectedDept);
    const byRole = {};
    deptEmployees.forEach(e => {
      if (!byRole[e.JobRole]) byRole[e.JobRole] = { total: 0, atRisk: 0, cost: 0 };
      byRole[e.JobRole].total++;
      if (e.label === 'Yes') {
        byRole[e.JobRole].atRisk++;
        byRole[e.JobRole].cost += e.attrition_cost || 0;
      }
    });
    return Object.entries(byRole)
      .map(([name, d]) => ({
        name,
        total: d.total,
        atRisk: d.atRisk,
        safe: d.total - d.atRisk,
        rate: d.total > 0 ? ((d.atRisk / d.total) * 100).toFixed(1) : '0',
        cost: d.cost,
      }))
      .sort((a, b) => b.atRisk - a.atRisk);
  }, [employees, selectedDept]);

  const treemapData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byDept).map(([name, d]) => ({
      name,
      size: d.total,
      atRisk: d.atRisk,
      color: DEPT_COLORS[name] || '#6366f1',
    }));
  }, [stats]);

  const pieData = useMemo(() => {
    if (!selectedDept || !roleBreakdown.length) return [];
    return roleBreakdown.map(r => ({
      name: r.name,
      value: r.total,
      atRisk: r.atRisk,
    }));
  }, [selectedDept, roleBreakdown]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Department Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Organizational risk breakdown by department and role</p>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(deptDetails).map(([name, data]) => (
          <DeptCard
            key={name}
            name={name}
            data={data}
            selected={selectedDept === name}
            onSelect={d => setSelectedDept(selectedDept === d ? null : d)}
          />
        ))}
      </div>

      {/* Treemap */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Workforce Composition</h3>
        <ResponsiveContainer width="100%" height={200}>
          <Treemap
            data={treemapData}
            dataKey="size"
            nameKey="name"
            stroke="#0f172a"
            strokeWidth={2}
            content={({ x, y, width, height, name, size, atRisk }) => {
              if (width < 40 || height < 30) return null;
              return (
                <g>
                  <rect x={x} y={y} width={width} height={height} fill={DEPT_COLORS[name] || '#6366f1'} fillOpacity={0.3} rx={4} />
                  <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="white" fontSize={12} fontWeight="600">
                    {name}
                  </text>
                  <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#94a3b8" fontSize={10}>
                    {size} employees &middot; {atRisk} at risk
                  </text>
                </g>
              );
            }}
          />
        </ResponsiveContainer>
      </div>

      {/* Department Drill-down */}
      {selectedDept && roleBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">{selectedDept} - Role Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleBreakdown} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={150} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="atRisk" name="At Risk" stackId="a" fill="#ef4444" />
                <Bar dataKey="safe" name="Safe" stackId="a" fill="#1e293b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">{selectedDept} - Role Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name.split(' ').slice(0, 2).join(' ')} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#475569' }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'][i % 6]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                  formatter={(val, name, props) => [`${val} (${props.payload.atRisk} at risk)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

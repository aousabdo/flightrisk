import { useMemo, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
  AreaChart, Area,
} from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { formatCurrency, formatCurrencyFull } from '../lib/costs';

function MetricCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    red: 'border-red-500/30 text-red-400',
    blue: 'border-blue-500/30 text-blue-400',
    purple: 'border-purple-500/30 text-purple-400',
    amber: 'border-amber-500/30 text-amber-400',
  };
  return (
    <div className={`bg-slate-900/50 border ${colorMap[color]} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function CostAnalysis() {
  const { employees, stats, loading } = useData();
  const [hoveredEmployee, setHoveredEmployee] = useState(null);

  const scatterData = useMemo(() =>
    employees
      .filter(e => e.label === 'Yes')
      .map(e => ({
        x: e.employee_score || 50,
        y: e.attrition_cost || 0,
        prob: e.prob_of_attrition || 0,
        name: e.Name,
        dept: e.Department,
        role: e.JobRole,
        income: e.MonthlyIncome,
        z: ((e.prob_of_attrition || 0) * 30) + 5,
      })),
    [employees]
  );

  const costByDept = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byDept)
      .map(([name, d]) => ({
        name,
        cost: d.cost,
        avgCost: d.atRisk > 0 ? d.cost / d.atRisk : 0,
        atRisk: d.atRisk,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [stats]);

  const costBuckets = useMemo(() => {
    const atRisk = employees.filter(e => e.label === 'Yes');
    const buckets = [
      { name: '$0-50K', min: 0, max: 50000, count: 0, total: 0 },
      { name: '$50-100K', min: 50000, max: 100000, count: 0, total: 0 },
      { name: '$100-150K', min: 100000, max: 150000, count: 0, total: 0 },
      { name: '$150-200K', min: 150000, max: 200000, count: 0, total: 0 },
      { name: '$200K+', min: 200000, max: Infinity, count: 0, total: 0 },
    ];
    atRisk.forEach(e => {
      const c = e.attrition_cost || 0;
      const bucket = buckets.find(b => c >= b.min && c < b.max);
      if (bucket) { bucket.count++; bucket.total += c; }
    });
    return buckets;
  }, [employees]);

  const incomeVsRisk = useMemo(() => {
    const buckets = {};
    employees.forEach(e => {
      const range = Math.floor(e.MonthlyIncome / 2000) * 2000;
      const label = `$${(range / 1000).toFixed(0)}K`;
      if (!buckets[label]) buckets[label] = { name: label, sort: range, total: 0, atRisk: 0 };
      buckets[label].total++;
      if (e.label === 'Yes') buckets[label].atRisk++;
    });
    return Object.values(buckets)
      .sort((a, b) => a.sort - b.sort)
      .map(b => ({ ...b, rate: b.total > 0 ? (b.atRisk / b.total) * 100 : 0 }));
  }, [employees]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const totalCostAtRisk = scatterData.reduce((s, d) => s + d.y, 0);
  const highValueRisk = scatterData.filter(d => d.x > 70 && d.prob > 0.5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Cost Analysis</h2>
        <p className="text-sm text-slate-400 mt-1">Financial impact of employee attrition</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Total Cost Exposure"
          value={formatCurrency(totalCostAtRisk)}
          sub={`${scatterData.length} employees at risk`}
          color="red"
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Cost per Exit"
          value={formatCurrency(scatterData.length > 0 ? totalCostAtRisk / scatterData.length : 0)}
          sub="Per at-risk employee"
          color="purple"
        />
        <MetricCard
          icon={AlertTriangle}
          label="High-Value Risk"
          value={highValueRisk.length}
          sub="Score >70 & risk >50%"
          color="amber"
        />
        <MetricCard
          icon={Users}
          label="Max Individual Cost"
          value={formatCurrency(Math.max(...scatterData.map(d => d.y), 0))}
          sub="Highest single cost exposure"
          color="blue"
        />
      </div>

      {/* Scatter Plot */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Employee Value vs Attrition Cost</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ bottom: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="x" name="Employee Score" stroke="#64748b" fontSize={11}
              label={{ value: 'Employee Score', position: 'bottom', fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              dataKey="y" name="Attrition Cost" stroke="#64748b" fontSize={11}
              tickFormatter={v => formatCurrency(v)}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
                    <p className="font-semibold text-white text-sm">{d?.name}</p>
                    <p className="text-slate-400">{d?.role} &middot; {d?.dept}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-red-400">Risk: {((d?.prob || 0) * 100).toFixed(0)}%</p>
                      <p className="text-purple-400">Cost: {formatCurrencyFull(d?.y || 0)}</p>
                      <p className="text-blue-400">Score: {(d?.x || 0).toFixed(1)}</p>
                      <p className="text-emerald-400">Income: {formatCurrencyFull(d?.income || 0)}/mo</p>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter data={scatterData} fillOpacity={0.6}>
              {scatterData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.prob >= 0.7 ? '#ef4444' : entry.prob >= 0.5 ? '#f59e0b' : '#3b82f6'}
                  r={Math.max(4, entry.z / 5)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-2">
          <span className="flex items-center gap-2 text-xs text-slate-400"><span className="w-3 h-3 rounded-full bg-red-500" /> Critical (&ge;70%)</span>
          <span className="flex items-center gap-2 text-xs text-slate-400"><span className="w-3 h-3 rounded-full bg-amber-500" /> High (50-70%)</span>
          <span className="flex items-center gap-2 text-xs text-slate-400"><span className="w-3 h-3 rounded-full bg-blue-500" /> Moderate (&lt;50%)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost by Department */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Cost Exposure by Department</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={costByDept}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => formatCurrency(v)} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => [formatCurrencyFull(v), name]}
              />
              <Bar dataKey="cost" name="Total Cost" radius={[4, 4, 0, 0]}>
                {costByDept.map((_, i) => (
                  <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#06b6d4'][i % 3]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Distribution */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Cost Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={costBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => {
                  if (name === 'Total Cost') return [formatCurrencyFull(v), name];
                  return [v, name];
                }}
              />
              <Bar dataKey="count" name="Employees" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Income vs Risk Rate */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Attrition Rate by Income Bracket</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={incomeVsRisk}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `${v.toFixed(0)}%`} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
              formatter={(v, name) => [`${v.toFixed(1)}%`, 'Attrition Rate']}
            />
            <Area type="monotone" dataKey="rate" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

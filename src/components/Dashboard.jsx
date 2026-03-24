import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
  CartesianGrid, Legend,
} from 'recharts';
import { Users, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { formatCurrency } from '../lib/costs';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#ec4899'];

function KpiCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/30 text-red-400',
    green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-5 h-5 opacity-80" />
        <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-xl p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { employees, stats, loading } = useData();
  const navigate = useNavigate();

  const deptData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byDept)
      .map(([name, d]) => ({
        name: name.length > 15 ? name.slice(0, 15) + '...' : name,
        fullName: name,
        'At Risk': d.atRisk,
        'Safe': d.total - d.atRisk,
        rate: ((d.atRisk / d.total) * 100).toFixed(1),
      }))
      .sort((a, b) => b['At Risk'] - a['At Risk']);
  }, [stats]);

  const roleData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byRole)
      .map(([name, d]) => ({
        name: name.length > 20 ? name.slice(0, 20) + '...' : name,
        fullName: name,
        atRisk: d.atRisk,
        total: d.total,
        rate: ((d.atRisk / d.total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.atRisk - a.atRisk)
      .slice(0, 8);
  }, [stats]);

  const riskDistribution = useMemo(() => {
    if (!employees.length) return [];
    const buckets = [
      { name: '0-10%', min: 0, max: 0.1, count: 0 },
      { name: '10-20%', min: 0.1, max: 0.2, count: 0 },
      { name: '20-30%', min: 0.2, max: 0.3, count: 0 },
      { name: '30-50%', min: 0.3, max: 0.5, count: 0 },
      { name: '50-70%', min: 0.5, max: 0.7, count: 0 },
      { name: '70-100%', min: 0.7, max: 1.01, count: 0 },
    ];
    employees.forEach(e => {
      const p = e.prob_of_attrition || 0;
      const bucket = buckets.find(b => p >= b.min && p < b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [employees]);

  const scatterData = useMemo(() => {
    return employees
      .filter(e => e.label === 'Yes')
      .map(e => ({
        x: e.employee_score || 50,
        y: e.attrition_cost || 0,
        name: e.Name,
        prob: e.prob_of_attrition,
        dept: e.Department,
      }));
  }, [employees]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-slate-400 mt-1">Employee attrition risk overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <KpiCard
          icon={Users}
          label="Total Employees"
          value={stats?.total?.toLocaleString()}
          sub={`${stats?.atRiskCount} predicted to leave`}
          color="blue"
        />
        <KpiCard
          icon={AlertTriangle}
          label="At-Risk Employees"
          value={stats?.atRiskCount}
          sub={`${((stats?.atRiskCount / stats?.total) * 100).toFixed(1)}% of workforce`}
          color="red"
        />
        <KpiCard
          icon={DollarSign}
          label="Total Cost Exposure"
          value={formatCurrency(stats?.totalCost || 0)}
          sub="If all at-risk employees leave"
          color="purple"
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg. Risk Score"
          value={`${((stats?.avgProb || 0) * 100).toFixed(1)}%`}
          sub="Across all employees"
          color="green"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Attrition Risk by Department">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={120} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => [val, name]}
                labelFormatter={(label) => deptData.find(d => d.name === label)?.fullName || label}
              />
              <Bar dataKey="At Risk" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Safe" stackId="a" fill="#1e293b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                {riskDistribution.map((entry, i) => (
                  <Cell key={i} fill={i < 3 ? '#3b82f6' : i < 4 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top Roles by Attrition Risk">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={roleData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={140} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name, props) => [`${val} (${props.payload.rate}%)`, 'At Risk']}
              />
              <Bar dataKey="atRisk" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cost vs Employee Value (At-Risk Only)">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="x" name="Employee Score" stroke="#64748b" fontSize={11}
                label={{ value: 'Employee Score', position: 'bottom', fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="y" name="Attrition Cost" stroke="#64748b" fontSize={11}
                tickFormatter={v => formatCurrency(v)} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => {
                  if (name === 'Attrition Cost') return [formatCurrency(val), name];
                  return [typeof val === 'number' ? val.toFixed(1) : val, name];
                }}
                labelFormatter={() => ''}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs">
                      <p className="font-semibold text-white">{d?.name}</p>
                      <p className="text-slate-400">{d?.dept}</p>
                      <p className="text-red-400 mt-1">Risk: {((d?.prob || 0) * 100).toFixed(0)}%</p>
                      <p className="text-purple-400">Cost: {formatCurrency(d?.y || 0)}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData} fill="#f59e0b" fillOpacity={0.6} r={5} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

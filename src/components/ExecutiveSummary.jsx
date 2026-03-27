import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, AlertTriangle, DollarSign, TrendingUp,
  Briefcase, Clock, MapPin, Award, ArrowRight, Sparkles, Printer,
  Database, Upload as UploadIcon,
} from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts';
import { useData } from '../hooks/useEmployees';
import { formatCurrency } from '../lib/costs';
import { CHART, RISK, CATEGORICAL } from '../lib/colors';
import { DepartmentSkeleton } from './Skeletons';
import InsightEngine from './InsightEngine';
import ExecutiveReport from './ExecutiveReport';

const RISK_BUCKETS = [
  { key: 'critical', label: 'Critical', min: 0.7, color: RISK.critical },
  { key: 'high', label: 'High', min: 0.5, color: '#f97316' },
  { key: 'medium', label: 'Medium', min: 0.3, color: RISK.medium },
  { key: 'low', label: 'Low', min: 0, color: RISK.low },
];

function getRiskColor(prob) {
  if (prob >= 0.7) return RISK.critical;
  if (prob >= 0.5) return '#f97316';
  if (prob >= 0.3) return RISK.medium;
  return RISK.low;
}

function getRiskLabel(prob) {
  if (prob >= 0.7) return 'Critical';
  if (prob >= 0.5) return 'High';
  if (prob >= 0.3) return 'Medium';
  return 'Low';
}

/* ─── KPI Card ─── */
function KPICard({ icon: Icon, label, value, subtitle, accent, iconBg }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${accent}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ─── Generate Smart Actions ─── */
function generateActions(employees) {
  const atRisk = employees.filter(e => e.label === 'Yes');
  const actions = [];

  // 1. Overtime analysis per department
  const deptOvertime = {};
  atRisk.forEach(e => {
    if (e.OverTime === 'Yes') {
      if (!deptOvertime[e.Department]) deptOvertime[e.Department] = 0;
      deptOvertime[e.Department]++;
    }
  });
  const topOvertimeDept = Object.entries(deptOvertime).sort((a, b) => b[1] - a[1])[0];
  if (topOvertimeDept && topOvertimeDept[1] >= 2) {
    actions.push({
      icon: Clock,
      title: `Address overtime in ${topOvertimeDept[0]}`,
      description: `${topOvertimeDept[1]} at-risk employees work overtime in ${topOvertimeDept[0]}`,
      impact: 'High',
    });
  }

  // 2. Compensation analysis per role
  const roleIncomes = {};
  atRisk.forEach(e => {
    if (!roleIncomes[e.JobRole]) roleIncomes[e.JobRole] = [];
    roleIncomes[e.JobRole].push(e.MonthlyIncome);
  });
  const allRoleMedians = {};
  employees.forEach(e => {
    if (!allRoleMedians[e.JobRole]) allRoleMedians[e.JobRole] = [];
    allRoleMedians[e.JobRole].push(e.MonthlyIncome);
  });
  Object.keys(allRoleMedians).forEach(role => {
    const sorted = allRoleMedians[role].sort((a, b) => a - b);
    allRoleMedians[role] = sorted[Math.floor(sorted.length / 2)];
  });
  const underpaidRoles = [];
  Object.entries(roleIncomes).forEach(([role, incomes]) => {
    const belowMedian = incomes.filter(i => i < allRoleMedians[role]).length;
    if (belowMedian >= 3) {
      underpaidRoles.push({ role, count: belowMedian });
    }
  });
  underpaidRoles.sort((a, b) => b.count - a.count);
  if (underpaidRoles.length > 0) {
    const top = underpaidRoles[0];
    actions.push({
      icon: DollarSign,
      title: `Review compensation for ${top.role}s`,
      description: `${top.count} at-risk ${top.role}s earn below the median for their role`,
      impact: 'High',
    });
  }

  // 3. Cluster detection (>3 at-risk in same dept+role)
  const clusters = {};
  atRisk.forEach(e => {
    const key = `${e.Department}|${e.JobRole}`;
    if (!clusters[key]) clusters[key] = 0;
    clusters[key]++;
  });
  Object.entries(clusters)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .forEach(([key, count]) => {
      const [dept, role] = key.split('|');
      actions.push({
        icon: Users,
        title: `Investigate cluster in ${dept}`,
        description: `${count} ${role}s in ${dept} are at risk — possible systemic issue`,
        impact: 'Critical',
      });
    });

  // 4. Travel burden
  const travelAtRisk = atRisk.filter(e => e.BusinessTravel === 'Travel_Frequently').length;
  if (travelAtRisk >= 3) {
    actions.push({
      icon: MapPin,
      title: 'Reduce frequent travel burden',
      description: `${travelAtRisk} at-risk employees travel frequently — consider remote options`,
      impact: 'Medium',
    });
  }

  // 5. Low work-life balance
  const lowWLB = atRisk.filter(e => e.WorkLifeBalance <= 2).length;
  if (lowWLB >= 3) {
    actions.push({
      icon: Award,
      title: 'Improve work-life balance programs',
      description: `${lowWLB} at-risk employees report low work-life balance scores`,
      impact: 'Medium',
    });
  }

  return actions.slice(0, 5);
}

/* ─── Custom Tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 shadow-lg border border-gray-200 rounded-lg text-sm">
      <p className="font-medium text-gray-800">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600">
          {p.name}: {typeof p.value === 'number' && p.name?.includes('Cost') ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function formatDateShort(isoString) {
  if (!isoString) return 'Mar 27, 2026';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return 'Mar 27, 2026';
  }
}

export default function ExecutiveSummary() {
  const { employees, loading, stats, dataSource, uploadDate } = useData();
  const [showReport, setShowReport] = useState(false);

  const derived = useMemo(() => {
    if (!employees.length || !stats) return null;

    const atRisk = employees.filter(e => e.label === 'Yes');
    const totalCost = atRisk.reduce((sum, e) => sum + (e.attrition_cost || 0), 0);
    const avgRisk = employees.reduce((sum, e) => sum + (e.prob_of_attrition || 0), 0) / employees.length;

    // Risk buckets
    const buckets = RISK_BUCKETS.map(b => ({ ...b, count: 0 }));
    employees.forEach(e => {
      const p = e.prob_of_attrition || 0;
      if (p >= 0.7) buckets[0].count++;
      else if (p >= 0.5) buckets[1].count++;
      else if (p >= 0.3) buckets[2].count++;
      else buckets[3].count++;
    });

    // Department data
    const deptData = Object.entries(stats.byDept)
      .map(([name, d]) => ({
        name: name.length > 18 ? name.slice(0, 16) + '...' : name,
        fullName: name,
        atRisk: d.atRisk,
        total: d.total,
        cost: d.cost,
      }))
      .sort((a, b) => b.atRisk - a.atRisk);

    // Top 10 high risk employees
    const topRisk = [...employees]
      .sort((a, b) => (b.prob_of_attrition || 0) - (a.prob_of_attrition || 0))
      .slice(0, 10);

    // Actions
    const actions = generateActions(employees);

    // Donut data for cost by dept
    const costDonut = Object.entries(stats.byDept)
      .filter(([, d]) => d.cost > 0)
      .map(([name, d], i) => ({
        name: name.length > 20 ? name.slice(0, 18) + '...' : name,
        value: d.cost,
        fill: CATEGORICAL[i % CATEGORICAL.length],
      }))
      .sort((a, b) => b.value - a.value);

    return {
      atRiskCount: atRisk.length,
      totalCost,
      avgRisk,
      buckets,
      deptData,
      topRisk,
      actions,
      costDonut,
    };
  }, [employees, stats]);

  if (loading || !derived) return <DepartmentSkeleton />;

  const { atRiskCount, totalCost, avgRisk, buckets, deptData, topRisk, actions, costDonut } = derived;

  const totalEmployees = employees.length;
  const atRiskPct = ((atRiskCount / totalEmployees) * 100).toFixed(1);
  const avgRiskPct = (avgRisk * 100).toFixed(1);

  return (
    <div className="p-6 animate-fade-in space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Executive Summary</h1>
          <p className="text-sm text-gray-500 mt-1">Organization-wide flight risk overview and recommended actions</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Database className="w-3 h-3" />
            Updated: {formatDateShort(dataSource === 'uploaded' ? uploadDate : null)}
          </span>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Generate Executive Report
          </button>
        </div>
      </div>

      {/* Sample data banner */}
      {dataSource === 'default' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-800">Using Sample Data</span>
          </div>
          <Link
            to="/upload"
            className="flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            <UploadIcon className="w-3.5 h-3.5" />
            Upload your own data
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div data-tour="kpi-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="Total Workforce"
          value={<AnimatedCounter value={totalEmployees} />}
          subtitle={`Across ${Object.keys(stats.byDept).length} departments`}
          accent="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          icon={AlertTriangle}
          label="At-Risk Employees"
          value={<AnimatedCounter value={atRiskCount} />}
          subtitle={`${atRiskPct}% of total workforce`}
          accent="text-red-600"
          iconBg="bg-red-50"
        />
        <KPICard
          icon={DollarSign}
          label="Total Cost Exposure"
          value={
            totalCost >= 1000000
              ? <AnimatedCounter value={parseFloat((totalCost / 1000000).toFixed(1))} prefix="$" suffix="M" decimals={1} />
              : totalCost >= 1000
                ? <AnimatedCounter value={Math.round(totalCost / 1000)} prefix="$" suffix="K" />
                : <AnimatedCounter value={Math.round(totalCost)} prefix="$" />
          }
          subtitle="If all at-risk employees leave"
          accent="text-orange-600"
          iconBg="bg-orange-50"
        />
        <KPICard
          icon={TrendingUp}
          label="Avg Risk Score"
          value={<AnimatedCounter value={parseFloat(avgRiskPct)} suffix="%" decimals={1} />}
          subtitle={avgRisk >= 0.3 ? 'Elevated - action needed' : 'Within acceptable range'}
          accent={avgRisk >= 0.3 ? 'text-amber-600' : 'text-green-600'}
          iconBg={avgRisk >= 0.3 ? 'bg-amber-50' : 'bg-green-50'}
        />
      </div>

      {/* AI-Generated Insights */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-gray-800">AI-Generated Insights</h2>
        </div>
        <InsightEngine employees={employees} />
      </div>

      {/* Middle section: Risk Distribution + Top Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Risk Distribution</h2>
          <div className="space-y-3">
            {buckets.map(b => {
              const pct = ((b.count / totalEmployees) * 100).toFixed(1);
              return (
                <div key={b.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{b.label}</span>
                    <span className="text-sm text-gray-500">{b.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: b.color, minWidth: b.count > 0 ? '20px' : 0 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: RISK.low }} /> Low
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: RISK.medium }} /> Medium
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} /> High
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: RISK.critical }} /> Critical
          </div>
        </div>

        {/* Top 5 Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Actions Needed</h2>
          {actions.length === 0 ? (
            <p className="text-sm text-gray-400">No urgent actions detected.</p>
          ) : (
            <div className="space-y-3">
              {actions.map((a, i) => {
                const ActionIcon = a.icon;
                const impactColors = {
                  Critical: 'bg-red-100 text-red-700',
                  High: 'bg-orange-100 text-orange-700',
                  Medium: 'bg-yellow-100 text-yellow-700',
                };
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                      <ActionIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${impactColors[a.impact] || 'bg-gray-100 text-gray-600'}`}>
                          {a.impact}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-2" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: Dept Risk, Top 10, Cost Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Department Risk Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Department Risk Overview</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="atRisk" name="At Risk" radius={[0, 4, 4, 0]} barSize={16}>
                {deptData.map((d, i) => (
                  <Cell key={i} fill={CHART.atRisk} />
                ))}
              </Bar>
              <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]} barSize={16}>
                {deptData.map((d, i) => (
                  <Cell key={i} fill={CHART.safe} fillOpacity={0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent High Risk */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Top High-Risk Employees</h2>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {topRisk.map(emp => {
              const risk = ((emp.prob_of_attrition || 0) * 100).toFixed(0);
              const color = getRiskColor(emp.prob_of_attrition || 0);
              const label = getRiskLabel(emp.prob_of_attrition || 0);
              return (
                <div key={emp.EmployeeNumber} className="flex items-center gap-2.5 py-1.5">
                  <img
                    src={`https://i.pravatar.cc/32?u=${encodeURIComponent(emp.Name)}`}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{emp.Name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{emp.JobRole}</p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: `${color}18`,
                      color: color,
                    }}
                  >
                    {risk}% {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost by Department */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Cost by Department</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={costDonut}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {costDonut.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value) => <span className="text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Executive Report Modal */}
      {showReport && <ExecutiveReport onClose={() => setShowReport(false)} />}
    </div>
  );
}

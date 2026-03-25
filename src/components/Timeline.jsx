import { useMemo } from 'react';
import {
  Clock, AlertTriangle, TrendingUp, Users,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, AreaChart, Area, ReferenceLine,
} from 'recharts';
import { useData } from '../hooks/useEmployees';
import { CHART, CATEGORICAL, RISK } from '../lib/colors';
import { DepartmentSkeleton } from './Skeletons';

const TENURE_BUCKETS = [
  { key: '0-1yr', label: '0-1 yr', min: 0, max: 1 },
  { key: '1-2yr', label: '1-2 yr', min: 1, max: 2 },
  { key: '2-3yr', label: '2-3 yr', min: 2, max: 3 },
  { key: '3-5yr', label: '3-5 yr', min: 3, max: 5 },
  { key: '5-10yr', label: '5-10 yr', min: 5, max: 10 },
  { key: '10+yr', label: '10+ yr', min: 10, max: 999 },
];

function getRiskColor(prob) {
  if (prob >= 0.5) return RISK.critical;
  if (prob >= 0.2) return RISK.medium;
  return RISK.low;
}

function getRiskBadge(prob) {
  const pct = (prob * 100).toFixed(0);
  if (prob >= 0.5) return { text: `${pct}%`, bg: 'bg-red-100 text-red-700' };
  if (prob >= 0.2) return { text: `${pct}%`, bg: 'bg-amber-100 text-amber-700' };
  return { text: `${pct}%`, bg: 'bg-green-100 text-green-700' };
}

/* ─── Tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 shadow-lg border border-gray-200 rounded-lg text-sm">
      <p className="font-medium text-gray-800">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke }}>
          {p.name}: {typeof p.value === 'number' ? `${(p.value * 100).toFixed(1)}%` : p.value}
        </p>
      ))}
    </div>
  );
}

function HeatmapTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 shadow-lg border border-gray-200 rounded-lg text-sm">
      <p className="font-medium text-gray-800">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600">
          {p.name}: {typeof p.value === 'number' ? `${(p.value * 100).toFixed(1)}%` : p.value}
        </p>
      ))}
    </div>
  );
}

function heatColor(value) {
  if (value >= 0.5) return '#dc2626';
  if (value >= 0.35) return '#f97316';
  if (value >= 0.2) return '#f59e0b';
  if (value >= 0.1) return '#fcd34d';
  return '#22c55e';
}

export default function Timeline() {
  const { employees, loading, departments } = useData();

  const derived = useMemo(() => {
    if (!employees.length) return null;

    // Group employees into tenure buckets
    const bucketedEmployees = {};
    TENURE_BUCKETS.forEach(b => { bucketedEmployees[b.key] = []; });
    employees.forEach(e => {
      const years = e.YearsAtCompany || 0;
      const bucket = TENURE_BUCKETS.find(b => years >= b.min && years < b.max);
      if (bucket) bucketedEmployees[bucket.key].push(e);
    });

    // Section 1: Risk Trend by Department
    const deptColors = {};
    departments.forEach((d, i) => { deptColors[d] = CATEGORICAL[i % CATEGORICAL.length]; });

    const riskTrend = TENURE_BUCKETS.map(b => {
      const row = { name: b.label };
      departments.forEach(dept => {
        const deptEmps = bucketedEmployees[b.key].filter(e => e.Department === dept);
        row[dept] = deptEmps.length > 0
          ? deptEmps.reduce((s, e) => s + (e.prob_of_attrition || 0), 0) / deptEmps.length
          : null;
      });
      return row;
    });

    // Section 2: Tenure Risk Curve (overall)
    const tenureCurve = TENURE_BUCKETS.map(b => {
      const emps = bucketedEmployees[b.key];
      const avg = emps.length > 0
        ? emps.reduce((s, e) => s + (e.prob_of_attrition || 0), 0) / emps.length
        : 0;
      return { name: b.label, avgRisk: avg, count: emps.length };
    });

    // Identify peaks
    const peaks = [];
    tenureCurve.forEach((p, i) => {
      const prev = i > 0 ? tenureCurve[i - 1].avgRisk : 0;
      const next = i < tenureCurve.length - 1 ? tenureCurve[i + 1].avgRisk : 0;
      if (p.avgRisk > prev && p.avgRisk > next && p.avgRisk > 0.15) {
        peaks.push({ name: p.name, value: p.avgRisk });
      }
    });

    // Section 3: New hires (<=1yr)
    const newHires = employees
      .filter(e => (e.YearsAtCompany || 0) <= 1)
      .sort((a, b) => (b.prob_of_attrition || 0) - (a.prob_of_attrition || 0));
    const elevatedNewHires = newHires.filter(e => (e.prob_of_attrition || 0) >= 0.2);

    // Section 4: Heatmap data (dept x tenure)
    const heatmapData = {};
    departments.forEach(dept => {
      heatmapData[dept] = {};
      TENURE_BUCKETS.forEach(b => {
        const emps = bucketedEmployees[b.key].filter(e => e.Department === dept);
        heatmapData[dept][b.key] = emps.length > 0
          ? emps.reduce((s, e) => s + (e.prob_of_attrition || 0), 0) / emps.length
          : 0;
      });
    });

    return { riskTrend, tenureCurve, peaks, newHires, elevatedNewHires, heatmapData, deptColors };
  }, [employees, departments]);

  if (loading || !derived) return <DepartmentSkeleton />;

  const { riskTrend, tenureCurve, peaks, newHires, elevatedNewHires, heatmapData, deptColors } = derived;

  return (
    <div className="p-6 animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Flight Risk Timeline</h1>
        <p className="text-sm text-gray-500 mt-1">Track attrition risk trends by tenure and department</p>
      </div>

      {/* Section 1: Risk Trend by Department */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Risk Trend by Tenure</h2>
        <p className="text-sm text-gray-500 mb-4">Average risk score across tenure buckets, by department</p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={riskTrend} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              domain={[0, 'auto']}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            {departments.map((dept, i) => (
              <Line
                key={dept}
                type="monotone"
                dataKey={dept}
                name={dept}
                stroke={deptColors[dept]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Section 2: Tenure Risk Curve */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Tenure Risk Curve</h2>
        <p className="text-sm text-gray-500 mb-4">
          How risk evolves with tenure
          {peaks.length > 0 && (
            <span className="ml-2 text-amber-600 font-medium">
              Risk peaks at {peaks.map(p => p.name).join(' and ')}
            </span>
          )}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={tenureCurve} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              domain={[0, 'auto']}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="avgRisk"
              name="Avg Risk"
              stroke={CHART.primary}
              fill={CHART.primary}
              fillOpacity={0.15}
              strokeWidth={2}
            />
            {peaks.map((peak, i) => (
              <ReferenceLine
                key={i}
                x={peak.name}
                stroke={RISK.critical}
                strokeDasharray="4 4"
                label={{
                  value: `Peak: ${(peak.value * 100).toFixed(0)}%`,
                  position: 'top',
                  fill: RISK.critical,
                  fontSize: 11,
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Section 3: New Hire Early Warning */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">New Hire Early Warning</h2>
            <p className="text-sm text-gray-500">Employees with 1 year or less tenure, sorted by risk</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-amber-700">
              <span className="font-bold text-lg text-amber-800">{elevatedNewHires.length}</span> of{' '}
              <span className="font-medium">{newHires.length}</span> new hires
            </p>
            <p className="text-[10px] text-amber-600">
              ({newHires.length > 0 ? ((elevatedNewHires.length / newHires.length) * 100).toFixed(0) : 0}%) show elevated risk
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto pr-1">
          {newHires.slice(0, 15).map(emp => {
            const badge = getRiskBadge(emp.prob_of_attrition || 0);
            return (
              <div
                key={emp.EmployeeNumber}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <img
                  src={`https://i.pravatar.cc/32?u=${encodeURIComponent(emp.Name)}`}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{emp.Name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{emp.JobRole} &middot; {emp.Department}</p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${badge.bg}`}>
                  {badge.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Seasonal Patterns Heatmap */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Risk Heatmap: Department vs. Tenure</h2>
        <p className="text-sm text-gray-500 mb-4">Shows where risk clusters by department and tenure bracket</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-gray-600 font-medium border-b border-gray-200">Department</th>
                {TENURE_BUCKETS.map(b => (
                  <th key={b.key} className="text-center py-2 px-3 text-gray-600 font-medium border-b border-gray-200">{b.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(heatmapData).map(([dept, buckets]) => (
                <tr key={dept} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-2 px-3 font-medium text-gray-700 whitespace-nowrap">{dept}</td>
                  {TENURE_BUCKETS.map(b => {
                    const val = buckets[b.key];
                    return (
                      <td key={b.key} className="py-2 px-3 text-center">
                        <div
                          className="mx-auto w-14 h-8 rounded flex items-center justify-center text-xs font-semibold"
                          style={{
                            backgroundColor: `${heatColor(val)}22`,
                            color: heatColor(val),
                          }}
                          title={`${dept} / ${b.label}: ${(val * 100).toFixed(1)}%`}
                        >
                          {(val * 100).toFixed(0)}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
          <span>Risk level:</span>
          {[
            { label: 'Low', color: '#22c55e' },
            { label: 'Moderate', color: '#fcd34d' },
            { label: 'Elevated', color: '#f59e0b' },
            { label: 'High', color: '#f97316' },
            { label: 'Critical', color: '#dc2626' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

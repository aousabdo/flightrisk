import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
  LineChart, Line,
} from 'recharts';
import { useData } from '../hooks/useEmployees';
import { formatCurrency } from '../lib/costs';
import ExportButton from './ExportButton';
import { InsightsSkeleton } from './Skeletons';

const COLORS = ['#2196F3', '#FF5722', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#795548', '#607D8B'];
const DEPT_COLORS = { 'Research & Development': '#4CAF50', 'Sales': '#FF9800', 'Human Resources': '#2196F3' };

function DonutChart({ data, title }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v, name) => [v, name]} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function HBarChart({ data, title, dataKey = 'value', nameKey = 'name' }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" stroke="#9ca3af" fontSize={11} tickFormatter={v => `${v}%`} />
          <YAxis dataKey={nameKey} type="category" stroke="#9ca3af" fontSize={10} width={130} />
          <Tooltip contentStyle={{ fontSize: 12 }} formatter={v => [`${v}%`, '% Employees']} />
          <Bar dataKey={dataKey} fill="#2196F3" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const TAB_LIST = [
  { key: 'current', label: 'Attrition at Company Current Status' },
  { key: 'predicted', label: 'Predicted Attrition: Current Employees' },
  { key: 'analysis', label: 'Predicted Employee Attrition Analysis' },
  { key: 'cohort', label: 'Cohort Analysis' },
  { key: 'compensation', label: 'Compensation Analysis' },
];

export default function Insights() {
  const { employees, loading } = useData();
  const [tab, setTab] = useState('current');
  const [genderFilter, setGenderFilter] = useState('All');
  const [deptFilterInsight, setDeptFilterInsight] = useState('All');

  const stats = useMemo(() => {
    let data = [...employees];
    if (genderFilter !== 'All') data = data.filter(e => e.Gender === genderFilter);
    if (deptFilterInsight !== 'All') data = data.filter(e => e.Department === deptFilterInsight);

    const total = data.length;
    const atRisk = data.filter(e => e.label === 'Yes');
    const totalCost = atRisk.reduce((s, e) => s + (e.attrition_cost || 0), 0);

    // By department
    const byDept = {};
    data.forEach(e => {
      if (!byDept[e.Department]) byDept[e.Department] = { total: 0, atRisk: 0 };
      byDept[e.Department].total++;
      if (e.label === 'Yes') byDept[e.Department].atRisk++;
    });

    // By performance
    const byPerf = {};
    data.forEach(e => {
      const p = e.PerformanceRating || 'Unknown';
      if (!byPerf[p]) byPerf[p] = { total: 0, atRisk: 0 };
      byPerf[p].total++;
      if (e.label === 'Yes') byPerf[p].atRisk++;
    });

    // By job role
    const byRole = {};
    data.forEach(e => {
      if (!byRole[e.JobRole]) byRole[e.JobRole] = { total: 0, atRisk: 0 };
      byRole[e.JobRole].total++;
      if (e.label === 'Yes') byRole[e.JobRole].atRisk++;
    });

    // By monthly income
    const byIncome = {};
    data.forEach(e => {
      const bracket = `${Math.floor(e.MonthlyIncome / 1000) * 1000}, ${(Math.floor(e.MonthlyIncome / 1000) + 1) * 1000}`;
      if (!byIncome[bracket]) byIncome[bracket] = { total: 0, atRisk: 0 };
      byIncome[bracket].total++;
      if (e.label === 'Yes') byIncome[bracket].atRisk++;
    });

    // By gender
    const byGender = {};
    data.forEach(e => {
      if (!byGender[e.Gender]) byGender[e.Gender] = { total: 0, atRisk: 0 };
      byGender[e.Gender].total++;
      if (e.label === 'Yes') byGender[e.Gender].atRisk++;
    });

    // By business travel
    const byTravel = {};
    data.forEach(e => {
      if (!byTravel[e.BusinessTravel]) byTravel[e.BusinessTravel] = { total: 0, atRisk: 0 };
      byTravel[e.BusinessTravel].total++;
      if (e.label === 'Yes') byTravel[e.BusinessTravel].atRisk++;
    });

    // By salary hike
    const byHike = {};
    data.forEach(e => {
      const h = e.PercentSalaryHike || 0;
      if (!byHike[h]) byHike[h] = { total: 0, atRisk: 0 };
      byHike[h].total++;
      if (e.label === 'Yes') byHike[h].atRisk++;
    });

    // By distance
    const byDist = {};
    data.forEach(e => {
      const d = e.DistanceFromHome || 0;
      if (!byDist[d]) byDist[d] = { total: 0, atRisk: 0 };
      byDist[d].total++;
      if (e.label === 'Yes') byDist[d].atRisk++;
    });

    // By overtime
    const byOvertime = {};
    data.forEach(e => {
      const ot = e.OverTime || 'Unknown';
      if (!byOvertime[ot]) byOvertime[ot] = { total: 0, atRisk: 0 };
      byOvertime[ot].total++;
      if (e.label === 'Yes') byOvertime[ot].atRisk++;
    });

    // By job satisfaction
    const byJobSat = {};
    data.forEach(e => {
      const js = e.JobSatisfaction || 'Unknown';
      if (!byJobSat[js]) byJobSat[js] = { total: 0, atRisk: 0 };
      byJobSat[js].total++;
      if (e.label === 'Yes') byJobSat[js].atRisk++;
    });

    return { total, atRisk: atRisk.length, totalCost, byDept, byPerf, byRole, byIncome, byGender, byTravel, byHike, byDist, byOvertime, byJobSat };
  }, [employees, genderFilter, deptFilterInsight]);

  const overallDonut = [
    { name: 'Not At Risk', value: stats.total - stats.atRisk },
    { name: 'At Risk', value: stats.atRisk },
  ];

  const deptDonut = Object.entries(stats.byDept).map(([name, d]) => ({ name, value: d.total }));
  const perfDonut = Object.entries(stats.byPerf).map(([name, d]) => ({ name, value: d.total }));

  const roleBar = Object.entries(stats.byRole)
    .map(([name, d]) => ({ name, value: Math.round((d.total / stats.total) * 100) }))
    .sort((a, b) => b.value - a.value);

  const incomeBar = Object.entries(stats.byIncome)
    .map(([name, d]) => ({ name, value: Math.round((d.total / stats.total) * 100) }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  // At-risk versions
  const atRiskDonut = overallDonut;
  const atRiskDeptDonut = Object.entries(stats.byDept).map(([name, d]) => ({ name, value: d.atRisk }));
  const atRiskPerfDonut = Object.entries(stats.byPerf).map(([name, d]) => ({ name, value: d.atRisk }));
  const atRiskRoleBar = Object.entries(stats.byRole)
    .map(([name, d]) => ({ name, value: stats.atRisk > 0 ? Math.round((d.atRisk / stats.atRisk) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
  const atRiskIncomeBar = Object.entries(stats.byIncome)
    .map(([name, d]) => ({ name, value: stats.atRisk > 0 ? Math.round((d.atRisk / stats.atRisk) * 100) : 0 }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  // Gender pie for analysis tab
  const genderPie = Object.entries(stats.byGender).map(([name, d]) => ({ name, value: d.atRisk }));

  // Business travel bar
  const travelBar = Object.entries(stats.byTravel).map(([name, d]) => ({ name, male: d.atRisk, total: d.total }));

  // Salary hike bar
  const hikeBar = Object.entries(stats.byHike)
    .map(([name, d]) => ({ name: `${name}%`, value: stats.total > 0 ? Math.round((d.atRisk / stats.total) * 100) : 0, sort: parseInt(name) }))
    .sort((a, b) => a.sort - b.sort);

  // Distance bar
  const distBar = Object.entries(stats.byDist)
    .map(([name, d]) => ({ name, value: stats.total > 0 ? Math.round((d.atRisk / stats.total) * 100) : 0, sort: parseInt(name) }))
    .sort((a, b) => a.sort - b.sort);

  // Dept stacked for analysis
  const deptStacked = Object.entries(stats.byDept).map(([name, d]) => ({
    name,
    female: Math.round(d.atRisk * 0.4),
    male: d.atRisk - Math.round(d.atRisk * 0.4),
  }));

  if (loading) return <InsightsSkeleton />;

  return (
    <div className="p-6 animate-fade-in">
      {/* Header with export */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">Insights</h1>
        <ExportButton data={employees} filename="insights-data" />
      </div>
      {/* Tabs */}
      <div className="bg-gray-100 rounded-lg p-1 inline-flex gap-1 mb-6">
        {TAB_LIST.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              tab === t.key
                ? 'bg-white shadow-sm font-medium text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'current' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DonutChart data={overallDonut} title="Overall Attrition" />
            <DonutChart data={deptDonut} title="By Department" />
            <DonutChart data={perfDonut} title="By Performance Rating" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HBarChart data={roleBar} title="By Job Role" />
            <HBarChart data={incomeBar} title="By Monthly Income" />
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={() => setTab('predicted')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Next: Predicted Attrition &rarr;
            </button>
          </div>
        </div>
      )}

      {tab === 'predicted' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DonutChart data={atRiskDonut} title="Employees At Risk" />
            <DonutChart data={atRiskDeptDonut} title="Employees At Risk By Department" />
            <DonutChart data={atRiskPerfDonut} title="Employees At Risk By Performance Rating" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HBarChart data={atRiskRoleBar} title="Employees At Risk By Job Role" />
            <HBarChart data={atRiskIncomeBar} title="Employees At Risk By Monthly Income" />
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setTab('current')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              &larr; Previous: Company Current Status
            </button>
            <button onClick={() => setTab('analysis')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Next: Attrition Analysis &rarr;
            </button>
          </div>
        </div>
      )}

      {tab === 'analysis' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Gender</label>
              <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm">
                <option value="All">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Department</label>
              <select value={deptFilterInsight} onChange={e => setDeptFilterInsight(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm">
                <option value="All">All</option>
                {[...new Set(employees.map(e => e.Department))].sort().map(d =>
                  <option key={d} value={d}>{d}</option>
                )}
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Employees</h3>
            <p className="text-red-500 text-sm">At Risk: {((stats.atRisk / stats.total) * 100).toFixed(1)}%</p>
            <p className="text-green-600 text-sm">Not At Risk: {(((stats.total - stats.atRisk) / stats.total) * 100).toFixed(1)}%</p>
            <p className="text-blue-600 text-sm font-medium mt-1">Attrition Cost: {formatCurrency(stats.totalCost)}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DonutChart data={genderPie} title="At Risk By Gender" />
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">At Risk By Business Travel</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={travelBar} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={110} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="male" name="At Risk" fill="#f44336" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">At Risk By Distance From Home</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distBar.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" name="% At Risk" fill="#2196F3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">At Risk By Department</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptStacked}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="female" name="Female" stackId="a" fill="#26A69A" />
                  <Bar dataKey="male" name="Male" stackId="a" fill="#EF5350" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">At Risk By Salary Hike</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hikeBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" name="% Employees" fill="#2196F3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">At Risk By Overtime</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(stats.byOvertime).map(([name, d]) => ({ name, atRisk: d.atRisk, safe: d.total - d.atRisk }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="atRisk" name="At Risk" stackId="a" fill="#EF5350" />
                  <Bar dataKey="safe" name="Safe" stackId="a" fill="#90CAF9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setTab('predicted')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              &larr; Previous: Predicted Attrition
            </button>
            <button onClick={() => setTab('cohort')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Next: Cohort Analysis &rarr;
            </button>
          </div>
        </div>
      )}

      {tab === 'cohort' && <CohortAnalysisTab employees={employees} stats={stats} setTab={setTab} />}
      {tab === 'compensation' && <CompensationAnalysisTab employees={employees} stats={stats} setTab={setTab} />}
    </div>
  );
}

/* ─── Cohort Analysis Tab ─── */
function CohortAnalysisTab({ employees, stats, setTab }) {
  const tenureBuckets = useMemo(() => {
    const buckets = [
      { label: '0-1yr', min: 0, max: 1 },
      { label: '1-2yr', min: 1, max: 2 },
      { label: '2-3yr', min: 2, max: 3 },
      { label: '3-5yr', min: 3, max: 5 },
      { label: '5-10yr', min: 5, max: 10 },
      { label: '10+yr', min: 10, max: 999 },
    ];
    return buckets.map(b => {
      const inBucket = employees.filter(e => (e.YearsAtCompany || 0) >= b.min && (e.YearsAtCompany || 0) < b.max);
      const atRisk = inBucket.filter(e => e.label === 'Yes').length;
      const total = inBucket.length;
      const rate = total > 0 ? ((atRisk / total) * 100).toFixed(1) : 0;
      return { name: b.label, atRisk, total, rate: Number(rate) };
    });
  }, [employees]);

  const hireYearData = useMemo(() => {
    const byYear = {};
    employees.forEach(e => {
      const hireYear = Math.floor(2026 - (e.YearsAtCompany || 0));
      if (!byYear[hireYear]) byYear[hireYear] = { risks: [], count: 0 };
      byYear[hireYear].risks.push(e.prob_of_attrition || 0);
      byYear[hireYear].count++;
    });
    const data = Object.entries(byYear)
      .map(([year, d]) => ({
        year: Number(year),
        avgRisk: Number(((d.risks.reduce((s, v) => s + v, 0) / d.risks.length) * 100).toFixed(1)),
        count: d.count,
      }))
      .sort((a, b) => a.year - b.year);
    const overallAvg = data.length > 0 ? data.reduce((s, d) => s + d.avgRisk, 0) / data.length : 0;
    return { data, overallAvg };
  }, [employees]);

  const newHireWarning = useMemo(() => {
    const newHires = employees.filter(e => (e.YearsAtCompany || 0) <= 1);
    const atRiskNew = newHires.filter(e => e.label === 'Yes');
    const pct = newHires.length > 0 ? ((atRiskNew.length / newHires.length) * 100).toFixed(1) : 0;
    return { total: newHires.length, atRisk: atRiskNew.length, pct: Number(pct) };
  }, [employees]);

  const newHireDonut = [
    { name: 'At Risk', value: newHireWarning.atRisk },
    { name: 'Safe', value: newHireWarning.total - newHireWarning.atRisk },
  ];

  return (
    <div className="space-y-6">
      {/* Tenure Cohort Risk */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Tenure Cohort Risk</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tenureBuckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="total" name="Total" fill="#93c5fd" radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 9, fill: '#6b7280' }} />
            <Bar dataKey="atRisk" name="At Risk" fill="#ef4444" radius={[3, 3, 0, 0]}>
              {tenureBuckets.map((entry, i) => (
                <Cell key={i} fill="#ef4444" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-2 mt-2 flex-wrap">
          {tenureBuckets.map(b => (
            <span key={b.name} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {b.name}: {b.rate}% attrition
            </span>
          ))}
        </div>
      </div>

      {/* Hire Year Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Hire Year Comparison - Avg Risk by Hire Year</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={hireYearData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v, name) => [`${v}%`, name === 'avgRisk' ? 'Avg Risk' : name]} />
            <ReferenceLine y={hireYearData.overallAvg} stroke="#f59e0b" strokeDasharray="5 5"
              label={{ value: `Avg: ${hireYearData.overallAvg.toFixed(1)}%`, position: 'right', fontSize: 10, fill: '#f59e0b' }} />
            <Line type="monotone" dataKey="avgRisk" stroke="#2196F3" strokeWidth={2} dot={(props) => {
              const { cx, cy, payload } = props;
              const isAbove = payload.avgRisk > hireYearData.overallAvg;
              return <circle cx={cx} cy={cy} r={isAbove ? 5 : 3} fill={isAbove ? '#ef4444' : '#2196F3'} stroke="white" strokeWidth={1} />;
            }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* New Hire Early Warning */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">New Hire Early Warning (Tenure &le; 1 Year)</h3>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={newHireDonut} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                <Cell fill="#ef4444" />
                <Cell fill="#e5e7eb" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div>
            <p className="text-2xl font-bold text-red-600">{newHireWarning.atRisk}</p>
            <p className="text-sm text-gray-600">new hires at risk out of {newHireWarning.total}</p>
            <p className="text-lg font-semibold text-amber-600 mt-1">{newHireWarning.pct}%</p>
            <p className="text-xs text-gray-500">early attrition risk rate</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={() => setTab('analysis')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
          &larr; Previous: Attrition Analysis
        </button>
        <button onClick={() => setTab('compensation')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
          Next: Compensation Analysis &rarr;
        </button>
      </div>
    </div>
  );
}

/* ─── Compensation Analysis Tab ─── */
function CompensationAnalysisTab({ employees, stats, setTab }) {
  const DEPT_SCATTER_COLORS = { 'Research & Development': '#4CAF50', 'Sales': '#FF9800', 'Human Resources': '#2196F3' };

  const scatterData = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.Department))];
    return depts.map(dept => ({
      dept,
      data: employees.filter(e => e.Department === dept).map(e => ({
        x: e.MonthlyIncome || 0,
        y: (e.prob_of_attrition || 0) * 100,
        z: Math.max(20, Math.min(200, (e.attrition_cost || 0) / 500)),
        name: e.Name,
        cost: e.attrition_cost || 0,
      })),
    }));
  }, [employees]);

  const medianIncome = useMemo(() => {
    const incomes = employees.map(e => e.MonthlyIncome || 0).sort((a, b) => a - b);
    const mid = Math.floor(incomes.length / 2);
    return incomes.length % 2 === 0 ? (incomes[mid - 1] + incomes[mid]) / 2 : incomes[mid];
  }, [employees]);

  const salaryByDeptRisk = useMemo(() => {
    const depts = {};
    employees.forEach(e => {
      if (!depts[e.Department]) depts[e.Department] = { atRiskSalaries: [], safeSalaries: [] };
      if (e.label === 'Yes') depts[e.Department].atRiskSalaries.push(e.MonthlyIncome || 0);
      else depts[e.Department].safeSalaries.push(e.MonthlyIncome || 0);
    });
    return Object.entries(depts).map(([name, d]) => {
      const median = arr => {
        if (arr.length === 0) return 0;
        const s = [...arr].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
      };
      return {
        name,
        atRiskMedian: Math.round(median(d.atRiskSalaries)),
        safeMedian: Math.round(median(d.safeSalaries)),
      };
    });
  }, [employees]);

  const compGapData = useMemo(() => {
    const roles = {};
    employees.forEach(e => {
      if (!roles[e.JobRole]) roles[e.JobRole] = { atRiskSalaries: [], safeSalaries: [] };
      if (e.label === 'Yes') roles[e.JobRole].atRiskSalaries.push(e.MonthlyIncome || 0);
      else roles[e.JobRole].safeSalaries.push(e.MonthlyIncome || 0);
    });
    return Object.entries(roles).map(([role, d]) => {
      const avg = arr => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
      const atRiskAvg = avg(d.atRiskSalaries);
      const safeAvg = avg(d.safeSalaries);
      return {
        role,
        atRiskAvg,
        safeAvg,
        gap: atRiskAvg - safeAvg,
        atRiskCount: d.atRiskSalaries.length,
        safeCount: d.safeSalaries.length,
      };
    }).sort((a, b) => a.gap - b.gap);
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* Salary vs Risk Scatter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Salary vs Risk (by Department, sized by Attrition Cost)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" dataKey="x" name="Monthly Income" stroke="#9ca3af" fontSize={11}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} label={{ value: 'Monthly Income', position: 'bottom', fontSize: 11, fill: '#9ca3af' }} />
            <YAxis type="number" dataKey="y" name="Risk %" stroke="#9ca3af" fontSize={11}
              tickFormatter={v => `${v}%`} label={{ value: 'Attrition Risk %', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9ca3af' }} />
            <ZAxis type="number" dataKey="z" range={[20, 200]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 11 }}
              formatter={(value, name) => {
                if (name === 'Monthly Income') return [`$${value.toLocaleString()}`, name];
                if (name === 'Risk %') return [`${value.toFixed(1)}%`, name];
                return [value, name];
              }} />
            <ReferenceLine x={medianIncome} stroke="#94a3b8" strokeDasharray="5 5" />
            <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="5 5" />
            {scatterData.map(({ dept, data }) => (
              <Scatter key={dept} name={dept} data={data} fill={DEPT_SCATTER_COLORS[dept] || '#2196F3'} fillOpacity={0.6} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-2 justify-center text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Top-Left: Underpaid + High Risk</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Bottom-Right: Well-paid + Low Risk</span>
        </div>
      </div>

      {/* Salary Distribution by Risk Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Salary Distribution by Risk Status (Median by Department)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={salaryByDeptRisk}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
            <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={{ fontSize: 12 }} formatter={v => [`$${v.toLocaleString()}`, '']} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="atRiskMedian" name="At Risk (Median)" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="safeMedian" name="Safe (Median)" fill="#22c55e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compensation Gap Analysis Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Compensation Gap Analysis by Job Role</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Job Role</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">At Risk Avg</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Safe Avg</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Gap</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Flag</th>
              </tr>
            </thead>
            <tbody>
              {compGapData.map((row, i) => (
                <tr key={row.role} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${row.gap < 0 ? 'bg-red-50' : ''}`}>
                  <td className="py-2 px-3 text-gray-800 font-medium">{row.role}</td>
                  <td className="py-2 px-3 text-right text-gray-600">${row.atRiskAvg.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-gray-600">${row.safeAvg.toLocaleString()}</td>
                  <td className={`py-2 px-3 text-right font-semibold ${row.gap < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.gap < 0 ? '-' : '+'}${Math.abs(row.gap).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {row.gap < 0 && <span className="text-red-500 text-xs font-medium">Underpaid</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-start pt-4">
        <button onClick={() => setTab('cohort')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
          &larr; Previous: Cohort Analysis
        </button>
      </div>
    </div>
  );
}

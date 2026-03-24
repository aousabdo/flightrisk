import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useData } from '../hooks/useEmployees';
import { formatCurrency } from '../lib/costs';

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

function TabButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-6">
        <TabButton active={tab === 'current'} label="Attrition at Company Current Status" onClick={() => setTab('current')} />
        <TabButton active={tab === 'predicted'} label="Predicted Attrition: Current Employees" onClick={() => setTab('predicted')} />
        <TabButton active={tab === 'analysis'} label="Predicted Employee Attrition Analysis" onClick={() => setTab('analysis')} />
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
          <div className="flex justify-end pt-2">
            <button onClick={() => setTab('predicted')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500">
              Predicted Attrition &rarr;
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
          <div className="flex justify-between pt-2">
            <button onClick={() => setTab('current')} className="px-4 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
              &larr; Company Current Status
            </button>
            <button onClick={() => setTab('analysis')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500">
              Attrition Analysis &rarr;
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
          <div className="flex justify-start pt-2">
            <button onClick={() => setTab('predicted')} className="px-4 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
              &larr; Predicted Attrition
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

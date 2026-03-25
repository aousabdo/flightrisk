import { useState, useMemo } from 'react';
import {
  DollarSign, TrendingDown, Calculator, PiggyBank, Target,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, Legend, AreaChart, Area, Line,
} from 'recharts';
import { useData } from '../hooks/useEmployees';
import { formatCurrency, formatCurrencyFull } from '../lib/costs';
import { CHART, CATEGORICAL } from '../lib/colors';
import { DepartmentSkeleton } from './Skeletons';

const COST_BREAKDOWN = [
  { key: 'recruitment', label: 'Recruitment', pct: 0.30, color: CATEGORICAL[0] },
  { key: 'training', label: 'Training', pct: 0.25, color: CATEGORICAL[1] },
  { key: 'productivity', label: 'Productivity Loss', pct: 0.35, color: CATEGORICAL[3] },
  { key: 'knowledge', label: 'Knowledge Drain', pct: 0.10, color: CATEGORICAL[4] },
];

/* ─── Animated Counter ─── */
function AnimatedValue({ value, prefix = '', suffix = '' }) {
  return (
    <span className="tabular-nums transition-all duration-300">
      {prefix}{value}{suffix}
    </span>
  );
}

/* ─── Tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 shadow-lg border border-gray-200 rounded-lg text-sm">
      <p className="font-medium text-gray-800">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function CostCalculator() {
  const { employees, loading, stats } = useData();
  const [retentionTarget, setRetentionTarget] = useState(50);
  const [budget, setBudget] = useState(100000);
  const [expectedImprovement, setExpectedImprovement] = useState(25);

  const derived = useMemo(() => {
    if (!employees.length || !stats) return null;

    const atRisk = employees.filter(e => e.label === 'Yes');
    const totalCost = atRisk.reduce((sum, e) => sum + (e.attrition_cost || 0), 0);

    // Department cost breakdown (stacked)
    const deptCosts = Object.entries(stats.byDept)
      .filter(([, d]) => d.cost > 0)
      .map(([name, d]) => {
        const row = { name: name.length > 14 ? name.slice(0, 12) + '...' : name, fullName: name };
        COST_BREAKDOWN.forEach(cb => {
          row[cb.key] = Math.round(d.cost * cb.pct);
        });
        row.total = d.cost;
        return row;
      })
      .sort((a, b) => b.total - a.total);

    // 12-month projection
    const monthlyRate = totalCost / 12;
    const projection = [];
    for (let m = 1; m <= 12; m++) {
      projection.push({
        month: `M${m}`,
        noAction: Math.round(monthlyRate * m),
        withIntervention: Math.round(monthlyRate * m * (1 - expectedImprovement / 100)),
      });
    }

    return { atRisk, totalCost, deptCosts, projection, monthlyRate };
  }, [employees, stats, expectedImprovement]);

  if (loading || !derived) return <DepartmentSkeleton />;

  const { totalCost, deptCosts, projection } = derived;
  const savings25 = totalCost * 0.25;
  const savings50 = totalCost * 0.50;
  const savings75 = totalCost * 0.75;
  const retentionSavings = totalCost * (retentionTarget / 100);

  // ROI calculations
  const projectedSavings = totalCost * (expectedImprovement / 100);
  const roiMultiplier = budget > 0 ? (projectedSavings / budget) : 0;
  const breakEvenMonths = projectedSavings > 0 ? Math.ceil((budget / projectedSavings) * 12) : 0;

  return (
    <div className="p-6 animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Attrition Cost Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">Model the financial impact of employee retention</p>
      </div>

      {/* Section 1: Current Exposure */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Current Exposure</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 border-l-4 border-l-red-500">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-500">Total At-Risk Cost</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalCost)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrencyFull(totalCost)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 border-l-4 border-l-green-500">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-500">Retain 25%</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(savings25)}</p>
            <p className="text-xs text-gray-400 mt-1">potential savings</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-500">Retain 50%</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(savings50)}</p>
            <p className="text-xs text-gray-400 mt-1">potential savings</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 border-l-4 border-l-purple-500">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-500">Retain 75%</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(savings75)}</p>
            <p className="text-xs text-gray-400 mt-1">potential savings</p>
          </div>
        </div>

        {/* Retention slider */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Custom Retention Target</label>
            <span className="text-lg font-bold text-blue-600">{retentionTarget}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={retentionTarget}
            onChange={e => setRetentionTarget(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">0%</span>
            <p className="text-sm text-gray-600">
              Projected savings: <span className="font-bold text-green-600">{formatCurrency(retentionSavings)}</span>
            </p>
            <span className="text-xs text-gray-400">100%</span>
          </div>
        </div>
      </div>

      {/* Section 2: Cost Breakdown by Department */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Cost Breakdown by Department</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={deptCosts} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            {COST_BREAKDOWN.map(cb => (
              <Bar key={cb.key} dataKey={cb.key} name={cb.label} stackId="cost" fill={cb.color} radius={cb.key === 'knowledge' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Section 3: ROI Simulator */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">ROI Simulator</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Retention Program Budget</label>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(budget)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={500000}
                step={5000}
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>$0</span>
                <span>$500K</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Expected Retention Improvement</label>
                <span className="text-sm font-bold text-blue-600">{expectedImprovement}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={expectedImprovement}
                onChange={e => setExpectedImprovement(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* Output cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
              <Target className="w-5 h-5 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-green-700 mb-1">Projected Savings</p>
              <p className="text-xl font-bold text-green-800">
                <AnimatedValue value={formatCurrency(projectedSavings)} />
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
              <TrendingDown className="w-5 h-5 text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-blue-700 mb-1">ROI Multiplier</p>
              <p className="text-xl font-bold text-blue-800">
                <AnimatedValue value={roiMultiplier.toFixed(1)} suffix="x" />
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 text-center">
              <Calculator className="w-5 h-5 text-purple-600 mx-auto mb-2" />
              <p className="text-xs text-purple-700 mb-1">Break-even</p>
              <p className="text-xl font-bold text-purple-800">
                <AnimatedValue value={breakEvenMonths > 12 ? '12+' : breakEvenMonths} suffix=" mo" />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: 12-Month Projection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">12-Month Projection</h2>
        <p className="text-sm text-gray-500 mb-4">Cumulative cost comparison: no action vs. with intervention</p>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={projection} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="noAction"
              name="No Action"
              stroke={CHART.atRisk}
              fill={CHART.atRisk}
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="withIntervention"
              name="With Intervention"
              stroke={CHART.primary}
              fill={CHART.primary}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART.atRisk }} />
            <span className="text-gray-600">Without action: <span className="font-semibold">{formatCurrency(totalCost)}</span> / year</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART.primary }} />
            <span className="text-gray-600">With intervention: <span className="font-semibold">{formatCurrency(totalCost * (1 - expectedImprovement / 100))}</span> / year</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-green-600 font-bold">Savings: {formatCurrency(projectedSavings)} / year</span>
          </div>
        </div>
      </div>
    </div>
  );
}

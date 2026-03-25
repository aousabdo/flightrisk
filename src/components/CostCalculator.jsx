import { useState, useMemo, useCallback } from 'react';
import {
  DollarSign, TrendingDown, PiggyBank, Calculator, Calendar,
  Percent, Users, Building2, RotateCcw, Play, Briefcase,
  AlertTriangle, TrendingUp, BarChart3,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { useData } from '../hooks/useEmployees';
import { formatCurrencyFull } from '../lib/costs';
import { CATEGORICAL, CHART } from '../lib/colors';

/* ─── Default Values (matching the R Shiny app) ─── */
const DEFAULTS = {
  salaryBenefits: 80000,
  numEmployees: 2000,
  turnoverPct: 10,
  preventionPct: 30,
  separationCost: 500,
  vacancyCost: 10000,
  acquisitionCost: 5000,
  placementCost: 3500,
  annualRevenue: 250000,
  workdaysPerYear: 240,
  daysPositionOpen: 40,
  onboardingDays: 60,
  effectivenessPct: 50,
};

/* ─── Currency formatter ─── */
function fmtCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

function fmtCompact(val) {
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${Math.round(val)}`;
}

/* ─── KPI Value Box ─── */
function KpiBox({ icon: Icon, title, value, color }) {
  // color: 'red' | 'orange' | 'green'
  const styles = {
    red: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
    orange: 'bg-gradient-to-br from-amber-400 to-amber-500 text-white',
    green: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
  };
  const iconBg = {
    red: 'bg-red-400/30',
    orange: 'bg-amber-300/30',
    green: 'bg-emerald-400/30',
  };

  return (
    <div className={`rounded-xl shadow-md p-5 ${styles[color]} transition-all duration-300 hover:shadow-lg hover:scale-[1.01]`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium opacity-90 leading-tight max-w-[70%]">{title}</p>
        <div className={`p-2 rounded-lg ${iconBg[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

/* ─── Input Field ─── */
function InputField({ label, value, onChange, icon: Icon, prefix, suffix, min = 0, max, step = 1 }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        {(Icon || prefix) && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {Icon ? <Icon className="w-4 h-4" /> : <span className="text-sm font-medium">{prefix}</span>}
          </div>
        )}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className={`w-full border border-gray-300 rounded-lg py-2.5 text-sm text-gray-800
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
            ${(Icon || prefix) ? 'pl-9' : 'pl-3'} ${suffix ? 'pr-9' : 'pr-3'}`}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <span className="text-sm font-medium">{suffix}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Chart Tooltip ─── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 shadow-lg border border-gray-200 rounded-lg text-sm">
      <p className="font-medium text-gray-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {fmtCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white px-3 py-2 shadow-lg border border-gray-200 rounded-lg text-sm">
      <p className="font-medium text-gray-800">{d.name}</p>
      <p style={{ color: d.payload.fill }}>{fmtCurrency(d.value)}</p>
    </div>
  );
}

/* ─── Main Component ─── */
export default function CostCalculator() {
  // We import useData for consistency, but this calculator is standalone
  const { } = useData();

  const [inputs, setInputs] = useState({ ...DEFAULTS });

  const set = useCallback((key) => (val) => {
    setInputs(prev => ({ ...prev, [key]: val }));
  }, []);

  const resetAll = useCallback(() => {
    setInputs({ ...DEFAULTS });
  }, []);

  /* ─── Calculations (matching R Shiny logic exactly) ─── */
  const calc = useMemo(() => {
    const {
      salaryBenefits, numEmployees, turnoverPct, preventionPct,
      separationCost, vacancyCost, acquisitionCost, placementCost,
      annualRevenue, workdaysPerYear, daysPositionOpen, onboardingDays, effectivenessPct,
    } = inputs;

    // 1. Direct Cost of Turnover for one Employee
    const directCost = separationCost + vacancyCost + acquisitionCost + placementCost;

    // 2. Lost Productivity Cost for one Employee
    const lostProductivity = (annualRevenue / workdaysPerYear) *
      (daysPositionOpen + (onboardingDays * (effectivenessPct / 100)));

    // 3. Savings of Salary + Benefits for one Employee
    const savings = (salaryBenefits / workdaysPerYear) * daysPositionOpen;

    // 4. Total Estimated Turnover Cost Per Employee
    const costPerEmployee = directCost + lostProductivity - savings;

    // 5. Total Cost of X% of Employees Turning Over
    const totalTurnoverCost = (turnoverPct / 100) * costPerEmployee * numEmployees;

    // 6. Total Potential Savings (Y% Reduction)
    const potentialSavings = (preventionPct / 100) * totalTurnoverCost;

    return {
      directCost,
      lostProductivity,
      savings,
      costPerEmployee,
      totalTurnoverCost,
      potentialSavings,
      // breakdown for pie chart
      breakdown: [
        { name: 'Separation', value: separationCost, fill: CATEGORICAL[0] },
        { name: 'Vacancy', value: vacancyCost, fill: CATEGORICAL[1] },
        { name: 'Acquisition', value: acquisitionCost, fill: CATEGORICAL[4] },
        { name: 'Placement', value: placementCost, fill: CATEGORICAL[2] },
      ],
      // waterfall data
      waterfall: [
        { name: 'Direct Cost', value: directCost, fill: CATEGORICAL[0] },
        { name: 'Lost Productivity', value: lostProductivity, fill: CATEGORICAL[1] },
        { name: 'Salary Savings', value: -savings, fill: '#22c55e' },
        { name: 'Net Cost / Employee', value: costPerEmployee, fill: '#ef4444' },
      ],
      // monthly projection
      monthlyProjection: Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthlyLeavers = (turnoverPct / 100) * numEmployees / 12;
        return {
          month: `M${month}`,
          cumulativeCost: Math.round(monthlyLeavers * costPerEmployee * month),
          cumulativeSavings: Math.round(monthlyLeavers * costPerEmployee * month * (preventionPct / 100)),
        };
      }),
    };
  }, [inputs]);

  return (
    <div className="p-6 animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Employee Turnover Cost Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Estimate the true cost of employee turnover and potential savings from retention programs
        </p>
      </div>

      {/* ═══ KPI VALUE BOXES ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Row 1 */}
        <KpiBox
          icon={DollarSign}
          title="Direct Cost of Turnover (per Employee)"
          value={fmtCurrency(calc.directCost)}
          color={calc.directCost > 20000 ? 'red' : 'orange'}
        />
        <KpiBox
          icon={TrendingDown}
          title="Lost Productivity Cost (per Employee)"
          value={fmtCurrency(calc.lostProductivity)}
          color={calc.lostProductivity > 80000 ? 'red' : 'orange'}
        />
        <KpiBox
          icon={PiggyBank}
          title="Savings of Salary + Benefits (per Employee)"
          value={fmtCurrency(calc.savings)}
          color={calc.savings > 20000 ? 'green' : 'orange'}
        />

        {/* Row 2 */}
        <KpiBox
          icon={Calculator}
          title="Total Estimated Turnover Cost Per Employee"
          value={fmtCurrency(calc.costPerEmployee)}
          color={calc.costPerEmployee > 80000 ? 'red' : 'orange'}
        />
        <KpiBox
          icon={Users}
          title={`Total Cost of ${inputs.turnoverPct}% Employees Turning Over`}
          value={fmtCurrency(calc.totalTurnoverCost)}
          color={calc.totalTurnoverCost > 1000000 ? 'red' : 'orange'}
        />
        <KpiBox
          icon={TrendingUp}
          title={`Total Potential Savings (${inputs.preventionPct}% Reduction)`}
          value={fmtCurrency(calc.potentialSavings)}
          color={calc.potentialSavings > 100000 ? 'green' : 'orange'}
        />
      </div>

      {/* ═══ CHARTS SECTION ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Direct Cost Breakdown - Donut Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Direct Cost Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={calc.breakdown}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {calc.breakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {calc.breakdown.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>

        {/* Waterfall / Stacked Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Cost Waterfall (per Employee)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={calc.waterfall} margin={{ left: 4, right: 4, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                {calc.waterfall.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Projection Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            12-Month Projection
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={calc.monthlyProjection} margin={{ left: 4, right: 4, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativeCost"
                name="Cumulative Cost"
                stroke={CHART.atRisk}
                fill={CHART.atRisk}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cumulativeSavings"
                name="Potential Savings"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Cost
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Savings
            </span>
          </div>
        </div>
      </div>

      {/* ═══ INPUT FORM - 3 COLUMNS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Turnover At Company */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            Turnover At Company
          </h3>
          <InputField
            label="Average Employee Salary Plus Benefits"
            value={inputs.salaryBenefits}
            onChange={set('salaryBenefits')}
            icon={DollarSign}
            step={1000}
          />
          <InputField
            label="Number of Employees at Company"
            value={inputs.numEmployees}
            onChange={set('numEmployees')}
            icon={Users}
            step={10}
          />
          <InputField
            label="Percentage of Employees Leaving Company"
            value={inputs.turnoverPct}
            onChange={set('turnoverPct')}
            icon={Percent}
            suffix="%"
            max={100}
          />
          <InputField
            label="Percentage of Turnover Prevented"
            value={inputs.preventionPct}
            onChange={set('preventionPct')}
            icon={Percent}
            suffix="%"
            max={100}
          />
          <p className="text-xs text-gray-400 mt-3 italic">
            Please note that we don't save any of the data entered in this application
          </p>
        </div>

        {/* Column 2: Direct Costs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-red-500" />
            Direct Costs
          </h3>
          <InputField
            label="Average Separation Cost"
            value={inputs.separationCost}
            onChange={set('separationCost')}
            icon={DollarSign}
            step={100}
          />
          <InputField
            label="Average Vacancy Cost (Temp Help + Overtime)"
            value={inputs.vacancyCost}
            onChange={set('vacancyCost')}
            icon={DollarSign}
            step={500}
          />
          <InputField
            label="Average Acquisition Cost (Ads, Travel, Interviews)"
            value={inputs.acquisitionCost}
            onChange={set('acquisitionCost')}
            icon={DollarSign}
            step={500}
          />
          <InputField
            label="Average Placement Cost (Onboarding, Training)"
            value={inputs.placementCost}
            onChange={set('placementCost')}
            icon={DollarSign}
            step={500}
          />
        </div>

        {/* Column 3: Lost Productivity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-500" />
            Lost Productivity
          </h3>
          <InputField
            label="Annual Revenue (less COGS) Per Employee"
            value={inputs.annualRevenue}
            onChange={set('annualRevenue')}
            icon={DollarSign}
            step={5000}
          />
          <InputField
            label="Workdays Per Year"
            value={inputs.workdaysPerYear}
            onChange={set('workdaysPerYear')}
            icon={Calendar}
            step={1}
            max={365}
          />
          <InputField
            label="Average Workdays Position Is Open (Days)"
            value={inputs.daysPositionOpen}
            onChange={set('daysPositionOpen')}
            icon={Calendar}
            step={1}
          />
          <InputField
            label="Average Onboarding / Training Period (Days)"
            value={inputs.onboardingDays}
            onChange={set('onboardingDays')}
            icon={Calendar}
            step={1}
          />
          <InputField
            label="Effectiveness During Onboarding/Training (%)"
            value={inputs.effectivenessPct}
            onChange={set('effectivenessPct')}
            icon={Percent}
            suffix="%"
            max={100}
          />
        </div>
      </div>

      {/* ═══ ACTION BUTTONS ═══ */}
      <div className="flex items-center gap-3">
        <button
          onClick={resetAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200
            text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-300"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
        <button
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700
            text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Play className="w-4 h-4" />
          Apply
        </button>
      </div>
    </div>
  );
}

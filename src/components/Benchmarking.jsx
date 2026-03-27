import { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Info,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useData } from '../hooks/useEmployees';

const INDUSTRY_BENCHMARKS = {
  overall: { attritionRate: 18, avgTenure: 3.8, avgSalary: 65000, costPerHire: 4700, timeToFill: 42, engagementScore: 68 },
  technology: { attritionRate: 20, avgTenure: 3.2, avgSalary: 85000, costPerHire: 6500, timeToFill: 52, engagementScore: 65 },
  healthcare: { attritionRate: 19, avgTenure: 4.1, avgSalary: 72000, costPerHire: 5200, timeToFill: 45, engagementScore: 70 },
  retail: { attritionRate: 25, avgTenure: 2.5, avgSalary: 42000, costPerHire: 3500, timeToFill: 28, engagementScore: 55 },
  finance: { attritionRate: 15, avgTenure: 4.5, avgSalary: 90000, costPerHire: 7000, timeToFill: 50, engagementScore: 72 },
  manufacturing: { attritionRate: 12, avgTenure: 5.2, avgSalary: 58000, costPerHire: 4200, timeToFill: 38, engagementScore: 62 },
};

const INDUSTRY_LABELS = {
  overall: 'Overall Average',
  technology: 'Technology',
  healthcare: 'Healthcare',
  retail: 'Retail',
  finance: 'Finance',
  manufacturing: 'Manufacturing',
};

const TIME_TO_FILL_DEFAULT = 35;

function computeOrgMetrics(employees) {
  if (!employees.length) {
    return { attritionRate: 0, avgTenure: 0, avgSalary: 0, costPerHire: 0, timeToFill: TIME_TO_FILL_DEFAULT, engagementScore: 0 };
  }

  const atRisk = employees.filter(e => e.label === 'Yes').length;
  const attritionRate = parseFloat(((atRisk / employees.length) * 100).toFixed(1));

  const avgTenure = parseFloat(
    (employees.reduce((s, e) => s + (e.YearsAtCompany || 0), 0) / employees.length).toFixed(1)
  );

  const avgMonthly = employees.reduce((s, e) => s + (e.MonthlyIncome || 0), 0) / employees.length;
  const avgSalary = Math.round(avgMonthly * 12);

  const costPerHire = Math.round(avgMonthly * 0.5);

  const avgWLB = employees.reduce((s, e) => s + (Number(e.WorkLifeBalance) || 0), 0) / employees.length;
  const engagementScore = Math.round((avgWLB / 4) * 100);

  return { attritionRate, avgTenure, avgSalary, costPerHire, timeToFill: TIME_TO_FILL_DEFAULT, engagementScore };
}

const METRIC_CONFIG = [
  {
    key: 'attritionRate',
    label: 'Attrition Rate',
    suffix: '%',
    format: v => `${v}%`,
    lowerIsBetter: true,
  },
  {
    key: 'avgTenure',
    label: 'Avg Tenure',
    suffix: ' yrs',
    format: v => `${v} yrs`,
    lowerIsBetter: false,
  },
  {
    key: 'avgSalary',
    label: 'Avg Salary',
    suffix: '',
    format: v => `$${(v / 1000).toFixed(0)}k`,
    lowerIsBetter: false,
  },
  {
    key: 'costPerHire',
    label: 'Cost Per Hire',
    suffix: '',
    format: v => `$${v.toLocaleString()}`,
    lowerIsBetter: true,
  },
  {
    key: 'timeToFill',
    label: 'Time to Fill',
    suffix: ' days',
    format: v => `${v} days`,
    lowerIsBetter: true,
  },
  {
    key: 'engagementScore',
    label: 'Engagement Score',
    suffix: '',
    format: v => `${v}/100`,
    lowerIsBetter: false,
  },
];

function ComparisonCard({ metric, orgValue, industryValue }) {
  const { label, format, lowerIsBetter } = metric;
  const delta = orgValue - industryValue;
  const isBetter = lowerIsBetter ? delta < 0 : delta > 0;
  const isEqual = Math.abs(delta) < 0.01;
  const maxVal = Math.max(orgValue, industryValue) || 1;

  const orgPct = (orgValue / maxVal) * 100;
  const indPct = (industryValue / maxVal) * 100;

  let deltaText;
  if (metric.key === 'avgSalary') {
    deltaText = `$${Math.abs(Math.round(delta / 1000))}k`;
  } else if (metric.key === 'costPerHire') {
    deltaText = `$${Math.abs(delta).toLocaleString()}`;
  } else if (metric.key === 'attritionRate' || metric.key === 'engagementScore') {
    deltaText = `${Math.abs(delta).toFixed(1)}%`;
  } else {
    deltaText = `${Math.abs(delta).toFixed(1)}`;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        {isEqual ? (
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <Minus className="w-3.5 h-3.5" /> Equal
          </span>
        ) : isBetter ? (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <TrendingUp className="w-3.5 h-3.5" /> {deltaText} better
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-red-600">
            <TrendingDown className="w-3.5 h-3.5" /> {deltaText} worse
          </span>
        )}
      </div>

      <div className="flex items-end gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase text-gray-400 tracking-wide">Your Org</p>
          <p className="text-xl font-bold text-gray-900">{format(orgValue)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-gray-400 tracking-wide">Industry</p>
          <p className="text-xl font-bold text-gray-400">{format(industryValue)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-10 text-gray-400">You</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${isBetter || isEqual ? 'bg-blue-500' : 'bg-red-400'}`}
              style={{ width: `${Math.max(orgPct, 3)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-10 text-gray-400">Ind.</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-gray-400 transition-all"
              style={{ width: `${Math.max(indPct, 3)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeForRadar(orgMetrics, benchmarkMetrics) {
  return METRIC_CONFIG.map(m => {
    const orgVal = orgMetrics[m.key];
    const indVal = benchmarkMetrics[m.key];
    const maxVal = Math.max(orgVal, indVal, 1);

    let orgNorm, indNorm;
    if (m.lowerIsBetter) {
      orgNorm = Math.max(0, 100 - (orgVal / maxVal) * 50);
      indNorm = Math.max(0, 100 - (indVal / maxVal) * 50);
    } else {
      orgNorm = (orgVal / maxVal) * 100;
      indNorm = (indVal / maxVal) * 100;
    }

    return {
      metric: m.label,
      'Your Org': Math.round(orgNorm),
      Industry: Math.round(indNorm),
    };
  });
}

function generateRecommendations(orgMetrics, benchmarkMetrics) {
  const recs = [];
  const delta = {};
  METRIC_CONFIG.forEach(m => {
    delta[m.key] = orgMetrics[m.key] - benchmarkMetrics[m.key];
  });

  if (delta.attritionRate > 0) {
    recs.push({
      type: 'warning',
      text: `Your attrition rate is ${delta.attritionRate.toFixed(1)}% above industry average. Focus on retention programs for high-risk departments.`,
    });
  } else if (delta.attritionRate < -2) {
    recs.push({
      type: 'success',
      text: `Your attrition rate is ${Math.abs(delta.attritionRate).toFixed(1)}% below industry average. Great retention performance!`,
    });
  }

  if (delta.avgSalary < 0) {
    recs.push({
      type: 'warning',
      text: `Average compensation is $${Math.abs(Math.round(delta.avgSalary / 1000))}k below industry benchmarks. Consider a market rate adjustment to stay competitive.`,
    });
  }

  if (delta.avgTenure < 0) {
    recs.push({
      type: 'warning',
      text: `Average tenure is ${Math.abs(delta.avgTenure).toFixed(1)} years below the industry norm. Invest in career development and growth paths.`,
    });
  } else if (delta.avgTenure > 1) {
    recs.push({
      type: 'success',
      text: `Average tenure exceeds the industry by ${delta.avgTenure.toFixed(1)} years, indicating strong employee loyalty.`,
    });
  }

  if (delta.engagementScore < 0) {
    recs.push({
      type: 'warning',
      text: `Engagement score is ${Math.abs(delta.engagementScore)} points below the industry. Prioritize work-life balance initiatives and manager training.`,
    });
  }

  if (delta.costPerHire > 0) {
    recs.push({
      type: 'info',
      text: `Your cost per hire is $${delta.costPerHire.toLocaleString()} above average. Review recruiting channels for efficiency gains.`,
    });
  }

  if (delta.timeToFill > 0) {
    recs.push({
      type: 'info',
      text: `Time to fill positions is ${delta.timeToFill} days above the benchmark. Streamline interview processes and build talent pipelines.`,
    });
  } else if (delta.timeToFill < -5) {
    recs.push({
      type: 'success',
      text: `You fill positions ${Math.abs(delta.timeToFill)} days faster than the industry. Excellent recruiting efficiency!`,
    });
  }

  if (recs.length === 0) {
    recs.push({
      type: 'success',
      text: 'Your organization is performing at or above industry benchmarks across all key metrics. Keep up the great work!',
    });
  }

  return recs;
}

const REC_ICONS = {
  warning: AlertCircle,
  success: CheckCircle2,
  info: Info,
};
const REC_COLORS = {
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};
const REC_ICON_COLORS = {
  warning: 'text-amber-500',
  success: 'text-green-500',
  info: 'text-blue-500',
};

export default function Benchmarking() {
  const { employees } = useData();
  const [industry, setIndustry] = useState('overall');

  const orgMetrics = useMemo(() => computeOrgMetrics(employees), [employees]);
  const benchmark = INDUSTRY_BENCHMARKS[industry];

  const radarData = useMemo(() => normalizeForRadar(orgMetrics, benchmark), [orgMetrics, benchmark]);
  const recommendations = useMemo(() => generateRecommendations(orgMetrics, benchmark), [orgMetrics, benchmark]);

  return (
    <div className="p-6 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Benchmarking
          </h1>
          <p className="text-sm text-gray-500 mt-1">Compare your HR metrics against industry benchmarks</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Compare with:</label>
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
          >
            {Object.entries(INDUSTRY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {METRIC_CONFIG.map(m => (
          <ComparisonCard
            key={m.key}
            metric={m}
            orgValue={orgMetrics[m.key]}
            industryValue={benchmark[m.key]}
          />
        ))}
      </div>

      {/* Radar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Radar</h2>
        <p className="text-xs text-gray-400 mb-4">
          Normalized scores (higher is better). For metrics where lower is better (attrition, cost, time), the scale is inverted.
        </p>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <Radar
                name="Your Org"
                dataKey="Your Org"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name="Industry"
                dataKey="Industry"
                stroke="#9ca3af"
                fill="#9ca3af"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recommendations</h2>
        <div className="space-y-3">
          {recommendations.map((rec, i) => {
            const Icon = REC_ICONS[rec.type];
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${REC_COLORS[rec.type]}`}>
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${REC_ICON_COLORS[rec.type]}`} />
                <p className="text-sm">{rec.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

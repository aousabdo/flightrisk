import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
  Printer, Star, Clock, DollarSign, Briefcase, MapPin,
  Heart, TrendingDown, AlertTriangle, CheckCircle, ArrowRight,
} from 'lucide-react';
import { formatCurrencyFull } from '../lib/costs';
import { getRiskLevel } from '../lib/scores';

const SEVERITY_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
const SEVERITY_BG = { High: 'bg-red-100 text-red-700', Medium: 'bg-amber-100 text-amber-700', Low: 'bg-green-100 text-green-700' };

function SeverityBadge({ level }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_BG[level]}`}>
      {level}
    </span>
  );
}

function Stars({ count }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= count ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </span>
  );
}

function MiniGauge({ probability }) {
  const pct = (probability || 0) * 100;
  const { color } = getRiskLevel(probability);
  const colorMap = { red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e' };
  const r = 40;
  const circ = Math.PI * r; // semi-circle
  const offset = circ - (probability * circ);

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke={colorMap[color]} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} />
        <text x="50" y="48" textAnchor="middle" fontSize="16" fontWeight="bold" fill={colorMap[color]}>
          {pct.toFixed(0)}%
        </text>
      </svg>
    </div>
  );
}

function categorizeFactors(featureExplanations) {
  const categories = {
    compensation: { label: 'Compensation', icon: DollarSign, factors: [], score: 0 },
    worklife: { label: 'Work-Life Balance', icon: Heart, factors: [], score: 0 },
    career: { label: 'Career Growth', icon: Briefcase, factors: [], score: 0 },
    environment: { label: 'Environment', icon: MapPin, factors: [], score: 0 },
  };

  const compKeywords = ['income', 'salary', 'hike', 'stock', 'rate', 'hourly', 'monthly'];
  const worklifeKeywords = ['overtime', 'travel', 'work-life', 'worklife', 'balance', 'hours'];
  const careerKeywords = ['level', 'promotion', 'role', 'years in', 'years since', 'involvement', 'training'];
  const envKeywords = ['department', 'distance', 'satisfaction', 'environment', 'relationship', 'manager'];

  if (!featureExplanations) return categories;

  featureExplanations.forEach(f => {
    const desc = (f.description || f.feature || '').toLowerCase();
    const absWeight = Math.abs(f.weight || 0);
    if (f.weight <= 0) return; // only attrition-supporting factors

    if (compKeywords.some(k => desc.includes(k))) {
      categories.compensation.factors.push(f);
      categories.compensation.score += absWeight;
    } else if (worklifeKeywords.some(k => desc.includes(k))) {
      categories.worklife.factors.push(f);
      categories.worklife.score += absWeight;
    } else if (careerKeywords.some(k => desc.includes(k))) {
      categories.career.factors.push(f);
      categories.career.score += absWeight;
    } else {
      categories.environment.factors.push(f);
      categories.environment.score += absWeight;
    }
  });

  // Assign severity
  Object.values(categories).forEach(cat => {
    if (cat.factors.length === 0) cat.severity = 'Low';
    else if (cat.score > 0.1) cat.severity = 'High';
    else if (cat.score > 0.03) cat.severity = 'Medium';
    else cat.severity = 'Low';
  });

  return categories;
}

function getInterventions(categories, employee) {
  const interventions = [];

  if (categories.compensation.severity !== 'Low') {
    interventions.push({
      category: 'Compensation',
      action: 'Review salary against market benchmarks and consider equity grant or retention bonus',
      priority: categories.compensation.severity === 'High' ? 5 : 3,
      impact: 'High - addresses primary financial motivator',
      timeline: '30 days',
    });
    if (employee.MonthlyIncome < 5000) {
      interventions.push({
        category: 'Compensation',
        action: 'Propose salary adjustment to bring compensation to market median for role',
        priority: 4,
        impact: 'High - direct retention lever',
        timeline: '60 days',
      });
    }
  }

  if (categories.worklife.severity !== 'Low') {
    if (employee.OverTime === 'Yes') {
      interventions.push({
        category: 'Work-Life',
        action: 'Reduce overtime hours and consider workload redistribution across team',
        priority: categories.worklife.severity === 'High' ? 5 : 4,
        impact: 'High - prevents burnout',
        timeline: '30 days',
      });
    }
    if (employee.BusinessTravel === 'Travel_Frequently') {
      interventions.push({
        category: 'Work-Life',
        action: 'Offer remote work options and reduce travel frequency by 50%',
        priority: 4,
        impact: 'Medium - improves daily quality of life',
        timeline: '30 days',
      });
    }
    interventions.push({
      category: 'Work-Life',
      action: 'Implement flexible schedule or compressed work week option',
      priority: 3,
      impact: 'Medium - increases autonomy and satisfaction',
      timeline: '60 days',
    });
  }

  if (categories.career.severity !== 'Low') {
    interventions.push({
      category: 'Career',
      action: 'Discuss promotion timeline and assign a high-visibility stretch project',
      priority: categories.career.severity === 'High' ? 5 : 4,
      impact: 'High - addresses career stagnation',
      timeline: '30 days',
    });
    interventions.push({
      category: 'Career',
      action: 'Create Individual Development Plan with quarterly milestones and mentorship pairing',
      priority: 3,
      impact: 'Medium - long-term engagement',
      timeline: '60 days',
    });
  }

  if (categories.environment.severity !== 'Low') {
    if (employee.DistanceFromHome > 15) {
      interventions.push({
        category: 'Environment',
        action: 'Offer hybrid/remote arrangement to reduce commute burden',
        priority: 4,
        impact: 'Medium - reduces daily friction',
        timeline: '30 days',
      });
    }
    interventions.push({
      category: 'Environment',
      action: 'Schedule skip-level meeting and peer feedback session to improve team dynamics',
      priority: 3,
      impact: 'Medium - addresses relationship and culture factors',
      timeline: '60 days',
    });
  }

  if (interventions.length === 0) {
    interventions.push({
      category: 'General',
      action: 'Schedule 1:1 stay interview to identify hidden concerns and demonstrate investment',
      priority: 3,
      impact: 'Medium - proactive engagement',
      timeline: '30 days',
    });
  }

  return interventions.sort((a, b) => b.priority - a.priority);
}

export default function RetentionPlaybook({ employee, explanations }) {
  const expl = explanations[employee.Name] || [];

  const categories = useMemo(() => categorizeFactors(expl), [expl]);
  const interventions = useMemo(() => getInterventions(categories, employee), [categories, employee]);

  const currentRisk = (employee.prob_of_attrition || 0) * 100;
  const interventionCount = interventions.length;
  const reductionFactor = Math.max(0.4, 0.7 - interventionCount * 0.05);
  const projectedRisk = currentRisk * reductionFactor;
  const costSavings = (employee.attrition_cost || 0) * (1 - reductionFactor);

  const riskDonut = [
    { name: 'Risk', value: Math.round(currentRisk) },
    { name: 'Safe', value: 100 - Math.round(currentRisk) },
  ];

  const handlePrint = () => window.print();

  return (
    <div className="bg-white text-gray-800 print:text-black">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Retention Playbook for {employee.Name}</h2>
          <p className="text-sm text-gray-500">{employee.JobRole} - {employee.Department}</p>
        </div>
        <div className="flex items-center gap-4">
          <MiniGauge probability={employee.prob_of_attrition} />
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium print:hidden">
            <Printer className="w-4 h-4" /> Print Playbook
          </button>
        </div>
      </div>

      {/* Root Cause Analysis */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Root Cause Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(categories).map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-sm">{cat.label}</span>
                  </div>
                  <SeverityBadge level={cat.severity} />
                </div>
                {cat.factors.length > 0 ? (
                  <ul className="text-xs text-gray-600 space-y-1">
                    {cat.factors.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        {f.description || f.feature} ({(f.weight * 100).toFixed(1)}%)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 italic">No significant factors detected</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Interventions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" /> Recommended Interventions
        </h3>
        <div className="space-y-2">
          {interventions.map((iv, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 flex items-start gap-3">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium whitespace-nowrap mt-0.5">
                {iv.category}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{iv.action}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">Priority:</span>
                    <Stars count={iv.priority} />
                  </div>
                  <span className="text-[10px] text-gray-500">Impact: {iv.impact}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-600 font-medium whitespace-nowrap">
                <Clock className="w-3 h-3" /> {iv.timeline}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 30-60-90 Day Plan */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-500" /> 30-60-90 Day Plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">0-30 Days</span>
              <span className="text-xs text-blue-700 font-medium">Immediate Actions</span>
            </div>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-1">&#8226;</span>Schedule candid stay interview</li>
              <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-1">&#8226;</span>Address top-priority quick wins</li>
              {interventions.filter(iv => iv.timeline === '30 days').slice(0, 2).map((iv, i) => (
                <li key={i} className="flex items-start gap-1.5"><span className="text-blue-500 mt-1">&#8226;</span>{iv.action}</li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-amber-200 bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded">30-60 Days</span>
              <span className="text-xs text-amber-700 font-medium">Medium-Term</span>
            </div>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li className="flex items-start gap-1.5"><span className="text-amber-500 mt-1">&#8226;</span>Review progress on initial actions</li>
              {interventions.filter(iv => iv.timeline === '60 days').slice(0, 2).map((iv, i) => (
                <li key={i} className="flex items-start gap-1.5"><span className="text-amber-500 mt-1">&#8226;</span>{iv.action}</li>
              ))}
              <li className="flex items-start gap-1.5"><span className="text-amber-500 mt-1">&#8226;</span>Begin structural process improvements</li>
            </ul>
          </div>
          <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">60-90 Days</span>
              <span className="text-xs text-green-700 font-medium">Long-Term</span>
            </div>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li className="flex items-start gap-1.5"><span className="text-green-500 mt-1">&#8226;</span>Evaluate intervention effectiveness</li>
              <li className="flex items-start gap-1.5"><span className="text-green-500 mt-1">&#8226;</span>Formalize role or compensation changes</li>
              <li className="flex items-start gap-1.5"><span className="text-green-500 mt-1">&#8226;</span>Establish ongoing check-in cadence</li>
              <li className="flex items-start gap-1.5"><span className="text-green-500 mt-1">&#8226;</span>Document outcomes for team playbook</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Expected Impact */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-emerald-500" /> Expected Impact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Current Risk</p>
            <div className="flex justify-center">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={riskDonut} dataKey="value" cx="50%" cy="50%" outerRadius={40} innerRadius={25}>
                    <Cell fill="#ef4444" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-2xl font-bold text-red-600">{currentRisk.toFixed(0)}%</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Projected Risk After Interventions</p>
            <div className="flex justify-center">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={[{ value: Math.round(projectedRisk) }, { value: 100 - Math.round(projectedRisk) }]} dataKey="value" cx="50%" cy="50%" outerRadius={40} innerRadius={25}>
                    <Cell fill="#22c55e" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-2xl font-bold text-green-600">{projectedRisk.toFixed(0)}%</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center flex flex-col justify-center">
            <p className="text-xs text-gray-500 mb-1">Projected Cost Savings</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrencyFull(costSavings)}</p>
            <p className="text-xs text-gray-400 mt-1">Based on {interventionCount} interventions</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
} from 'recharts';
import {
  ArrowLeft, Briefcase, MapPin, Clock, DollarSign,
  GraduationCap, Heart, Lightbulb, Target, Cog,
} from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { formatCurrencyFull } from '../lib/costs';
import { getRiskLevel } from '../lib/scores';

function RiskGauge({ probability }) {
  const pct = (probability || 0) * 100;
  const { level, color } = getRiskLevel(probability);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (probability * circumference);

  const colorMap = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={colorMap[color]}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="gauge-animate"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{pct.toFixed(0)}%</span>
          <span className="text-xs text-slate-400">{level} Risk</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 text-slate-400 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function RecommendationCard({ icon: Icon, title, text, color }) {
  const colorCls = {
    blue: 'border-blue-500/30 bg-blue-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    green: 'border-emerald-500/30 bg-emerald-500/5',
  };
  return (
    <div className={`border rounded-xl p-4 ${colorCls[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-300" />
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{text || 'No recommendation available.'}</p>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employees, explanations } = useData();

  const employee = useMemo(() =>
    employees.find(e => String(e.EmployeeNumber) === id),
    [employees, id]
  );

  const featureData = useMemo(() => {
    if (!employee) return [];
    const expl = explanations[employee.Name];
    if (!expl) return [];
    // Deduplicate by feature and take top 10 by absolute weight
    const seen = new Set();
    return expl
      .filter(f => {
        if (seen.has(f.feature)) return false;
        seen.add(f.feature);
        return true;
      })
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .slice(0, 10)
      .map(f => ({
        feature: f.description || f.feature,
        weight: f.weight,
        positive: f.weight > 0,
      }));
  }, [employee, explanations]);

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p>Employee not found</p>
        <button onClick={() => navigate('/employees')} className="mt-4 text-blue-400 hover:underline text-sm">
          Back to employees
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{employee.Name}</h2>
          <p className="text-sm text-slate-400">{employee.JobRole} &middot; {employee.Department}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          employee.label === 'Yes'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        }`}>
          {employee.label === 'Yes' ? 'Predicted to Leave' : 'Predicted to Stay'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Risk Gauge + Stats */}
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col items-center">
            <RiskGauge probability={employee.prob_of_attrition} />
            <p className="text-xs text-slate-500 mt-3">Attrition Probability</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Briefcase} label="Job Level" value={employee.JobLevel} />
            <StatCard icon={Clock} label="Tenure" value={`${employee.YearsAtCompany} years`} />
            <StatCard icon={DollarSign} label="Monthly Income" value={formatCurrencyFull(employee.MonthlyIncome)} />
            <StatCard icon={MapPin} label="Distance" value={`${employee.DistanceFromHome} mi`} />
            <StatCard icon={GraduationCap} label="Education" value={employee.Education} />
            <StatCard icon={Heart} label="Work-Life" value={employee.WorkLifeBalance} />
            <StatCard icon={Target} label="Performance" value={employee.PerformanceRating} />
            <StatCard icon={Cog} label="Overtime" value={employee.OverTime} />
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Cost Exposure</h4>
            <p className="text-2xl font-bold text-white">{formatCurrencyFull(employee.attrition_cost || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Estimated cost if employee leaves</p>
          </div>
        </div>

        {/* Middle: Feature Importance */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              Key Risk Factors
            </h3>
            {featureData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={featureData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="feature" type="category" stroke="#64748b" fontSize={10} width={180} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    formatter={(val) => [val.toFixed(4), 'Weight']}
                  />
                  <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                    {featureData.map((entry, i) => (
                      <Cell key={i} fill={entry.positive ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                No explanation data available for this employee.
              </p>
            )}
            <div className="flex items-center justify-center gap-6 mt-3">
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-3 h-3 rounded bg-red-500" /> Supports Attrition
              </span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-3 h-3 rounded bg-blue-500" /> Contradicts Attrition
              </span>
            </div>
          </div>

          {/* Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RecommendationCard
              icon={Lightbulb}
              title="Personal Development"
              text={employee.personal_development_strategy}
              color="blue"
            />
            <RecommendationCard
              icon={Target}
              title="Professional Growth"
              text={employee.professional_development_strategy}
              color="purple"
            />
            <RecommendationCard
              icon={Cog}
              title="Work Environment"
              text={employee.work_environment_strategy}
              color="green"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

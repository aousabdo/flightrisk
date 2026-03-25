import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  X, Briefcase, MapPin, Clock, DollarSign,
  GraduationCap, Heart, Lightbulb, Target, Cog, UserPlus,
  FileText, ArrowLeft,
} from 'lucide-react';
import { useModal } from '../hooks/useModal';
import { useCompare } from '../hooks/useCompare';
import { useData } from '../hooks/useEmployees';
import { formatCurrencyFull } from '../lib/costs';
import { getRiskLevel } from '../lib/scores';
import RetentionPlaybook from './RetentionPlaybook';

function RiskGauge({ probability }) {
  const pct = (probability || 0) * 100;
  const { level, color } = getRiskLevel(probability);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (probability * circumference);
  const colorMap = { red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e' };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
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
          <span className="text-2xl font-bold text-white">{pct.toFixed(0)}%</span>
          <span className="text-[10px] text-slate-400">{level} Risk</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
        <Icon className="w-3 h-3" />
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-xs font-semibold text-white">{value}</p>
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
    <div className={`border rounded-lg p-3 ${colorCls[color]}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-slate-300" />
        <h4 className="text-xs font-semibold text-white">{title}</h4>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{text || 'No recommendation available.'}</p>
    </div>
  );
}

export default function EmployeeModal() {
  const { selectedEmployee: employee, closeEmployee } = useModal();
  const { addToCompare, compareList } = useCompare();
  const { explanations } = useData();
  const [showPlaybook, setShowPlaybook] = useState(false);

  // Reset playbook view when employee changes
  useEffect(() => {
    setShowPlaybook(false);
  }, [employee?.EmployeeNumber]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') closeEmployee();
    }
    if (employee) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [employee, closeEmployee]);

  const featureData = useMemo(() => {
    if (!employee) return [];
    const expl = explanations[employee.Name];
    if (!expl) return [];
    const seen = new Set();
    return expl
      .filter(f => { if (seen.has(f.feature)) return false; seen.add(f.feature); return true; })
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .slice(0, 8)
      .map(f => ({
        name: f.description || f.feature,
        weight: f.weight,
      }));
  }, [employee, explanations]);

  if (!employee) return null;

  const isInCompare = compareList.some(e => e.EmployeeNumber === employee.EmployeeNumber);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
        onClick={closeEmployee}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-slate-900 z-[70] shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-center gap-3 z-10">
          <img
            src={`https://i.pravatar.cc/150?u=${encodeURIComponent(employee.Name)}`}
            alt={employee.Name}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-700"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{employee.Name}</h2>
            <p className="text-xs text-slate-400 truncate">{employee.JobRole} &middot; {employee.Department}</p>
          </div>
          <button
            onClick={() => addToCompare(employee)}
            disabled={isInCompare || compareList.length >= 3}
            className={`p-1.5 rounded-lg transition-colors ${
              isInCompare ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isInCompare ? 'Added to compare' : 'Add to compare'}
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={closeEmployee}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Playbook Toggle */}
          {showPlaybook ? (
            <div>
              <button onClick={() => setShowPlaybook(false)}
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 mb-4 print:hidden">
                <ArrowLeft className="w-4 h-4" /> Back to Profile
              </button>
              <RetentionPlaybook employee={employee} explanations={explanations} />
            </div>
          ) : (
          <>
          {/* Risk Prediction Badge */}
          <div className="flex items-center justify-between">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              employee.label === 'Yes'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {employee.label === 'Yes' ? 'Predicted to Leave' : 'Predicted to Stay'}
            </div>
          </div>

          {/* Risk Gauge */}
          <div className="flex justify-center">
            <RiskGauge probability={employee.prob_of_attrition} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Briefcase} label="Job Level" value={employee.JobLevel} />
            <StatCard icon={Clock} label="Tenure" value={`${employee.YearsAtCompany} yrs`} />
            <StatCard icon={DollarSign} label="Monthly Income" value={formatCurrencyFull(employee.MonthlyIncome)} />
            <StatCard icon={MapPin} label="Distance" value={`${employee.DistanceFromHome} mi`} />
            <StatCard icon={GraduationCap} label="Education" value={employee.Education} />
            <StatCard icon={Heart} label="Work-Life" value={employee.WorkLifeBalance} />
            <StatCard icon={Target} label="Performance" value={employee.PerformanceRating} />
            <StatCard icon={Cog} label="Overtime" value={employee.OverTime} />
          </div>

          {/* Risk Factors Chart */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
              Top Risk Factors
            </h3>
            {featureData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={featureData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={140} />
                  <ReferenceLine x={0} stroke="#475569" />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                    formatter={v => [v.toFixed(4), 'Weight']}
                  />
                  <Bar dataKey="weight" radius={[0, 3, 3, 0]}>
                    {featureData.map((entry, i) => (
                      <Cell key={i} fill={entry.weight > 0 ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">No data available.</p>
            )}
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-red-500" /> Supports Attrition
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Contradicts
              </span>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Recommendations</h3>
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

          {/* Cost Exposure */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <h4 className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Cost Exposure</h4>
            <p className="text-xl font-bold text-white">{formatCurrencyFull(employee.attrition_cost || 0)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Estimated cost if employee leaves</p>
          </div>

          {/* Generate Playbook Button */}
          <button onClick={() => setShowPlaybook(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            <FileText className="w-4 h-4" /> Generate Retention Playbook
          </button>
          </>
          )}
        </div>
      </div>
    </>
  );
}

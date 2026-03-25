import { useMemo } from 'react';
import {
  Building2, Clock, DollarSign, Calendar, UserPlus, TrendingDown,
} from 'lucide-react';
import { formatCurrency } from '../lib/costs';

const SEVERITY_STYLES = {
  Critical: 'bg-red-50 text-red-600 border-red-200',
  Warning: 'bg-amber-50 text-amber-600 border-amber-200',
  Info: 'bg-blue-50 text-blue-600 border-blue-200',
};

const BADGE_STYLES = {
  Critical: 'bg-red-100 text-red-700',
  Warning: 'bg-amber-100 text-amber-700',
  Info: 'bg-blue-100 text-blue-700',
};

function InsightCard({ icon: Icon, severity, text, metric }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border ${SEVERITY_STYLES[severity]}`}>
      <div className="shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{text}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[severity]}`}>
          {severity}
        </span>
        {metric && (
          <span className="text-xs font-bold whitespace-nowrap">{metric}</span>
        )}
      </div>
    </div>
  );
}

export default function InsightEngine({ employees }) {
  const insights = useMemo(() => {
    if (!employees || !employees.length) return [];
    const results = [];
    const atRisk = employees.filter(e => e.label === 'Yes');
    const totalCount = employees.length;
    const orgAttritionRate = ((atRisk.length / totalCount) * 100);

    // 1. Highest Risk Department
    const deptStats = {};
    employees.forEach(e => {
      if (!deptStats[e.Department]) deptStats[e.Department] = { total: 0, atRisk: 0 };
      deptStats[e.Department].total++;
      if (e.label === 'Yes') deptStats[e.Department].atRisk++;
    });
    const deptEntries = Object.entries(deptStats).map(([name, d]) => ({
      name,
      rate: (d.atRisk / d.total) * 100,
      atRisk: d.atRisk,
      total: d.total,
    }));
    deptEntries.sort((a, b) => b.rate - a.rate);
    if (deptEntries.length > 0) {
      const top = deptEntries[0];
      results.push({
        icon: Building2,
        severity: top.rate > orgAttritionRate * 1.3 ? 'Critical' : 'Warning',
        text: `${top.name} has the highest attrition rate at ${top.rate.toFixed(0)}%, significantly above the org average of ${orgAttritionRate.toFixed(0)}%.`,
        metric: `${top.rate.toFixed(0)}%`,
      });
    }

    // 2. Overtime Impact
    const otYes = employees.filter(e => e.OverTime === 'Yes');
    const otNo = employees.filter(e => e.OverTime === 'No');
    const otYesRate = otYes.length > 0 ? (otYes.filter(e => e.label === 'Yes').length / otYes.length) * 100 : 0;
    const otNoRate = otNo.length > 0 ? (otNo.filter(e => e.label === 'Yes').length / otNo.length) * 100 : 0;
    if (otNoRate > 0) {
      const multiplier = (otYesRate / otNoRate).toFixed(1);
      results.push({
        icon: Clock,
        severity: parseFloat(multiplier) >= 2 ? 'Critical' : 'Warning',
        text: `Employees working overtime are ${multiplier}x more likely to leave (${otYesRate.toFixed(0)}% vs ${otNoRate.toFixed(0)}% attrition rate).`,
        metric: `${multiplier}x`,
      });
    }

    // 3. Salary Gap Alert
    const roleIncomes = {};
    employees.forEach(e => {
      if (!roleIncomes[e.JobRole]) roleIncomes[e.JobRole] = { safe: [], atRisk: [] };
      if (e.label === 'Yes') roleIncomes[e.JobRole].atRisk.push(e.MonthlyIncome);
      else roleIncomes[e.JobRole].safe.push(e.MonthlyIncome);
    });
    let maxGapRole = null;
    let maxGap = 0;
    Object.entries(roleIncomes).forEach(([role, data]) => {
      if (data.atRisk.length >= 3 && data.safe.length >= 3) {
        const avgAtRisk = data.atRisk.reduce((s, v) => s + v, 0) / data.atRisk.length;
        const avgSafe = data.safe.reduce((s, v) => s + v, 0) / data.safe.length;
        const gap = avgSafe - avgAtRisk;
        if (gap > maxGap) {
          maxGap = gap;
          maxGapRole = role;
        }
      }
    });
    if (maxGapRole && maxGap > 0) {
      results.push({
        icon: DollarSign,
        severity: maxGap > 2000 ? 'Critical' : 'Warning',
        text: `At-risk ${maxGapRole}s earn $${Math.round(maxGap).toLocaleString()} less on average than their retained peers.`,
        metric: `-$${Math.round(maxGap).toLocaleString()}`,
      });
    }

    // 4. Tenure Risk Peak
    const tenureBuckets = [
      { label: '<1 year', min: 0, max: 1 },
      { label: '1-2 years', min: 1, max: 2 },
      { label: '2-5 years', min: 2, max: 5 },
      { label: '5-10 years', min: 5, max: 10 },
      { label: '10+ years', min: 10, max: Infinity },
    ];
    let peakBucket = null;
    let peakRate = 0;
    tenureBuckets.forEach(bucket => {
      const inBucket = employees.filter(e => e.YearsAtCompany >= bucket.min && e.YearsAtCompany < bucket.max);
      if (inBucket.length >= 5) {
        const rate = (inBucket.filter(e => e.label === 'Yes').length / inBucket.length) * 100;
        if (rate > peakRate) {
          peakRate = rate;
          peakBucket = bucket.label;
        }
      }
    });
    if (peakBucket) {
      results.push({
        icon: Calendar,
        severity: peakRate > 25 ? 'Warning' : 'Info',
        text: `Employees with ${peakBucket} tenure show the highest flight risk at ${peakRate.toFixed(0)}%.`,
        metric: `${peakRate.toFixed(0)}%`,
      });
    }

    // 5. New Hire Warning
    const newHires = employees.filter(e => e.YearsAtCompany < 1);
    const newHiresAtRisk = newHires.filter(e => e.label === 'Yes');
    if (newHires.length >= 3) {
      const pct = ((newHiresAtRisk.length / newHires.length) * 100).toFixed(0);
      results.push({
        icon: UserPlus,
        severity: newHiresAtRisk.length >= 5 ? 'Warning' : 'Info',
        text: `${newHiresAtRisk.length} of ${newHires.length} new hires (${pct}%) are already showing flight risk signals.`,
        metric: `${pct}%`,
      });
    }

    // 6. Cost Exposure Trend
    const totalCost = atRisk.reduce((sum, e) => sum + (e.attrition_cost || 0), 0);
    if (totalCost > 0) {
      results.push({
        icon: TrendingDown,
        severity: totalCost > 5000000 ? 'Critical' : 'Warning',
        text: `If current attrition trends continue, the organization faces ${formatCurrency(totalCost)} in turnover costs over the next 12 months.`,
        metric: formatCurrency(totalCost),
      });
    }

    return results;
  }, [employees]);

  if (!insights.length) return null;

  return (
    <div className="space-y-3">
      {insights.map((insight, i) => (
        <InsightCard key={i} {...insight} />
      ))}
    </div>
  );
}

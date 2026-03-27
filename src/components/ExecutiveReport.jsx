import { useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { formatCurrency, formatCurrencyFull } from '../lib/costs';

export default function ExecutiveReport({ onClose }) {
  const { employees, stats } = useData();

  const report = useMemo(() => {
    if (!employees.length || !stats) return null;

    const atRisk = employees.filter(e => e.label === 'Yes');
    const totalCost = atRisk.reduce((sum, e) => sum + (e.attrition_cost || 0), 0);
    const avgRisk = employees.reduce((sum, e) => sum + (e.prob_of_attrition || 0), 0) / employees.length;
    const deptCount = Object.keys(stats.byDept).length;

    // Department breakdown
    const deptRows = Object.entries(stats.byDept)
      .map(([name, d]) => ({
        name,
        headcount: d.total,
        atRisk: d.atRisk,
        rate: ((d.atRisk / d.total) * 100).toFixed(1),
        cost: d.cost,
      }))
      .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

    // Top 10 highest risk
    const top10 = [...employees]
      .sort((a, b) => (b.prob_of_attrition || 0) - (a.prob_of_attrition || 0))
      .slice(0, 10)
      .map(e => ({
        name: e.Name,
        department: e.Department,
        role: e.JobRole,
        risk: ((e.prob_of_attrition || 0) * 100).toFixed(1),
        cost: e.attrition_cost || 0,
      }));

    // AI Insights
    const insights = [];
    const orgRate = (atRisk.length / employees.length) * 100;

    // Highest risk dept
    const topDept = deptRows[0];
    if (topDept) {
      insights.push(`${topDept.name} has the highest attrition rate at ${topDept.rate}%, above the org average of ${orgRate.toFixed(1)}%.`);
    }

    // Overtime
    const otYes = employees.filter(e => e.OverTime === 'Yes');
    const otNo = employees.filter(e => e.OverTime === 'No');
    const otYesRate = otYes.length > 0 ? (otYes.filter(e => e.label === 'Yes').length / otYes.length) * 100 : 0;
    const otNoRate = otNo.length > 0 ? (otNo.filter(e => e.label === 'Yes').length / otNo.length) * 100 : 0;
    if (otNoRate > 0) {
      insights.push(`Employees working overtime are ${(otYesRate / otNoRate).toFixed(1)}x more likely to leave (${otYesRate.toFixed(0)}% vs ${otNoRate.toFixed(0)}%).`);
    }

    // Tenure
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
        if (rate > peakRate) { peakRate = rate; peakBucket = bucket.label; }
      }
    });
    if (peakBucket) {
      insights.push(`Employees with ${peakBucket} tenure show the highest flight risk at ${peakRate.toFixed(0)}%.`);
    }

    // New hires
    const newHires = employees.filter(e => e.YearsAtCompany < 1);
    const newHiresAtRisk = newHires.filter(e => e.label === 'Yes');
    if (newHires.length >= 3) {
      insights.push(`${newHiresAtRisk.length} of ${newHires.length} new hires (${((newHiresAtRisk.length / newHires.length) * 100).toFixed(0)}%) are already showing flight risk signals.`);
    }

    insights.push(`If current attrition trends continue, the organization faces ${formatCurrency(totalCost)} in turnover costs over the next 12 months.`);

    // Recommendations
    const recommendations = [];
    if (otYesRate > otNoRate * 1.5) {
      recommendations.push('Review overtime policies and workload distribution across departments.');
    }
    if (topDept && parseFloat(topDept.rate) > orgRate * 1.2) {
      recommendations.push(`Conduct department-specific engagement survey for ${topDept.name}.`);
    }
    // Salary gap check
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
        if (gap > maxGap) { maxGap = gap; maxGapRole = role; }
      }
    });
    if (maxGapRole) {
      recommendations.push(`Review compensation benchmarks for ${maxGapRole}s — at-risk employees earn significantly less.`);
    }
    recommendations.push('Implement quarterly retention check-ins for all employees above 60% risk.');
    recommendations.push('Establish a mentorship program for new hires in their first 90 days to reduce early attrition.');

    return {
      totalEmployees: employees.length,
      atRiskCount: atRisk.length,
      attritionRate: orgRate.toFixed(1),
      totalCost,
      avgRisk: (avgRisk * 100).toFixed(1),
      deptCount,
      deptRows,
      top10,
      insights,
      recommendations,
    };
  }, [employees, stats]);

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center overflow-y-auto" role="dialog" aria-modal="true" aria-label="Executive report">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .executive-report, .executive-report * { visibility: visible !important; }
          .executive-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 40px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          table { page-break-inside: avoid; }
        }
      `}</style>

      <div className="executive-report bg-white w-full max-w-4xl my-8 mx-4 rounded-lg shadow-2xl">
        {/* Action buttons (hidden in print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-10" style={{ fontSize: 14, lineHeight: 1.6 }}>
          {/* Cover Section */}
          <div className="text-center pb-8 mb-8 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-800 mb-2" style={{ fontSize: 28 }}>FlightRisk Executive Report</h1>
            <p className="text-gray-600 text-lg">Prepared for: Organization Name</p>
            <p className="text-gray-500 mt-1">Date: March 25, 2026</p>
            <p className="mt-3 text-xs font-semibold text-red-600 uppercase tracking-widest">Confidential</p>
          </div>

          {/* Key Metrics Summary */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontSize: 20 }}>Key Metrics Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <MetricBox label="Total Workforce" value={report.totalEmployees.toLocaleString()} />
              <MetricBox label="At-Risk Employees" value={report.atRiskCount.toLocaleString()} />
              <MetricBox label="Attrition Rate" value={`${report.attritionRate}%`} />
              <MetricBox label="Total Cost Exposure" value={formatCurrency(report.totalCost)} />
              <MetricBox label="Avg Risk Score" value={`${report.avgRisk}%`} />
              <MetricBox label="Departments" value={report.deptCount} />
            </div>
          </section>

          {/* Department Breakdown */}
          <section className="mb-10 print-break">
            <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontSize: 20 }}>Department Breakdown</h2>
            <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-700">Department</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Headcount</th>
                  <th className="text-right py-2 font-semibold text-gray-700">At Risk</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Rate %</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Cost Exposure</th>
                </tr>
              </thead>
              <tbody>
                {report.deptRows.map((d, i) => (
                  <tr key={d.name} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-gray-50' : ''}`}>
                    <td className="py-2 text-gray-800">{d.name}</td>
                    <td className="py-2 text-right text-gray-600">{d.headcount}</td>
                    <td className="py-2 text-right text-gray-600">{d.atRisk}</td>
                    <td className="py-2 text-right font-medium text-gray-800">{d.rate}%</td>
                    <td className="py-2 text-right text-gray-600">{formatCurrencyFull(d.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>

          {/* Top 10 Highest Risk */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontSize: 20 }}>Top 10 Highest Risk Employees</h2>
            <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Department</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Role</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Risk %</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Cost</th>
                </tr>
              </thead>
              <tbody>
                {report.top10.map((e, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-gray-50' : ''}`}>
                    <td className="py-2 text-gray-800 font-medium">{e.name}</td>
                    <td className="py-2 text-gray-600">{e.department}</td>
                    <td className="py-2 text-gray-600">{e.role}</td>
                    <td className="py-2 text-right font-bold text-red-600">{e.risk}%</td>
                    <td className="py-2 text-right text-gray-600">{formatCurrencyFull(e.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>

          {/* Key Findings */}
          <section className="mb-10 print-break">
            <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontSize: 20 }}>Key Findings</h2>
            <ul className="space-y-2">
              {report.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                  <span className="text-gray-700">{insight}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Recommendations */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-4" style={{ fontSize: 20 }}>Recommendations</h2>
            <ol className="space-y-2 list-decimal list-inside">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="text-gray-700">{rec}</li>
              ))}
            </ol>
          </section>

          {/* Footer */}
          <div className="pt-6 mt-10 border-t-2 border-gray-300 text-center">
            <p className="text-xs text-gray-400">
              Generated by FlightRisk | &copy; 2026 Analytica Data Science Solution
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

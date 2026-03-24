import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  ChevronRight, ChevronDown, Building2, Briefcase, User, Layers,
  AlertTriangle, Users, DollarSign, TrendingUp,
} from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { formatCurrency } from '../lib/costs';

const RISK_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const DEPT_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b'];

function TreeNode({ label, icon: Icon, children, level = 0, badge, badgeColor, riskPct, defaultOpen = false, count }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = children && children.length > 0;

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={`flex items-center gap-2 w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors group`}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {hasChildren ? (
          open
            ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-gray-600" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
          level === 0 ? 'bg-blue-100 text-blue-600' :
          level === 1 ? 'bg-purple-100 text-purple-600' :
          level === 2 ? 'bg-cyan-100 text-cyan-600' :
          level === 3 ? 'bg-amber-100 text-amber-600' :
          'bg-gray-100 text-gray-500'
        }`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className={`text-sm truncate ${level < 2 ? 'font-medium text-gray-800' : 'text-gray-600'}`}>{label}</span>
        {count !== undefined && <span className="text-xs text-gray-400 ml-1">({count})</span>}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {riskPct !== undefined && (
            <div className="w-20 flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(riskPct, 100)}%`,
                    backgroundColor: riskPct >= 20 ? RISK_COLORS.high : riskPct >= 10 ? RISK_COLORS.medium : RISK_COLORS.low,
                  }}
                />
              </div>
            </div>
          )}
          {badge !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
              badgeColor === 'red' ? 'bg-red-50 text-red-600 ring-1 ring-red-200' :
              badgeColor === 'yellow' ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' :
              badgeColor === 'green' ? 'bg-green-50 text-green-600 ring-1 ring-green-200' :
              'bg-gray-50 text-gray-500 ring-1 ring-gray-200'
            }`}>
              {badge}
            </span>
          )}
        </div>
      </button>
      {open && hasChildren && (
        <div className="border-l border-gray-100" style={{ marginLeft: `${level * 24 + 20}px` }}>
          {children}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          color === 'blue' ? 'bg-blue-100 text-blue-600' :
          color === 'red' ? 'bg-red-100 text-red-600' :
          color === 'green' ? 'bg-green-100 text-green-600' :
          'bg-purple-100 text-purple-600'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

export default function DepartmentView() {
  const { employees, loading } = useData();
  const [selectedDept, setSelectedDept] = useState(null);

  const tree = useMemo(() => {
    const depts = {};
    employees.forEach(e => {
      const dept = e.Department;
      const role = e.JobRole;
      const level = `Level ${e.JobLevel}`;
      if (!depts[dept]) depts[dept] = {};
      if (!depts[dept][role]) depts[dept][role] = {};
      if (!depts[dept][role][level]) depts[dept][role][level] = [];
      depts[dept][role][level].push(e);
    });
    return depts;
  }, [employees]);

  const deptSummary = useMemo(() => {
    const summary = {};
    employees.forEach(e => {
      if (!summary[e.Department]) summary[e.Department] = { total: 0, atRisk: 0, cost: 0 };
      summary[e.Department].total++;
      if (e.label === 'Yes') {
        summary[e.Department].atRisk++;
        summary[e.Department].cost += e.attrition_cost || 0;
      }
    });
    return summary;
  }, [employees]);

  const deptPieData = useMemo(() =>
    Object.entries(deptSummary).map(([name, d]) => ({ name, value: d.total })),
    [deptSummary]
  );

  const deptRiskBar = useMemo(() =>
    Object.entries(deptSummary)
      .map(([name, d]) => ({ name, atRisk: d.atRisk, safe: d.total - d.atRisk, rate: ((d.atRisk / d.total) * 100).toFixed(1) }))
      .sort((a, b) => b.atRisk - a.atRisk),
    [deptSummary]
  );

  const selectedDeptData = useMemo(() => {
    if (!selectedDept) return null;
    const emps = employees.filter(e => e.Department === selectedDept);
    const byRole = {};
    emps.forEach(e => {
      if (!byRole[e.JobRole]) byRole[e.JobRole] = { total: 0, atRisk: 0 };
      byRole[e.JobRole].total++;
      if (e.label === 'Yes') byRole[e.JobRole].atRisk++;
    });
    return Object.entries(byRole)
      .map(([name, d]) => ({ name, atRisk: d.atRisk, safe: d.total - d.atRisk }))
      .sort((a, b) => b.atRisk - a.atRisk);
  }, [employees, selectedDept]);

  function getRiskBadge(emps) {
    const atRisk = emps.filter(e => e.label === 'Yes').length;
    const rate = ((atRisk / emps.length) * 100).toFixed(0);
    const color = rate >= 20 ? 'red' : rate >= 10 ? 'yellow' : 'green';
    return { badge: `${atRisk}/${emps.length}`, pct: parseFloat(rate), color };
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const totalAtRisk = employees.filter(e => e.label === 'Yes').length;
  const totalCost = employees.filter(e => e.label === 'Yes').reduce((s, e) => s + (e.attrition_cost || 0), 0);
  const orgRisk = getRiskBadge(employees);

  return (
    <div className="p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Department Explorer</h2>
      <p className="text-sm text-gray-500 mb-5">Interactively explore attrition at the department and employee level</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Workforce" value={employees.length.toLocaleString()} color="blue" />
        <StatCard icon={AlertTriangle} label="At Risk" value={`${totalAtRisk} (${orgRisk.pct}%)`} color="red" />
        <StatCard icon={Building2} label="Departments" value={Object.keys(deptSummary).length} color="green" />
        <StatCard icon={DollarSign} label="Total Cost Exposure" value={formatCurrency(totalCost)} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Organization Tree</h3>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> &lt;10%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 10-20%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt;20%</span>
            </div>
          </div>

          <TreeNode
            label="Organization"
            icon={Building2}
            level={0}
            badge={orgRisk.badge}
            badgeColor={orgRisk.color}
            riskPct={orgRisk.pct}
            count={employees.length}
            defaultOpen
          >
            {Object.entries(tree).sort().map(([dept, roles]) => {
              const deptEmps = employees.filter(e => e.Department === dept);
              const deptRisk = getRiskBadge(deptEmps);
              return (
                <TreeNode
                  key={dept}
                  label={dept}
                  icon={Building2}
                  level={1}
                  badge={deptRisk.badge}
                  badgeColor={deptRisk.color}
                  riskPct={deptRisk.pct}
                  count={deptEmps.length}
                >
                  {Object.entries(roles).sort().map(([role, levels]) => {
                    const roleEmps = deptEmps.filter(e => e.JobRole === role);
                    const roleRisk = getRiskBadge(roleEmps);
                    return (
                      <TreeNode
                        key={role}
                        label={role}
                        icon={Briefcase}
                        level={2}
                        badge={roleRisk.badge}
                        badgeColor={roleRisk.color}
                        riskPct={roleRisk.pct}
                        count={roleEmps.length}
                      >
                        {Object.entries(levels).sort().map(([level, emps]) => (
                          <TreeNode key={level} label={level} icon={Layers} level={3} count={emps.length}>
                            {emps.sort((a, b) => (b.prob_of_attrition || 0) - (a.prob_of_attrition || 0)).map(emp => {
                              const pct = ((emp.prob_of_attrition || 0) * 100).toFixed(0);
                              return (
                                <TreeNode
                                  key={emp.EmployeeNumber}
                                  label={emp.Name}
                                  icon={User}
                                  level={4}
                                  badge={`${pct}%`}
                                  badgeColor={emp.label === 'Yes' ? 'red' : 'green'}
                                  riskPct={parseFloat(pct)}
                                >
                                  {null}
                                </TreeNode>
                              );
                            })}
                          </TreeNode>
                        ))}
                      </TreeNode>
                    );
                  })}
                </TreeNode>
              );
            })}
          </TreeNode>
        </div>

        {/* Right panel: Charts */}
        <div className="space-y-4">
          {/* Dept breakdown pie */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Workforce Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={deptPieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={70} innerRadius={40} paddingAngle={3}
                  onClick={(_, i) => setSelectedDept(deptPieData[i]?.name || null)}
                  cursor="pointer"
                >
                  {deptPieData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [`${v} employees`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {deptPieData.map((d, i) => (
                <button key={d.name} onClick={() => setSelectedDept(d.name === selectedDept ? null : d.name)}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors ${
                    selectedDept === d.name ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50'
                  }`}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Risk by dept */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Risk by Department</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={deptRiskBar} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={60} tickFormatter={v => v.split(' ').slice(0, 2).join(' ')} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="atRisk" name="At Risk" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="safe" name="Safe" stackId="a" fill="#e5e7eb" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Drill down */}
          {selectedDept && selectedDeptData && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{selectedDept} - By Role</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={selectedDeptData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={9} width={100} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="atRisk" name="At Risk" stackId="a" fill="#ef4444" />
                  <Bar dataKey="safe" name="Safe" stackId="a" fill="#e5e7eb" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

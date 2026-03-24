import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Building2, Briefcase, User, Layers } from 'lucide-react';
import { useData } from '../hooks/useEmployees';

function TreeNode({ label, icon: Icon, children, level = 0, badge, badgeColor, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = children && children.length > 0;

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={`flex items-center gap-2 w-full text-left py-1.5 px-2 rounded hover:bg-gray-100 transition-colors`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Icon className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-sm text-gray-700 truncate">{label}</span>
        {badge !== undefined && (
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
            badgeColor === 'red' ? 'bg-red-100 text-red-700' :
            badgeColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
            badgeColor === 'green' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {badge}
          </span>
        )}
      </button>
      {open && hasChildren && (
        <div>{children}</div>
      )}
    </div>
  );
}

export default function DepartmentView() {
  const { employees, loading } = useData();

  const tree = useMemo(() => {
    // Organization -> Department -> JobRole -> JobLevel -> Employees
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

  function getRiskBadge(emps) {
    const atRisk = emps.filter(e => e.label === 'Yes').length;
    const rate = ((atRisk / emps.length) * 100).toFixed(0);
    const color = rate >= 20 ? 'red' : rate >= 10 ? 'yellow' : 'green';
    return { badge: `${atRisk}/${emps.length} (${rate}%)`, color };
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  const allEmps = employees;
  const orgRisk = getRiskBadge(allEmps);

  return (
    <div className="p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Department Explorer</h2>
      <p className="text-sm text-gray-500 mb-4">Interactively explore attrition at the department and employee level</p>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-3xl">
        <TreeNode
          label="Organization"
          icon={Building2}
          level={0}
          badge={orgRisk.badge}
          badgeColor={orgRisk.color}
          defaultOpen
        >
          {Object.entries(tree).sort().map(([dept, roles]) => {
            const deptEmps = employees.filter(e => e.Department === dept);
            const deptRisk = getRiskBadge(deptEmps);
            return (
              <TreeNode key={dept} label={dept} icon={Building2} level={1} badge={deptRisk.badge} badgeColor={deptRisk.color}>
                {Object.entries(roles).sort().map(([role, levels]) => {
                  const roleEmps = deptEmps.filter(e => e.JobRole === role);
                  const roleRisk = getRiskBadge(roleEmps);
                  return (
                    <TreeNode key={role} label={role} icon={Briefcase} level={2} badge={roleRisk.badge} badgeColor={roleRisk.color}>
                      {Object.entries(levels).sort().map(([level, emps]) => (
                        <TreeNode key={level} label={level} icon={Layers} level={3} badge={`${emps.length}`} badgeColor="gray">
                          {emps.sort((a, b) => a.Name.localeCompare(b.Name)).map(emp => (
                            <TreeNode
                              key={emp.EmployeeNumber}
                              label={`${emp.Name}`}
                              icon={User}
                              level={4}
                              badge={`${((emp.prob_of_attrition || 0) * 100).toFixed(1)}%`}
                              badgeColor={emp.label === 'Yes' ? 'red' : 'green'}
                            >
                              {null}
                            </TreeNode>
                          ))}
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
    </div>
  );
}

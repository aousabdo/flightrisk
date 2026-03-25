import { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  UserCheck, GitBranch, PieChart, FlaskConical,
  ChevronLeft, ChevronRight, Menu, Search, Bell, X, DollarSign,
  AlertTriangle, ShieldAlert,
} from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { useModal } from '../hooks/useModal';
import { formatCurrency } from '../lib/costs';
import EmployeeModal from './EmployeeModal';
import ComparePanel from './ComparePanel';

const NAV_SECTIONS = [
  {
    label: 'ANALYSIS',
    items: [
      { to: '/', icon: UserCheck, label: 'Employee Risk' },
      { to: '/departments', icon: GitBranch, label: 'Department Explorer' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { to: '/insights', icon: PieChart, label: 'Insights' },
      { to: '/what-if', icon: FlaskConical, label: 'What-if Analysis' },
    ],
  },
];

/* ─── Global Search ─── */
function GlobalSearch() {
  const { employees } = useData();
  const { openEmployee } = useModal();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return employees
      .filter(e =>
        e.Name.toLowerCase().includes(q) ||
        e.Department.toLowerCase().includes(q) ||
        e.JobRole.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, employees]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setFocused(false);
        setExpanded(false);
        setQuery('');
        inputRef.current?.blur();
      }
    }
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
        setExpanded(false);
        setQuery('');
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  function selectEmployee(emp) {
    openEmployee(emp);
    setQuery('');
    setFocused(false);
    setExpanded(false);
  }

  function handleExpand() {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 150);
  }

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      {!expanded ? (
        <button
          onClick={handleExpand}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Search employees"
        >
          <Search className="w-5 h-5" />
        </button>
      ) : (
        <div className="relative" style={{ width: 320 }}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search employees..."
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent animate-fade-in"
          />
          <button
            onClick={() => { setQuery(''); setExpanded(false); setFocused(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto" style={{ width: 320 }}>
          {results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">No employees found</div>
          ) : (
            results.map(emp => {
              const risk = ((emp.prob_of_attrition || 0) * 100).toFixed(0);
              return (
                <button
                  key={emp.EmployeeNumber}
                  onClick={() => selectEmployee(emp)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <img
                    src={`https://i.pravatar.cc/40?u=${encodeURIComponent(emp.Name)}`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{emp.Name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{emp.JobRole} &middot; {emp.Department}</p>
                  </div>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    risk >= 70 ? 'bg-red-100 text-red-700'
                    : risk >= 50 ? 'bg-orange-100 text-orange-700'
                    : risk >= 30 ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                  }`}>
                    {risk}%
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Notification Bell ─── */
function NotificationBell() {
  const { employees, stats } = useData();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const notifications = useMemo(() => {
    if (!employees.length) return { critical: 0, high: 0, totalCost: 0, hasCritical: false };
    const critical = employees.filter(e => (e.prob_of_attrition || 0) >= 0.8).length;
    const high = employees.filter(e => (e.prob_of_attrition || 0) >= 0.5).length;
    const totalCost = employees
      .filter(e => e.label === 'Yes')
      .reduce((sum, e) => sum + (e.attrition_cost || 0), 0);
    return { critical, high, totalCost, hasCritical: critical > 0 };
  }, [employees]);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors ${
          notifications.hasCritical ? 'animate-pulse-bell' : ''
        }`}
      >
        <Bell className="w-5 h-5" />
        {notifications.high > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {notifications.high > 9 ? '9+' : notifications.high}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2">
          <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Alerts</p>
          {notifications.critical > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-red-50">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{notifications.critical} employees at critical risk</p>
                <p className="text-[11px] text-gray-500">Attrition probability &gt; 80%</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-orange-50">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{notifications.high} employees at high risk</p>
              <p className="text-[11px] text-gray-500">Attrition probability &gt; 50%</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Total cost exposure</p>
              <p className="text-[11px] text-gray-500">{formatCurrency(notifications.totalCost)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { employees } = useData();

  const highRiskCount = useMemo(() =>
    employees.filter(e => (e.prob_of_attrition || 0) > 0.5).length,
    [employees]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        flex flex-col bg-[#1a237e] text-white
        transition-all duration-300
        ${collapsed ? 'w-14' : 'w-56'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 h-14 border-b border-white/10 shrink-0">
          {!collapsed && (
            <span className="text-xs font-semibold tracking-wide uppercase text-white/80">HR Analytics</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={section.label}>
              {sIdx > 0 && <div className="mx-3 my-1 border-t border-white/10" />}
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-wider text-white/40 px-3 mt-3 mb-1">{section.label}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 text-sm
                      transition-colors duration-150 border-l-3
                      ${isActive
                        ? 'bg-white/15 border-l-[3px] border-white text-white font-medium'
                        : 'border-l-[3px] border-transparent text-white/70 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && (
                      <span className="truncate flex-1">{label}</span>
                    )}
                    {to === '/' && highRiskCount > 0 && !collapsed && (
                      <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {highRiskCount > 99 ? '99' : highRiskCount}
                      </span>
                    )}
                    {to === '/' && highRiskCount > 0 && collapsed && (
                      <span className="absolute left-9 top-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t border-white/10 text-white/50 hover:text-white"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="h-14 border-b border-gray-200 flex items-center px-4 lg:px-6 shrink-0 bg-white">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1 mr-3 text-gray-500">
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              <span className="text-gray-800">FLIGHT </span>
              <span className="text-red-600">RISK</span>
            </span>
            <span className="hidden sm:inline text-sm text-gray-500 ml-2">Predict and Prevent Employee Attrition</span>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden sm:block mr-3">
            <GlobalSearch />
          </div>

          {/* Notifications */}
          <div className="mr-3">
            <NotificationBell />
          </div>

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">LS</div>
            <span className="hidden sm:inline text-sm text-gray-600">Linda Smith</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 print:bg-white">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="h-8 border-t border-gray-200 flex items-center px-4 bg-white print:hidden">
          <span className="text-[10px] text-gray-400">&copy; 2026 Analytica Data Science Solution</span>
        </footer>
      </main>

      {/* Employee Detail Modal (slide-over) */}
      <EmployeeModal />

      {/* Compare Panel (floating button + overlay) */}
      <ComparePanel />
    </div>
  );
}

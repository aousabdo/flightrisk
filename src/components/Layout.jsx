import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UserCheck, GitBranch, PieChart, FlaskConical,
  ChevronLeft, ChevronRight, Menu, Search, Bell, X, DollarSign,
  AlertTriangle, ShieldAlert, LayoutDashboard, Activity, Calculator,
  HelpCircle, Settings, Upload, LogOut, RefreshCw, Database,
  BarChart3, ClipboardList, TrendingUp,
} from 'lucide-react';
import { useData } from '../hooks/useEmployees';
import { useAuth } from '../hooks/useAuth';
import { useModal } from '../hooks/useModal';
import { formatCurrency } from '../lib/costs';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import ShortcutsHelp from './ShortcutsHelp';
import EmployeeModal from './EmployeeModal';
import ComparePanel from './ComparePanel';
import OnboardingTour from './OnboardingTour';
import AIChatPanel from './AIChatPanel';

const NAV_SECTIONS = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Executive Summary' },
      { to: '/employees', icon: UserCheck, label: 'Employee Risk' },
    ],
  },
  {
    label: 'ANALYSIS',
    items: [
      { to: '/departments', icon: GitBranch, label: 'Department Explorer' },
      { to: '/insights', icon: PieChart, label: 'Insights' },
      { to: '/timeline', icon: Activity, label: 'Timeline' },
      { to: '/benchmarking', icon: BarChart3, label: 'Benchmarking' },
      { to: '/trends', icon: TrendingUp, label: 'Trends' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { to: '/what-if', icon: FlaskConical, label: 'What-if Analysis' },
      { to: '/cost-calculator', icon: Calculator, label: 'Cost Calculator' },
      { to: '/actions', icon: ClipboardList, label: 'Action Tracker' },
    ],
  },
  {
    label: 'DATA',
    items: [
      { to: '/upload', icon: Upload, label: 'Upload Data' },
    ],
  },
];

/* ─── Global Search ─── */
function GlobalSearch({ onSearchRef }) {
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

  // Expose a focus method to parent
  useEffect(() => {
    if (onSearchRef) {
      onSearchRef({
        focus: () => {
          setExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 150);
        },
        close: () => {
          setFocused(false);
          setExpanded(false);
          setQuery('');
          inputRef.current?.blur();
        },
      });
    }
  }, [onSearchRef]);

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
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Search employees (Ctrl+K)"
        >
          <Search className="w-5 h-5" />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 border border-gray-200 rounded">
            <span className="text-[9px]">&#8984;</span>K
          </kbd>
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
        <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2" aria-live="polite">
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

/* ─── User Menu Dropdown ─── */
function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const roleBadgeColors = {
    chro: 'bg-blue-100 text-blue-700',
    vp: 'bg-emerald-100 text-emerald-700',
    manager: 'bg-orange-100 text-orange-700',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
      >
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center text-white text-xs font-bold`}>
          {user.initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm text-gray-700 leading-tight">{user.name}</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleBadgeColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
            {user.roleLabel}
          </span>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-[11px] text-gray-500">{user.email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); logout(); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Format date helper ─── */
function formatDate(isoString) {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTour, setShowTour] = useState(() => !localStorage.getItem('flightrisk-tour-done'));
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchHandleRef = useRef(null);
  const { employees, dataSource, uploadDate, uploadCount, refreshPredictions } = useData();
  const { user } = useAuth();
  const { closeEmployee } = useModal();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSearchRef = useCallback((handle) => {
    searchHandleRef.current = handle;
  }, []);

  useKeyboardShortcuts({
    onToggleShortcutsHelp: useCallback(() => setShowShortcuts(prev => !prev), []),
    onFocusSearch: useCallback(() => searchHandleRef.current?.focus(), []),
    onCloseAll: useCallback(() => {
      searchHandleRef.current?.close();
      closeEmployee();
      setShowShortcuts(false);
      setMobileOpen(false);
    }, [closeEmployee]),
  });

  const highRiskCount = useMemo(() =>
    employees.filter(e => (e.prob_of_attrition || 0) > 0.5).length,
    [employees]
  );

  const dataLabel = dataSource === 'uploaded' ? 'Your Data' : 'Sample Data';
  const dataBadgeColor = dataSource === 'uploaded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
  const dateDisplay = dataSource === 'uploaded' && uploadDate
    ? formatDate(uploadDate)
    : 'March 27, 2026';
  const countDisplay = dataSource === 'uploaded'
    ? `${(uploadCount || employees.length).toLocaleString()} employees`
    : 'Sample Dataset';

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Skip to main content link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-blue-600">
        Skip to main content
      </a>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col bg-[#1a237e] text-white
          transition-all duration-300
          ${collapsed ? 'lg:w-14' : 'w-56'}
          ${mobileOpen ? 'translate-x-0 w-56' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between px-3 h-14 border-b border-white/10 shrink-0">
          {(!collapsed || mobileOpen) && (
            <span className="text-xs font-semibold tracking-wide uppercase text-white/80">HR Analytics</span>
          )}
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 text-white/70 hover:text-white"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto" aria-label="Main navigation">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={section.label}>
              {sIdx > 0 && <div className="mx-3 my-1 border-t border-white/10" />}
              {(!collapsed || mobileOpen) && (
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
                    {(!collapsed || mobileOpen) && (
                      <span className="truncate flex-1">{label}</span>
                    )}
                    {/* High risk badge on Employee Risk */}
                    {to === '/employees' && highRiskCount > 0 && (!collapsed || mobileOpen) && (
                      <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {highRiskCount > 99 ? '99' : highRiskCount}
                      </span>
                    )}
                    {to === '/employees' && highRiskCount > 0 && collapsed && !mobileOpen && (
                      <span className="absolute left-9 top-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                    {/* Data source badge on Upload Data */}
                    {to === '/upload' && (!collapsed || mobileOpen) && (
                      <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${dataBadgeColor}`}>
                        {dataSource === 'uploaded' ? 'Your Data' : 'Sample'}
                      </span>
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
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden" role="main">
        {/* Top header bar */}
        <header className="h-14 border-b border-gray-200 flex items-center px-4 lg:px-6 shrink-0 bg-white" aria-label="FlightRisk">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1 mr-3 text-gray-500"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              <span className="text-gray-800">FLIGHT </span>
              <span className="text-red-600">RISK</span>
            </span>
            <span className="hidden md:inline text-sm text-gray-500 ml-2">Predict and Prevent Employee Attrition</span>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div data-tour="search" className="hidden sm:block mr-3">
            <GlobalSearch onSearchRef={handleSearchRef} />
          </div>

          {/* Notifications */}
          <div data-tour="notifications" className="mr-3">
            <NotificationBell />
          </div>

          {/* Help / Restart Tour - hidden on mobile */}
          <button
            onClick={() => setShowTour(true)}
            className="hidden md:inline-flex mr-3 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Take a guided tour"
            aria-label="Take a guided tour"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Settings - hidden on mobile */}
          <button
            onClick={() => navigate('/settings')}
            className="hidden md:inline-flex mr-3 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* User Menu */}
          <UserMenu />
        </header>

        {/* Page content */}
        <div id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 print:bg-white">
          <Outlet />
        </div>

        {/* Footer with data timestamp */}
        <footer className="h-8 border-t border-gray-200 flex items-center justify-between px-4 bg-white print:hidden">
          <span className="text-[10px] text-gray-500">&copy; 2026 Analytica Data Science Solution</span>
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] text-gray-500">
              Data as of {dateDisplay} &middot; {countDisplay}
            </span>
            <button
              onClick={refreshPredictions}
              className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
              title="Re-run predictions"
              aria-label="Re-run predictions"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </footer>
      </main>

      {/* Employee Detail Modal (slide-over) */}
      <EmployeeModal />

      {/* Compare Panel (floating button + overlay) */}
      <ComparePanel />

      {/* AI Chat Panel */}
      <AIChatPanel />

      {/* Onboarding Tour */}
      {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

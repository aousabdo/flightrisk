import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  UserCheck, GitBranch, BarChart3, PieChart, FlaskConical,
  ChevronLeft, ChevronRight, Menu,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: UserCheck, label: 'Employee Risk' },
  { to: '/departments', icon: GitBranch, label: 'Department Explorer' },
  { to: '/insights', icon: PieChart, label: 'Insights' },
  { to: '/what-if', icon: FlaskConical, label: 'What-if Analysis' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
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
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
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

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">LS</div>
            <span className="hidden sm:inline text-sm text-gray-600">Linda Smith</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="h-8 border-t border-gray-200 flex items-center px-4 bg-white">
          <span className="text-[10px] text-gray-400">&copy; 2026 Analytica Data Science Solution</span>
        </footer>
      </main>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Briefcase, UserCheck, LogIn } from 'lucide-react';
import { useAuth, DEMO_USERS } from '../hooks/useAuth';

const ROLE_CARDS = [
  {
    key: 'chro',
    icon: Shield,
    title: 'CHRO',
    name: DEMO_USERS.chro.name,
    description: 'Full access to all departments and employees',
    color: 'border-blue-300 bg-blue-50 hover:border-blue-400',
    iconColor: 'text-blue-600 bg-blue-100',
    badge: 'Full Access',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'vp',
    icon: Briefcase,
    title: 'VP Sales',
    name: DEMO_USERS.vp.name,
    description: 'View Sales department employees only',
    color: 'border-emerald-300 bg-emerald-50 hover:border-emerald-400',
    iconColor: 'text-emerald-600 bg-emerald-100',
    badge: 'Department',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'manager',
    icon: UserCheck,
    title: 'Manager',
    name: DEMO_USERS.manager.name,
    description: 'View direct reports in R&D only',
    color: 'border-orange-300 bg-orange-50 hover:border-orange-400',
    iconColor: 'text-orange-600 bg-orange-100',
    badge: 'Team Only',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('linda.smith@acme.com');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);

  function handleLogin(role) {
    login(role || 'chro');
    navigate('/');
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    handleLogin(selectedRole || 'chro');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">
            FLIGHT <span className="text-red-500">RISK</span>
          </h1>
          <p className="text-blue-300 text-sm mt-1">Employee Attrition Intelligence</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">Sign in to FlightRisk</h2>

          <form onSubmit={handleFormSubmit} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                placeholder="Enter any password"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-400 uppercase tracking-wider">Demo Accounts</span>
            </div>
          </div>

          <div className="space-y-3">
            {ROLE_CARDS.map(card => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  onClick={() => handleLogin(card.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${card.color}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{card.title}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{card.name} &middot; {card.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-blue-400/60 mt-6">
          This is a demo application. No real authentication is required.
        </p>
      </div>
    </div>
  );
}

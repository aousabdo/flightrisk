import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const AuthContext = createContext(null);

const DEMO_USERS = {
  chro: {
    name: 'Linda Smith',
    email: 'linda.smith@acme.com',
    role: 'chro',
    roleLabel: 'CHRO',
    department: null, // sees all
    avatar: 'LS',
    initials: 'LS',
    color: 'from-blue-400 to-purple-500',
  },
  vp: {
    name: 'Mike Johnson',
    email: 'mike.johnson@acme.com',
    role: 'vp',
    roleLabel: 'VP Sales',
    department: 'Sales',
    avatar: 'MJ',
    initials: 'MJ',
    color: 'from-emerald-400 to-teal-500',
  },
  manager: {
    name: 'Sarah Chen',
    email: 'sarah.chen@acme.com',
    role: 'manager',
    roleLabel: 'Manager',
    department: 'Research & Development',
    avatar: 'SC',
    initials: 'SC',
    color: 'from-orange-400 to-pink-500',
  },
};

export { DEMO_USERS };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('flightrisk-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && DEMO_USERS[parsed.role]) {
          return DEMO_USERS[parsed.role];
        }
      }
    } catch {}
    return null;
  });

  const login = useCallback((role) => {
    const u = DEMO_USERS[role];
    if (!u) return;
    setUser(u);
    localStorage.setItem('flightrisk-auth', JSON.stringify({ role }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('flightrisk-auth');
  }, []);

  const isAuthenticated = !!user;

  const canViewDepartment = useCallback((dept) => {
    if (!user) return false;
    if (user.role === 'chro') return true;
    if (user.role === 'vp') return dept === user.department;
    if (user.role === 'manager') return dept === user.department;
    return false;
  }, [user]);

  const canViewEmployee = useCallback((emp) => {
    if (!user) return false;
    if (user.role === 'chro') return true;
    if (user.role === 'vp') return emp.Department === user.department;
    if (user.role === 'manager') {
      // Manager sees their department + limited to ~10 employees
      return emp.Department === user.department;
    }
    return false;
  }, [user]);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    isAuthenticated,
    canViewDepartment,
    canViewEmployee,
  }), [user, login, logout, isAuthenticated, canViewDepartment, canViewEmployee]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

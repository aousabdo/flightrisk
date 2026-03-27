import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataProvider } from './hooks/useEmployees';
import { ModalProvider } from './hooks/useModal';
import { CompareProvider } from './hooks/useCompare';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import ExecutiveSummary from './components/ExecutiveSummary';
import EmployeeRisk from './components/EmployeeRisk';
import DepartmentView from './components/DepartmentView';
import Insights from './components/Insights';
import WhatIfAnalysis from './components/WhatIfAnalysis';
import CostCalculator from './components/CostCalculator';
import Timeline from './components/Timeline';
import Settings from './components/Settings';
import DataUpload from './components/DataUpload';
import Benchmarking from './components/Benchmarking';
import ActionTracker from './components/ActionTracker';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<ExecutiveSummary />} />
        <Route path="/employees" element={<EmployeeRisk />} />
        <Route path="/departments" element={<DepartmentView />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/what-if" element={<WhatIfAnalysis />} />
        <Route path="/cost-calculator" element={<CostCalculator />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/benchmarking" element={<Benchmarking />} />
        <Route path="/actions" element={<ActionTracker />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/upload" element={<DataUpload />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ModalProvider>
          <CompareProvider>
            <AppRoutes />
          </CompareProvider>
        </ModalProvider>
      </DataProvider>
    </AuthProvider>
  );
}

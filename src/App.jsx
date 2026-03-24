import { Routes, Route } from 'react-router-dom';
import { DataProvider } from './hooks/useEmployees';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeTable from './components/EmployeeTable';
import EmployeeDetail from './components/EmployeeDetail';
import WhatIfAnalysis from './components/WhatIfAnalysis';
import DepartmentView from './components/DepartmentView';
import CostAnalysis from './components/CostAnalysis';

export default function App() {
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<EmployeeTable />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route path="/what-if" element={<WhatIfAnalysis />} />
          <Route path="/departments" element={<DepartmentView />} />
          <Route path="/costs" element={<CostAnalysis />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

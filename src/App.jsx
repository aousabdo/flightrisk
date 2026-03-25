import { Routes, Route } from 'react-router-dom';
import { DataProvider } from './hooks/useEmployees';
import { ModalProvider } from './hooks/useModal';
import { CompareProvider } from './hooks/useCompare';
import Layout from './components/Layout';
import EmployeeRisk from './components/EmployeeRisk';
import DepartmentView from './components/DepartmentView';
import Insights from './components/Insights';
import WhatIfAnalysis from './components/WhatIfAnalysis';

export default function App() {
  return (
    <DataProvider>
      <ModalProvider>
        <CompareProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<EmployeeRisk />} />
              <Route path="/departments" element={<DepartmentView />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/what-if" element={<WhatIfAnalysis />} />
            </Route>
          </Routes>
        </CompareProvider>
      </ModalProvider>
    </DataProvider>
  );
}

import { Routes, Route } from 'react-router-dom';
import { DataProvider } from './hooks/useEmployees';
import { ModalProvider } from './hooks/useModal';
import { CompareProvider } from './hooks/useCompare';
import Layout from './components/Layout';
import ExecutiveSummary from './components/ExecutiveSummary';
import EmployeeRisk from './components/EmployeeRisk';
import DepartmentView from './components/DepartmentView';
import Insights from './components/Insights';
import WhatIfAnalysis from './components/WhatIfAnalysis';
import CostCalculator from './components/CostCalculator';
import Timeline from './components/Timeline';

export default function App() {
  return (
    <DataProvider>
      <ModalProvider>
        <CompareProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<ExecutiveSummary />} />
              <Route path="/employees" element={<EmployeeRisk />} />
              <Route path="/departments" element={<DepartmentView />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/what-if" element={<WhatIfAnalysis />} />
              <Route path="/cost-calculator" element={<CostCalculator />} />
              <Route path="/timeline" element={<Timeline />} />
            </Route>
          </Routes>
        </CompareProvider>
      </ModalProvider>
    </DataProvider>
  );
}

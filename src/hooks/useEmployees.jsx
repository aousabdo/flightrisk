import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { loadModel } from '../lib/predict';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [employees, setEmployees] = useState([]);
  const [explanations, setExplanations] = useState({});
  const [modelReady, setModelReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [empResp, explResp] = await Promise.all([
          fetch(new URL('../data/employees.json', import.meta.url)),
          fetch(new URL('../data/explanations.json', import.meta.url)),
        ]);
        const empData = await empResp.json();
        const explData = await explResp.json();

        setEmployees(empData);
        setExplanations(explData);

        await loadModel();
        setModelReady(true);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    if (!employees.length) return null;
    const atRisk = employees.filter(e => e.label === 'Yes');
    const totalCost = atRisk.reduce((sum, e) => sum + (e.attrition_cost || 0), 0);
    const avgProb = employees.reduce((sum, e) => sum + (e.prob_of_attrition || 0), 0) / employees.length;

    const byDept = {};
    const byRole = {};
    employees.forEach(e => {
      if (!byDept[e.Department]) byDept[e.Department] = { total: 0, atRisk: 0, cost: 0 };
      byDept[e.Department].total++;
      if (e.label === 'Yes') {
        byDept[e.Department].atRisk++;
        byDept[e.Department].cost += e.attrition_cost || 0;
      }

      if (!byRole[e.JobRole]) byRole[e.JobRole] = { total: 0, atRisk: 0 };
      byRole[e.JobRole].total++;
      if (e.label === 'Yes') byRole[e.JobRole].atRisk++;
    });

    return {
      total: employees.length,
      atRiskCount: atRisk.length,
      totalCost,
      avgProb,
      byDept,
      byRole,
    };
  }, [employees]);

  const departments = useMemo(() =>
    [...new Set(employees.map(e => e.Department))].sort(),
    [employees]
  );

  const jobRoles = useMemo(() =>
    [...new Set(employees.map(e => e.JobRole))].sort(),
    [employees]
  );

  return (
    <DataContext.Provider value={{
      employees, explanations, modelReady, loading, stats, departments, jobRoles,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}

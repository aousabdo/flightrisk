import { useState, useEffect, useMemo, createContext, useContext, useCallback } from 'react';
import { loadModel, predictAttrition } from '../lib/predict';
import { calculateEmployeeCost } from '../lib/costs';
import { calculateEmployeeScore } from '../lib/scores';
import { useAuth } from './useAuth';

const DataContext = createContext(null);

// --- Random name generator for uploaded data missing Name column ---
const FIRST_NAMES = [
  'James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth',
  'William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Christopher','Karen',
  'Alex','Morgan','Taylor','Jordan','Casey','Jamie','Riley','Quinn','Avery','Cameron',
];
const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Moore','Young','Allen',
  'King','Wright','Scott','Torres','Hill','Green','Adams','Nelson','Baker','Hall',
];

function generateName(seed) {
  const fi = Math.abs(seed * 13 + 7) % FIRST_NAMES.length;
  const li = Math.abs(seed * 17 + 11) % LAST_NAMES.length;
  return `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`;
}

// --- Strategies generator ---
const DEV_STRATEGIES = [
  'Seek Mentorship Role', 'Cross-Functional Training', 'Leadership Development',
  'Skill Certification', 'Conference Attendance', 'Stretch Assignment',
];
const PROF_STRATEGIES = [
  'Incentivize Specialization', 'Career Path Discussion', 'Promotion Track',
  'Market Rate Adjustment', 'Project Leadership', 'Internal Transfer Option',
];
const ENV_STRATEGIES = [
  'Improve Work-Life Balance', 'Flexible Schedule', 'Remote Work Option',
  'Team Building Activities', 'Manager Check-ins', 'Workspace Improvement',
];

function pickStrategy(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

// --- Process uploaded rows through the prediction pipeline ---
export function processUploadedRows(rows) {
  return rows.map((raw, idx) => {
    const emp = { ...raw };

    // Generate name if missing
    if (!emp.Name || !emp.Name.trim()) {
      emp.Name = generateName(emp.EmployeeNumber || idx);
    }

    // Ensure EmployeeNumber
    if (!emp.EmployeeNumber) emp.EmployeeNumber = idx + 1;

    // Map numeric Education to text labels for scores.js
    const eduMap = { 1: 'Below College', 2: 'College', 3: 'Bachelor', 4: 'Master', 5: 'Doctor' };
    const eduNum = parseInt(emp.Education);
    if (!isNaN(eduNum) && eduNum >= 1 && eduNum <= 5) {
      emp.EducationLabel = eduMap[eduNum];
    }

    // Map numeric satisfaction fields to text labels for the scores/display system
    const satMap = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High' };
    ['EnvironmentSatisfaction', 'JobSatisfaction', 'JobInvolvement', 'RelationshipSatisfaction'].forEach(field => {
      const n = parseInt(emp[field]);
      if (!isNaN(n) && n >= 1 && n <= 4) {
        emp[`${field}Label`] = satMap[n];
      }
      // Keep the numeric version too for the model
    });

    // Map WorkLifeBalance
    const wlbMap = { 1: 'Bad', 2: 'Good', 3: 'Better', 4: 'Best' };
    const wlbNum = parseInt(emp.WorkLifeBalance);
    if (!isNaN(wlbNum)) emp.WorkLifeBalanceLabel = wlbMap[wlbNum] || 'Good';

    // Map PerformanceRating
    const perfMap = { 1: 'Low', 2: 'Good', 3: 'Excellent', 4: 'Outstanding' };
    const perfNum = parseInt(emp.PerformanceRating);
    if (!isNaN(perfNum)) emp.PerformanceRatingLabel = perfMap[perfNum] || 'Good';

    // Provide defaults for optional fields
    if (!emp.BusinessTravel) emp.BusinessTravel = 'Travel_Rarely';
    if (!emp.RelationshipSatisfaction) emp.RelationshipSatisfaction = 2;
    if (!emp.TrainingTimesLastYear) emp.TrainingTimesLastYear = 2;
    if (!emp.PercentSalaryHike) emp.PercentSalaryHike = 15;

    // Generate MonthlyRate if missing (needed for cost calculation)
    if (!emp.MonthlyRate) emp.MonthlyRate = Math.round((emp.MonthlyIncome || 5000) * 3.2);
    if (!emp.DailyRate) emp.DailyRate = Math.round(((emp.MonthlyIncome || 5000) * 12) / 240);
    if (!emp.HourlyRate) emp.HourlyRate = Math.round(emp.DailyRate / 8);

    // Run prediction
    try {
      const prob = predictAttrition(emp);
      emp.prob_of_attrition = prob;
      emp.label = prob >= 0.5 ? 'Yes' : 'No';
    } catch {
      emp.prob_of_attrition = 0;
      emp.label = 'No';
    }

    // Calculate cost
    try {
      emp.attrition_cost = calculateEmployeeCost(emp);
    } catch {
      emp.attrition_cost = 0;
    }

    // Calculate score
    try {
      // scores.js uses text labels for Education, so provide them
      const scoreEmp = {
        ...emp,
        Education: emp.EducationLabel || emp.Education,
        JobInvolvement: emp.JobInvolvementLabel || emp.JobInvolvement,
        PerformanceRating: emp.PerformanceRatingLabel || emp.PerformanceRating,
        WorkLifeBalance: emp.WorkLifeBalanceLabel || emp.WorkLifeBalance,
        EnvironmentSatisfaction: emp.EnvironmentSatisfactionLabel || emp.EnvironmentSatisfaction,
        JobSatisfaction: emp.JobSatisfactionLabel || emp.JobSatisfaction,
      };
      emp.employee_score = calculateEmployeeScore(scoreEmp, emp.attrition_cost);
    } catch {
      emp.employee_score = 0;
    }

    // Generate strategies
    const seed = emp.EmployeeNumber || idx;
    emp.personal_development_strategy = pickStrategy(DEV_STRATEGIES, seed);
    emp.professional_development_strategy = pickStrategy(PROF_STRATEGIES, seed + 3);
    emp.work_environment_strategy = pickStrategy(ENV_STRATEGIES, seed + 7);

    return emp;
  });
}

// --- localStorage compression helpers ---
function saveToStorage(key, data) {
  try {
    const json = JSON.stringify(data);
    // Only store if under 5MB (localStorage limit)
    if (json.length < 5 * 1024 * 1024) {
      localStorage.setItem(key, json);
      return true;
    }
  } catch {
    // Storage full or other error
  }
  return false;
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function DataProvider({ children }) {
  const [defaultEmployees, setDefaultEmployees] = useState([]);
  const [customEmployees, setCustomEmployees] = useState(() => loadFromStorage('flightrisk-custom-data'));
  const [explanations, setExplanations] = useState({});
  const [modelReady, setModelReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState(() =>
    loadFromStorage('flightrisk-custom-data') ? 'uploaded' : 'default'
  );
  const [uploadDate, setUploadDate] = useState(() =>
    localStorage.getItem('flightrisk-upload-date') || null
  );
  const [uploadCount, setUploadCount] = useState(() => {
    const stored = loadFromStorage('flightrisk-custom-data');
    return stored ? stored.length : 0;
  });

  // Auth-based filtering
  let auth = null;
  try {
    auth = useAuth();
  } catch {
    // useAuth may not be available during initial render
  }

  useEffect(() => {
    async function load() {
      try {
        const [empResp, explResp] = await Promise.all([
          fetch(new URL('../data/employees.json', import.meta.url)),
          fetch(new URL('../data/explanations.json', import.meta.url)),
        ]);
        const empData = await empResp.json();
        const explData = await explResp.json();

        setDefaultEmployees(empData);
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

  // Active dataset
  const rawEmployees = dataSource === 'uploaded' && customEmployees
    ? customEmployees
    : defaultEmployees;

  // Apply role-based filtering
  const employees = useMemo(() => {
    if (!auth || !auth.user || !rawEmployees.length) return rawEmployees;
    const { user } = auth;
    if (user.role === 'chro') return rawEmployees;
    if (user.role === 'vp') return rawEmployees.filter(e => e.Department === user.department);
    if (user.role === 'manager') {
      // Manager sees up to 10 employees in their department
      return rawEmployees.filter(e => e.Department === user.department).slice(0, 10);
    }
    return rawEmployees;
  }, [rawEmployees, auth?.user]);

  const setCustomData = useCallback((rows) => {
    const now = new Date().toISOString();
    setCustomEmployees(rows);
    setDataSource('uploaded');
    setUploadDate(now);
    setUploadCount(rows.length);
    saveToStorage('flightrisk-custom-data', rows);
    localStorage.setItem('flightrisk-upload-date', now);
  }, []);

  const clearCustomData = useCallback(() => {
    setCustomEmployees(null);
    setDataSource('default');
    setUploadDate(null);
    setUploadCount(0);
    localStorage.removeItem('flightrisk-custom-data');
    localStorage.removeItem('flightrisk-upload-date');
  }, []);

  const refreshPredictions = useCallback(() => {
    if (dataSource === 'uploaded' && customEmployees) {
      const reprocessed = processUploadedRows(customEmployees.map(e => {
        // Strip computed fields before reprocessing
        const { prob_of_attrition, label, attrition_cost, employee_score, ...rest } = e;
        return rest;
      }));
      setCustomEmployees(reprocessed);
      saveToStorage('flightrisk-custom-data', reprocessed);
    }
  }, [dataSource, customEmployees]);

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
      employees,
      explanations,
      modelReady,
      loading,
      stats,
      departments,
      jobRoles,
      dataSource,
      uploadDate,
      uploadCount,
      setCustomData,
      clearCustomData,
      refreshPredictions,
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

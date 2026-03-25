import { createContext, useContext, useState } from 'react';

const CompareContext = createContext(null);

export function CompareProvider({ children }) {
  const [compareList, setCompareList] = useState([]);
  const addToCompare = (emp) =>
    setCompareList(prev => {
      if (prev.find(e => e.EmployeeNumber === emp.EmployeeNumber)) return prev;
      return prev.length < 3 ? [...prev, emp] : prev;
    });
  const removeFromCompare = (id) =>
    setCompareList(prev => prev.filter(e => e.EmployeeNumber !== id));
  const clearCompare = () => setCompareList([]);
  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be inside CompareProvider');
  return ctx;
}

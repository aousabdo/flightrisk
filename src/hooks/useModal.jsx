import { createContext, useContext, useState } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  return (
    <ModalContext.Provider value={{
      selectedEmployee,
      openEmployee: setSelectedEmployee,
      closeEmployee: () => setSelectedEmployee(null),
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be inside ModalProvider');
  return ctx;
}

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'flightrisk-settings';

const DEFAULTS = {
  // Risk Thresholds
  highRiskThreshold: 70,
  mediumRiskThreshold: 40,
  // Cost Assumptions
  defaultSalary: 80000,
  replacementCostMultiplier: 1.5,
  trainingPeriodDays: 60,
  // Display Preferences
  showEmployeePhotos: true,
  chartAnimation: true,
  compactView: false,
  itemsPerPage: 25,
  // Notification Rules
  alertHighRiskThreshold: true,
  alertNewHiresAtRisk: true,
  weeklyDigest: false,
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULTS, ...JSON.parse(stored) };
    }
  } catch (e) {
    // ignore
  }
  return { ...DEFAULTS };
}

export function useSettings() {
  const [settings, setSettingsState] = useState(loadSettings);

  const updateSettings = useCallback((updates) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettingsState({ ...DEFAULTS });
  }, []);

  const saveSettings = useCallback((newSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    setSettingsState(newSettings);
  }, []);

  return { settings, updateSettings, resetSettings, saveSettings, DEFAULTS };
}

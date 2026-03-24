/**
 * Attrition cost calculator - ported from R helper_scripts.R
 */

export function calculateAttritionCost({
  salary,
  netRevenuePerEmployee,
  separationCost = 500,
  vacancyCost = 10000,
  acquisitionCost = 4900,
  placementCost = 3500,
  workdaysPerYear = 240,
  workdaysPositionOpen = 40,
  workdaysOnboarding = 60,
  onboardingEfficiency = 0.50,
} = {}) {
  const directCost = separationCost + vacancyCost + acquisitionCost + placementCost;
  const productivityCost = (netRevenuePerEmployee / workdaysPerYear) *
    (workdaysPositionOpen + workdaysOnboarding * onboardingEfficiency);
  const salaryBenefit = (salary / workdaysPerYear) * workdaysPositionOpen;

  return directCost + productivityCost - salaryBenefit;
}

export function calculateEmployeeCost(employee) {
  return calculateAttritionCost({
    salary: employee.MonthlyIncome * 12,
    netRevenuePerEmployee: (employee.MonthlyRate - employee.MonthlyIncome) * 12,
  });
}

/**
 * Format currency for display
 */
export function formatCurrency(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

export function formatCurrencyFull(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

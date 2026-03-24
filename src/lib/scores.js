/**
 * Employee score calculator - ported from R helper_scripts.R
 */

const BUSINESS_TRAVEL_SCORE = {
  Travel_Frequently: 3,
  Travel_Rarely: 2,
  'Non-Travel': 1,
};

const EDUCATION_SCORE = {
  'Below College': 1,
  College: 2,
  Bachelor: 2,
  Master: 4,
  Doctor: 6,
};

const EDUCATION_FIELD_SCORE = {
  'Human Resources': 1,
  'Life Sciences': 1.5,
  Marketing: 2,
  Medical: 4,
  'Technical Degree': 2,
  Other: 1.5,
};

const JOB_INVOLVEMENT_SCORE = {
  Low: 1,
  Medium: 3,
  High: 5,
  'Very High': 5,
};

const JOB_LEVEL_SCORE = {
  1: 1, 2: 2, 3: 4, 4: 5, 5: 7,
};

const JOB_ROLE_SCORE = {
  'Human Resources': 1,
  'Sales Executive': 2,
  Manager: 3,
  'Healthcare Representative': 2,
  'Laboratory Technician': 2,
  'Manufacturing Director': 4,
  'Research Scientist': 3,
  'Research Director': 5,
  'Sales Representative': 2,
};

const WEIGHTS = {
  businessTravel: 1,
  education: 1,
  educationField: 1,
  jobInvolvement: 5,
  jobLevel: 2,
  jobRole: 2,
  totalWorkingYears: 2,
  yearsAtCompany: 2,
  monthlyIncome: 1,
  attritionCost: 2,
};

function yearsScore(years) {
  if (years <= 5) return 1;
  if (years <= 10) return 2;
  if (years <= 15) return 3;
  if (years <= 20) return 4;
  if (years <= 30) return 5;
  return 4;
}

export function calculateEmployeeScore(employee, attritionCost) {
  const bt = BUSINESS_TRAVEL_SCORE[employee.BusinessTravel] || 1;
  const edu = EDUCATION_SCORE[employee.Education] || 1;
  const ef = EDUCATION_FIELD_SCORE[employee.EducationField] || 1.5;
  const ji = JOB_INVOLVEMENT_SCORE[employee.JobInvolvement] || 5;
  const jl = JOB_LEVEL_SCORE[employee.JobLevel] || 2;
  const jr = JOB_ROLE_SCORE[employee.JobRole] || 2;
  const twy = yearsScore(employee.TotalWorkingYears || 0);
  const yac = yearsScore(employee.YearsAtCompany || 0);
  const ac = (attritionCost || 0) / 100000 * 1.2;

  // Monthly income score (normalized 0-100, simplified)
  const mi = Math.min(100, Math.max(0, ((employee.MonthlyRate || 0) - (employee.MonthlyIncome || 0)) / 200));

  return (
    bt * WEIGHTS.businessTravel +
    edu * WEIGHTS.education +
    ef * WEIGHTS.educationField +
    ji * WEIGHTS.jobInvolvement +
    jl * WEIGHTS.jobLevel +
    jr * WEIGHTS.jobRole +
    twy * WEIGHTS.totalWorkingYears +
    yac * WEIGHTS.yearsAtCompany +
    mi * WEIGHTS.monthlyIncome +
    ac * WEIGHTS.attritionCost
  );
}

export function getRiskLevel(probability) {
  if (probability >= 0.7) return { level: 'Critical', color: 'red' };
  if (probability >= 0.5) return { level: 'High', color: 'orange' };
  if (probability >= 0.3) return { level: 'Medium', color: 'yellow' };
  return { level: 'Low', color: 'green' };
}

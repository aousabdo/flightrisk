import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, XCircle, ChevronRight,
  ChevronLeft, Download, Loader2, ArrowRight, RotateCcw, MapPin,
  Check, X, Info, AlertCircle,
} from 'lucide-react';
import Papa from 'papaparse';
import { useData, processUploadedRows } from '../hooks/useEmployees';
import { loadModel } from '../lib/predict';

// ─── Column definitions ───
const REQUIRED_COLUMNS = [
  { name: 'Age', type: 'number', min: 18, max: 70, desc: 'Employee age' },
  { name: 'Department', type: 'text', desc: 'e.g. Sales, Human Resources, R&D' },
  { name: 'DistanceFromHome', type: 'number', min: 1, max: 99, desc: 'Miles/km from home' },
  { name: 'Education', type: 'number', min: 1, max: 5, desc: '1=Below College ... 5=Doctor' },
  { name: 'EmployeeNumber', type: 'number', desc: 'Unique ID' },
  { name: 'EnvironmentSatisfaction', type: 'number', min: 1, max: 4, desc: '1-4 scale' },
  { name: 'Gender', type: 'text', desc: 'Male or Female' },
  { name: 'JobLevel', type: 'number', min: 1, max: 5, desc: '1-5 scale' },
  { name: 'JobRole', type: 'text', desc: 'e.g. Sales Executive, Research Scientist' },
  { name: 'JobSatisfaction', type: 'number', min: 1, max: 4, desc: '1-4 scale' },
  { name: 'MaritalStatus', type: 'text', desc: 'Single, Married, or Divorced' },
  { name: 'MonthlyIncome', type: 'number', min: 1, desc: 'Monthly salary' },
  { name: 'NumCompaniesWorked', type: 'number', min: 0, max: 20, desc: 'Previous employers' },
  { name: 'OverTime', type: 'text', desc: 'Yes or No' },
  { name: 'PerformanceRating', type: 'number', min: 1, max: 4, desc: '1-4 scale' },
  { name: 'StockOptionLevel', type: 'number', min: 0, max: 3, desc: '0-3 scale' },
  { name: 'TotalWorkingYears', type: 'number', min: 0, desc: 'Total career years' },
  { name: 'WorkLifeBalance', type: 'number', min: 1, max: 4, desc: '1-4 scale' },
  { name: 'YearsAtCompany', type: 'number', min: 0, desc: 'Tenure at current company' },
  { name: 'YearsInCurrentRole', type: 'number', min: 0, desc: 'Years in current role' },
  { name: 'YearsSinceLastPromotion', type: 'number', min: 0, desc: 'Years since last promotion' },
  { name: 'YearsWithCurrManager', type: 'number', min: 0, desc: 'Years with current manager' },
];

const OPTIONAL_COLUMNS = [
  { name: 'Name', type: 'text', desc: 'Will generate random names if missing' },
  { name: 'BusinessTravel', type: 'text', desc: 'Non-Travel, Travel_Rarely, Travel_Frequently' },
  { name: 'RelationshipSatisfaction', type: 'number', min: 1, max: 4, desc: '1-4 scale' },
  { name: 'TrainingTimesLastYear', type: 'number', min: 0, max: 6, desc: 'Training sessions' },
  { name: 'PercentSalaryHike', type: 'number', min: 0, max: 50, desc: 'Percent salary increase' },
];

const REQUIRED_NAMES = REQUIRED_COLUMNS.map(c => c.name);

// Close-match mappings for auto-mapping
const ALIAS_MAP = {
  dept: 'Department', department_name: 'Department',
  age: 'Age', employee_age: 'Age',
  ot: 'OverTime', overtime: 'OverTime', over_time: 'OverTime',
  monthly_income: 'MonthlyIncome', salary: 'MonthlyIncome', monthlyincome: 'MonthlyIncome',
  distance: 'DistanceFromHome', distancefromhome: 'DistanceFromHome', distance_from_home: 'DistanceFromHome',
  education: 'Education', edu: 'Education',
  employeenumber: 'EmployeeNumber', employee_number: 'EmployeeNumber', emp_id: 'EmployeeNumber', id: 'EmployeeNumber', employee_id: 'EmployeeNumber',
  environmentsatisfaction: 'EnvironmentSatisfaction', environment_satisfaction: 'EnvironmentSatisfaction', env_satisfaction: 'EnvironmentSatisfaction',
  gender: 'Gender', sex: 'Gender',
  joblevel: 'JobLevel', job_level: 'JobLevel',
  jobrole: 'JobRole', job_role: 'JobRole', role: 'JobRole', job_title: 'JobRole',
  jobsatisfaction: 'JobSatisfaction', job_satisfaction: 'JobSatisfaction',
  maritalstatus: 'MaritalStatus', marital_status: 'MaritalStatus', marital: 'MaritalStatus',
  numcompaniesworked: 'NumCompaniesWorked', num_companies_worked: 'NumCompaniesWorked', companies_worked: 'NumCompaniesWorked',
  performancerating: 'PerformanceRating', performance_rating: 'PerformanceRating', performance: 'PerformanceRating',
  stockoptionlevel: 'StockOptionLevel', stock_option_level: 'StockOptionLevel', stock_options: 'StockOptionLevel',
  totalworkingyears: 'TotalWorkingYears', total_working_years: 'TotalWorkingYears', experience: 'TotalWorkingYears',
  worklifebalance: 'WorkLifeBalance', work_life_balance: 'WorkLifeBalance', wlb: 'WorkLifeBalance',
  yearsatcompany: 'YearsAtCompany', years_at_company: 'YearsAtCompany', tenure: 'YearsAtCompany',
  yearsincurrentrole: 'YearsInCurrentRole', years_in_current_role: 'YearsInCurrentRole',
  yearssincelastpromotion: 'YearsSinceLastPromotion', years_since_last_promotion: 'YearsSinceLastPromotion',
  yearswithcurrmanager: 'YearsWithCurrManager', years_with_curr_manager: 'YearsWithCurrManager', years_with_manager: 'YearsWithCurrManager',
  name: 'Name', employee_name: 'Name', full_name: 'Name',
  businesstravel: 'BusinessTravel', business_travel: 'BusinessTravel', travel: 'BusinessTravel',
  relationshipsatisfaction: 'RelationshipSatisfaction', relationship_satisfaction: 'RelationshipSatisfaction',
  trainingtimeslastyear: 'TrainingTimesLastYear', training_times_last_year: 'TrainingTimesLastYear', training: 'TrainingTimesLastYear',
  percentsalaryhike: 'PercentSalaryHike', percent_salary_hike: 'PercentSalaryHike', salary_hike: 'PercentSalaryHike',
};

// ─── Sample CSV generator ───
function generateSampleCSV() {
  const headers = [...REQUIRED_NAMES, 'Name', 'BusinessTravel'];
  const rows = [
    [32,'Sales',5,3,1001,3,'Male',2,'Sales Executive',4,'Married',5500,3,'No',3,1,10,3,6,3,1,4,'Alice Johnson','Travel_Rarely'],
    [45,'Research & Development',12,4,1002,2,'Female',3,'Research Scientist',2,'Single',9200,5,'Yes',3,2,22,2,15,8,3,7,'Bob Williams','Travel_Frequently'],
    [28,'Human Resources',3,2,1003,4,'Female',1,'Human Resources',3,'Divorced',3200,1,'No',3,0,4,4,2,2,0,1,'Carol Davis','Non-Travel'],
    [51,'Sales',8,5,1004,1,'Male',4,'Sales Executive',1,'Married',14500,7,'Yes',4,3,28,1,20,5,7,12,'David Martinez','Travel_Rarely'],
    [35,'Research & Development',2,3,1005,3,'Male',2,'Laboratory Technician',3,'Single',4100,2,'No',3,1,8,3,5,4,1,3,'Eva Brown','Travel_Rarely'],
  ];
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// ─── Step indicator ───
function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
              ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'}
            `}>
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${active ? 'font-medium text-gray-800' : 'text-gray-400'}`}>
              {s}
            </span>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───
export default function DataUpload() {
  const navigate = useNavigate();
  const { setCustomData, modelReady } = useData();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [parseError, setParseError] = useState(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const STEPS = ['Upload', 'Map Columns', 'Validate', 'Complete'];

  // ─── File handling ───
  function handleFile(f) {
    if (!f) return;
    setParseError(null);

    if (!f.name.toLowerCase().endsWith('.csv')) {
      setParseError('Only CSV files are supported. Please save your file as .csv.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setParseError('File exceeds 10MB limit. Please reduce the file size.');
      return;
    }

    setFile(f);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete(results) {
        if (results.errors.length > 0 && results.data.length === 0) {
          setParseError(`CSV parsing failed: ${results.errors[0].message}`);
          return;
        }
        if (results.data.length > 50000) {
          setParseError(`File has ${results.data.length.toLocaleString()} rows (max 50,000).`);
          return;
        }
        if (results.data.length === 0) {
          setParseError('No data rows found in the file.');
          return;
        }

        const headers = results.meta.fields || [];
        setParsedHeaders(headers);
        setParsedRows(results.data);
        setPreviewRows(results.data.slice(0, 3));

        // Auto-map columns
        const autoMap = {};
        const allTarget = [...REQUIRED_NAMES, ...OPTIONAL_COLUMNS.map(c => c.name)];

        headers.forEach(h => {
          // Exact match (case-insensitive)
          const exact = allTarget.find(t => t.toLowerCase() === h.toLowerCase());
          if (exact) {
            autoMap[exact] = h;
            return;
          }
          // Alias match
          const alias = ALIAS_MAP[h.toLowerCase().replace(/[\s_-]/g, '').toLowerCase()];
          if (alias) {
            autoMap[alias] = h;
          }
        });

        setMapping(autoMap);
        setStep(1);
      },
      error(err) {
        setParseError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // ─── Mapping helpers ───
  const mappedCount = useMemo(() =>
    REQUIRED_NAMES.filter(n => mapping[n]).length,
    [mapping]
  );

  const allRequiredMapped = mappedCount === REQUIRED_NAMES.length;

  function updateMapping(targetCol, csvCol) {
    setMapping(prev => {
      const next = { ...prev };
      // Remove any existing mapping to this csv col
      Object.keys(next).forEach(k => {
        if (next[k] === csvCol) delete next[k];
      });
      if (csvCol) {
        next[targetCol] = csvCol;
      } else {
        delete next[targetCol];
      }
      return next;
    });
  }

  // ─── Validation ───
  function runValidation() {
    const errors = [];
    const warnings = [];
    let validCount = 0;
    const seenIds = new Set();

    parsedRows.forEach((row, idx) => {
      const rowNum = idx + 2; // +2 for header row + 1-indexing
      let rowValid = true;
      let rowWarning = false;

      // Check required columns
      REQUIRED_COLUMNS.forEach(col => {
        const csvCol = mapping[col.name];
        if (!csvCol) return; // shouldn't happen
        const val = row[csvCol];

        // Missing value
        if (val === null || val === undefined || val === '') {
          errors.push({ row: rowNum, col: col.name, msg: `Missing value for ${col.name}` });
          rowValid = false;
          return;
        }

        if (col.type === 'number') {
          const num = parseFloat(val);
          if (isNaN(num)) {
            errors.push({ row: rowNum, col: col.name, msg: `${col.name} must be a number, got "${val}"` });
            rowValid = false;
            return;
          }
          if (col.min !== undefined && num < col.min) {
            warnings.push({ row: rowNum, col: col.name, msg: `${col.name}=${num} below minimum ${col.min}` });
            rowWarning = true;
          }
          if (col.max !== undefined && num > col.max) {
            warnings.push({ row: rowNum, col: col.name, msg: `${col.name}=${num} above maximum ${col.max}` });
            rowWarning = true;
          }
        }

        // Duplicate EmployeeNumber
        if (col.name === 'EmployeeNumber') {
          const id = String(val);
          if (seenIds.has(id)) {
            warnings.push({ row: rowNum, col: 'EmployeeNumber', msg: `Duplicate EmployeeNumber: ${id}` });
            rowWarning = true;
          }
          seenIds.add(id);
        }
      });

      if (rowValid) validCount++;
    });

    setValidationResult({
      total: parsedRows.length,
      valid: validCount,
      warnings: warnings.length,
      errors: errors.length,
      errorList: errors.slice(0, 100),
      warningList: warnings.slice(0, 100),
      errorRows: new Set(errors.map(e => e.row)),
    });
    setStep(2);
  }

  // ─── Processing ───
  async function runProcessing(skipErrors) {
    setProcessing(true);
    setStep(3);

    try {
      // Ensure model loaded
      await loadModel();

      // Map rows using column mapping
      let rows = parsedRows.map((raw, idx) => {
        const mapped = {};
        Object.entries(mapping).forEach(([targetCol, csvCol]) => {
          mapped[targetCol] = raw[csvCol];
        });
        return mapped;
      });

      // Filter error rows if requested
      if (skipErrors && validationResult?.errorRows?.size > 0) {
        rows = rows.filter((_, idx) => !validationResult.errorRows.has(idx + 2));
      }

      // Process through prediction pipeline
      const processed = processUploadedRows(rows);
      const atRisk = processed.filter(e => e.label === 'Yes');

      // Store in context
      setCustomData(processed);

      setProcessResult({
        count: processed.length,
        atRiskCount: atRisk.length,
        atRiskPct: ((atRisk.length / processed.length) * 100).toFixed(0),
      });
    } catch (err) {
      console.error('Processing failed:', err);
      setProcessResult({ error: err.message });
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    setStep(0);
    setFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setPreviewRows([]);
    setMapping({});
    setValidationResult(null);
    setProcessResult(null);
    setParseError(null);
    setProcessing(false);
  }

  function downloadSample() {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flightrisk_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <StepIndicator currentStep={step} steps={STEPS} />

      {/* ─── STEP 0: Instructions & Upload ─── */}
      {step === 0 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">Upload Your Employee Data</h1>
            <p className="text-sm text-gray-500 mt-1">Import your HR data to generate attrition predictions</p>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Required Columns ({REQUIRED_COLUMNS.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-6">
              {REQUIRED_COLUMNS.map(col => (
                <div key={col.name} className="flex items-baseline gap-2 text-sm">
                  <span className="font-mono text-blue-700 font-medium text-xs">{col.name}</span>
                  <span className="text-gray-400 text-xs">{col.desc}</span>
                </div>
              ))}
            </div>

            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              Optional Columns
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-6">
              {OPTIONAL_COLUMNS.map(col => (
                <div key={col.name} className="flex items-baseline gap-2 text-sm">
                  <span className="font-mono text-gray-600 font-medium text-xs">{col.name}</span>
                  <span className="text-gray-400 text-xs">{col.desc}</span>
                </div>
              ))}
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Important</p>
                <p className="text-xs mt-0.5">Column names must match exactly (case-insensitive auto-mapping is provided). Save as .csv (not .xlsx). Max file size: 10MB, max rows: 50,000.</p>
              </div>
            </div>

            {/* Download sample */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={downloadSample}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Sample CSV
              </button>
            </div>
          </div>

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer p-12 text-center"
          >
            <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Drag and drop your CSV file here</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </div>

          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 1: Column Mapping ─── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Map Columns</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Match your CSV columns to the required fields. <span className="font-medium text-blue-600">{mappedCount} of {REQUIRED_NAMES.length}</span> required columns mapped.
              </p>
            </div>
            <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Start Over
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(mappedCount / REQUIRED_NAMES.length) * 100}%` }}
            />
          </div>

          {/* Preview table */}
          {previewRows.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-500">DATA PREVIEW (first 3 rows)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {parsedHeaders.slice(0, 10).map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                      {parsedHeaders.length > 10 && (
                        <th className="px-3 py-2 text-left font-medium text-gray-400">+{parsedHeaders.length - 10} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-t border-gray-100">
                        {parsedHeaders.slice(0, 10).map(h => (
                          <td key={h} className="px-3 py-1.5 text-gray-600 whitespace-nowrap">{String(row[h] ?? '')}</td>
                        ))}
                        {parsedHeaders.length > 10 && <td className="px-3 py-1.5 text-gray-300">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mapping table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-500">REQUIRED COLUMN MAPPING</p>
            </div>
            <div className="divide-y divide-gray-100">
              {REQUIRED_COLUMNS.map(col => {
                const mapped = mapping[col.name];
                return (
                  <div key={col.name} className={`flex items-center gap-4 px-4 py-2.5 ${mapped ? '' : 'bg-red-50/50'}`}>
                    <div className="w-5 shrink-0">
                      {mapped
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <AlertCircle className="w-4 h-4 text-red-400" />
                      }
                    </div>
                    <div className="w-48 shrink-0">
                      <span className="text-sm font-medium text-gray-800">{col.name}</span>
                      <span className="text-[10px] text-gray-400 ml-2">{col.type}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <select
                      value={mapped || ''}
                      onChange={e => updateMapping(col.name, e.target.value)}
                      className={`flex-1 text-sm px-2 py-1.5 border rounded-md outline-none focus:ring-2 focus:ring-blue-400 ${
                        mapped ? 'border-green-300 bg-green-50' : 'border-red-300 bg-white'
                      }`}
                    >
                      <option value="">-- Select CSV column --</option>
                      {parsedHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Optional columns */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500">OPTIONAL COLUMN MAPPING</p>
            </div>
            <div className="divide-y divide-gray-100">
              {OPTIONAL_COLUMNS.map(col => {
                const mapped = mapping[col.name];
                return (
                  <div key={col.name} className="flex items-center gap-4 px-4 py-2.5">
                    <div className="w-5 shrink-0">
                      {mapped ? <CheckCircle2 className="w-4 h-4 text-blue-400" /> : <div className="w-4 h-4 rounded-full border border-gray-300" />}
                    </div>
                    <div className="w-48 shrink-0">
                      <span className="text-sm text-gray-600">{col.name}</span>
                      <span className="text-[10px] text-gray-400 ml-2">optional</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <select
                      value={mapped || ''}
                      onChange={e => updateMapping(col.name, e.target.value)}
                      className="flex-1 text-sm px-2 py-1.5 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">-- None --</option>
                      {parsedHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button onClick={reset} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={runValidation}
              disabled={!allRequiredMapped}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                allRequiredMapped
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Validate Data <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Validation ─── */}
      {step === 2 && validationResult && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">Validation Results</h1>
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Mapping
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{validationResult.valid.toLocaleString()}</p>
              <p className="text-xs text-green-600">rows valid</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-700">{validationResult.warnings}</p>
              <p className="text-xs text-amber-600">rows with warnings</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-700">{validationResult.errors}</p>
              <p className="text-xs text-red-600">rows with errors</p>
            </div>
          </div>

          {/* Error details */}
          {validationResult.errorList.length > 0 && (
            <details className="bg-white rounded-lg border border-red-200">
              <summary className="px-4 py-3 text-sm font-medium text-red-700 cursor-pointer hover:bg-red-50">
                Errors ({validationResult.errors})
              </summary>
              <div className="px-4 pb-3 max-h-48 overflow-y-auto">
                {validationResult.errorList.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 py-0.5">
                    Row {e.row}, {e.col}: {e.msg}
                  </p>
                ))}
                {validationResult.errors > 100 && (
                  <p className="text-xs text-red-400 mt-1">Showing first 100 of {validationResult.errors} errors</p>
                )}
              </div>
            </details>
          )}

          {/* Warning details */}
          {validationResult.warningList.length > 0 && (
            <details className="bg-white rounded-lg border border-amber-200">
              <summary className="px-4 py-3 text-sm font-medium text-amber-700 cursor-pointer hover:bg-amber-50">
                Warnings ({validationResult.warnings})
              </summary>
              <div className="px-4 pb-3 max-h-48 overflow-y-auto">
                {validationResult.warningList.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 py-0.5">
                    Row {w.row}, {w.col}: {w.msg}
                  </p>
                ))}
                {validationResult.warnings > 100 && (
                  <p className="text-xs text-amber-400 mt-1">Showing first 100 of {validationResult.warnings} warnings</p>
                )}
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <button
              onClick={reset}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fix and Re-upload
            </button>
            {validationResult.errors > 0 && (
              <button
                onClick={() => runProcessing(true)}
                className="px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                Continue with valid rows only ({validationResult.valid.toLocaleString()})
              </button>
            )}
            <button
              onClick={() => runProcessing(false)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Continue with all rows ({validationResult.total.toLocaleString()}) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Processing / Complete ─── */}
      {step === 3 && (
        <div className="space-y-6 text-center">
          {processing ? (
            <div className="py-20">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-bold text-gray-800">Running Predictions</h2>
              <p className="text-sm text-gray-500 mt-1">Analyzing {parsedRows.length.toLocaleString()} employees...</p>
              <div className="w-64 mx-auto mt-6 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : processResult?.error ? (
            <div className="py-16">
              <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800">Processing Failed</h2>
              <p className="text-sm text-red-600 mt-2">{processResult.error}</p>
              <button
                onClick={reset}
                className="mt-6 px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Try Again
              </button>
            </div>
          ) : processResult ? (
            <div className="py-16">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Data Imported Successfully!</h2>
              <p className="text-gray-500 mt-2">
                <span className="font-semibold text-gray-700">{processResult.count.toLocaleString()}</span> employees loaded,{' '}
                <span className="font-semibold text-red-600">{processResult.atRiskCount.toLocaleString()}</span> predicted at risk ({processResult.atRiskPct}%)
              </p>
              <div className="flex items-center gap-4 justify-center mt-8">
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  View Dashboard <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={reset}
                  className="px-5 py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Upload Different Data
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import {
  Shield, DollarSign, Monitor, Bell, RotateCcw, Save, Check,
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useData } from '../hooks/useEmployees';

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step = 1, suffix = '', format }) {
  const displayValue = format ? format(value) : `${value}${suffix}`;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-gray-800">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{format ? format(min) : `${min}${suffix}`}</span>
        <span>{format ? format(max) : `${max}${suffix}`}</span>
      </div>
    </div>
  );
}

function ToggleField({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const { settings, updateSettings, resetSettings, DEFAULTS } = useSettings();
  const { employees } = useData();
  const [saved, setSaved] = useState(false);

  // Local draft state
  const [draft, setDraft] = useState({ ...settings });

  function updateDraft(updates) {
    setDraft(prev => ({ ...prev, ...updates }));
  }

  function handleSave() {
    updateSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setDraft({ ...DEFAULTS });
    resetSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Risk distribution preview
  const riskPreview = useMemo(() => {
    if (!employees.length) return { high: 0, medium: 0, low: 0 };
    const highThreshold = draft.highRiskThreshold / 100;
    const medThreshold = draft.mediumRiskThreshold / 100;
    let high = 0, medium = 0, low = 0;
    employees.forEach(e => {
      const p = e.prob_of_attrition || 0;
      if (p >= highThreshold) high++;
      else if (p >= medThreshold) medium++;
      else low++;
    });
    return { high, medium, low };
  }, [employees, draft.highRiskThreshold, draft.mediumRiskThreshold]);

  const total = employees.length || 1;

  return (
    <div className="p-6 animate-fade-in space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure platform behavior and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Risk Thresholds */}
      <SectionCard icon={Shield} title="Risk Thresholds">
        <SliderField
          label="High Risk Threshold"
          value={draft.highRiskThreshold}
          onChange={v => {
            updateDraft({ highRiskThreshold: v });
            if (draft.mediumRiskThreshold >= v) {
              updateDraft({ highRiskThreshold: v, mediumRiskThreshold: v - 10 });
            }
          }}
          min={50}
          max={100}
          suffix="%"
        />
        <SliderField
          label="Medium Risk Threshold"
          value={draft.mediumRiskThreshold}
          onChange={v => {
            updateDraft({ mediumRiskThreshold: v });
            if (v >= draft.highRiskThreshold) {
              updateDraft({ mediumRiskThreshold: draft.highRiskThreshold - 10 });
            }
          }}
          min={20}
          max={70}
          suffix="%"
        />

        {/* Preview bars */}
        <div className="mt-5">
          <p className="text-xs font-medium text-gray-500 mb-2">Employee Distribution Preview</p>
          <div className="flex rounded-full overflow-hidden h-6">
            <div
              className="bg-red-500 flex items-center justify-center text-[10px] font-bold text-white transition-all"
              style={{ width: `${(riskPreview.high / total) * 100}%`, minWidth: riskPreview.high > 0 ? 40 : 0 }}
            >
              {riskPreview.high}
            </div>
            <div
              className="bg-amber-400 flex items-center justify-center text-[10px] font-bold text-white transition-all"
              style={{ width: `${(riskPreview.medium / total) * 100}%`, minWidth: riskPreview.medium > 0 ? 40 : 0 }}
            >
              {riskPreview.medium}
            </div>
            <div
              className="bg-green-500 flex items-center justify-center text-[10px] font-bold text-white transition-all"
              style={{ width: `${(riskPreview.low / total) * 100}%`, minWidth: riskPreview.low > 0 ? 40 : 0 }}
            >
              {riskPreview.low}
            </div>
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-400">
            <span className="text-red-500">High Risk ({riskPreview.high})</span>
            <span className="text-amber-500">Medium ({riskPreview.medium})</span>
            <span className="text-green-500">Low ({riskPreview.low})</span>
          </div>
        </div>
      </SectionCard>

      {/* Cost Assumptions */}
      <SectionCard icon={DollarSign} title="Cost Assumptions">
        <SliderField
          label="Default Salary for Cost Calculations"
          value={draft.defaultSalary}
          onChange={v => updateDraft({ defaultSalary: v })}
          min={30000}
          max={200000}
          step={5000}
          format={v => `$${(v / 1000).toFixed(0)}K`}
        />
        <SliderField
          label="Average Replacement Cost Multiplier"
          value={draft.replacementCostMultiplier}
          onChange={v => updateDraft({ replacementCostMultiplier: v })}
          min={0.5}
          max={3.0}
          step={0.1}
          suffix="x"
        />
        <SliderField
          label="Training Period (days)"
          value={draft.trainingPeriodDays}
          onChange={v => updateDraft({ trainingPeriodDays: v })}
          min={14}
          max={180}
          suffix=" days"
        />
      </SectionCard>

      {/* Display Preferences */}
      <SectionCard icon={Monitor} title="Display Preferences">
        <ToggleField
          label="Show Employee Photos"
          description="Display avatar images in employee lists"
          checked={draft.showEmployeePhotos}
          onChange={v => updateDraft({ showEmployeePhotos: v })}
        />
        <ToggleField
          label="Chart Animation"
          description="Animate charts and transitions"
          checked={draft.chartAnimation}
          onChange={v => updateDraft({ chartAnimation: v })}
        />
        <ToggleField
          label="Compact View"
          description="Reduce spacing and padding for denser displays"
          checked={draft.compactView}
          onChange={v => updateDraft({ compactView: v })}
        />
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Items Per Page</p>
            <p className="text-xs text-gray-400 mt-0.5">Number of rows displayed in tables</p>
          </div>
          <select
            value={draft.itemsPerPage}
            onChange={e => updateDraft({ itemsPerPage: parseInt(e.target.value) })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </SectionCard>

      {/* Notification Rules */}
      <SectionCard icon={Bell} title="Notification Rules">
        <ToggleField
          label="Alert on High Risk Threshold"
          description="Notify when an employee crosses the high risk threshold"
          checked={draft.alertHighRiskThreshold}
          onChange={v => updateDraft({ alertHighRiskThreshold: v })}
        />
        <ToggleField
          label="New Hire At-Risk Alert"
          description="Alert for new hires showing risk within 90 days"
          checked={draft.alertNewHiresAtRisk}
          onChange={v => updateDraft({ alertNewHiresAtRisk: v })}
        />
        <ToggleField
          label="Weekly Digest Email"
          description="Receive a weekly summary email of risk changes"
          checked={draft.weeklyDigest}
          onChange={v => updateDraft({ weeklyDigest: v })}
        />
      </SectionCard>
    </div>
  );
}

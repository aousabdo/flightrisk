import { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Camera, Trash2, GitCompare, ArrowUpRight, ArrowDownRight,
  Minus, Calendar, AlertTriangle,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';
import { useData } from '../hooks/useEmployees';
import { formatCurrency } from '../lib/costs';

/* ─── Simulated History ─── */
function generateHistory(employees, stats) {
  if (!employees.length || !stats) return [];

  const currentAtRisk = stats.atRiskCount;
  const currentTotal = stats.total;
  const currentRate = ((stats.atRiskCount / stats.total) * 100);
  const currentCost = stats.totalCost;
  const currentAvgRisk = stats.avgProb * 100;

  // Seed the random so it's consistent per session
  let seed = 42;
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(2026, 2 - i, 1);
    const factor = 0.85 + seededRandom() * 0.3;
    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      date: date.toISOString(),
      atRiskCount: Math.round(currentAtRisk * factor),
      totalCount: currentTotal,
      attritionRate: parseFloat((currentRate * factor).toFixed(1)),
      costExposure: Math.round(currentCost * factor),
      avgRisk: parseFloat((currentAvgRisk * factor).toFixed(1)),
      isCurrent: i === 0,
    });
  }
  return months;
}

function generateForecast(history) {
  if (history.length < 3) return [];
  const last3 = history.slice(-3);

  const rateSlope = (last3[2].attritionRate - last3[0].attritionRate) / 2;
  const countSlope = (last3[2].atRiskCount - last3[0].atRiskCount) / 2;
  const costSlope = (last3[2].costExposure - last3[0].costExposure) / 2;
  const riskSlope = (last3[2].avgRisk - last3[0].avgRisk) / 2;

  const forecast = [];
  for (let i = 1; i <= 3; i++) {
    const date = new Date(2026, 2 + i, 1);
    forecast.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      date: date.toISOString(),
      attritionRate: parseFloat((last3[2].attritionRate + rateSlope * i).toFixed(1)),
      atRiskCount: Math.max(0, Math.round(last3[2].atRiskCount + countSlope * i)),
      costExposure: Math.max(0, Math.round(last3[2].costExposure + costSlope * i)),
      avgRisk: parseFloat(Math.max(0, last3[2].avgRisk + riskSlope * i).toFixed(1)),
      isForecast: true,
    });
  }
  return forecast;
}

/* ─── Sparkline ─── */
function Sparkline({ data, dataKey, color = '#3b82f6', height = 32, width = 80 }) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─── Change Badge ─── */
function ChangeBadge({ current, previous, format = 'number', suffix = '' }) {
  if (previous == null || current == null) return null;
  const delta = current - previous;
  const isUp = delta > 0;
  const isZero = delta === 0;
  const color = isZero ? 'text-gray-500' : isUp ? 'text-red-600' : 'text-green-600';
  const bg = isZero ? 'bg-gray-50' : isUp ? 'bg-red-50' : 'bg-green-50';
  const Icon = isZero ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  let display;
  if (format === 'currency') {
    display = formatCurrency(Math.abs(delta));
  } else if (format === 'percent') {
    display = `${Math.abs(delta).toFixed(1)}%`;
  } else {
    display = Math.abs(delta).toString();
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${bg}`}>
      <Icon className="w-3 h-3" />
      {isUp ? '+' : isZero ? '' : '-'}{display}{suffix}
    </span>
  );
}

/* ─── Snapshot helpers ─── */
function loadSnapshots() {
  try {
    const raw = localStorage.getItem('flightrisk-snapshots');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSnapshots(snaps) {
  localStorage.setItem('flightrisk-snapshots', JSON.stringify(snaps));
}

/* ─── Chart Tooltip ─── */
function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-gray-900">
        {valueFormatter ? valueFormatter(item.value) : item.value}
      </p>
      {item.payload?.isForecast && (
        <p className="text-xs text-orange-500 mt-0.5">Forecast</p>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function TrendTracker() {
  const { employees, stats } = useData();
  const [snapshots, setSnapshots] = useState(loadSnapshots);
  const [compareIds, setCompareIds] = useState([]);

  const history = useMemo(() => generateHistory(employees, stats), [employees, stats]);
  const forecast = useMemo(() => generateForecast(history), [history]);
  const combined = useMemo(() => [...history, ...forecast], [history, forecast]);

  // Month-over-month deltas
  const mom = useMemo(() => {
    if (history.length < 2) return null;
    const cur = history[history.length - 1];
    const prev = history[history.length - 2];
    return {
      rate: { current: cur.attritionRate, previous: prev.attritionRate },
      count: { current: cur.atRiskCount, previous: prev.atRiskCount },
      cost: { current: cur.costExposure, previous: prev.costExposure },
      risk: { current: cur.avgRisk, previous: prev.avgRisk },
    };
  }, [history]);

  // Top risk department for snapshot
  const topRiskDept = useMemo(() => {
    if (!stats?.byDept) return 'N/A';
    let max = { dept: 'N/A', rate: 0 };
    Object.entries(stats.byDept).forEach(([dept, d]) => {
      const rate = d.atRisk / d.total;
      if (rate > max.rate) max = { dept, rate };
    });
    return max.dept;
  }, [stats]);

  const takeSnapshot = useCallback(() => {
    if (!stats) return;
    const snap = {
      id: Date.now(),
      date: new Date().toISOString(),
      total: stats.total,
      atRiskCount: stats.atRiskCount,
      attritionRate: parseFloat(((stats.atRiskCount / stats.total) * 100).toFixed(1)),
      costExposure: stats.totalCost,
      avgRisk: parseFloat((stats.avgProb * 100).toFixed(1)),
      topRiskDept,
    };
    const updated = [snap, ...snapshots];
    setSnapshots(updated);
    saveSnapshots(updated);
  }, [stats, snapshots, topRiskDept]);

  const deleteSnapshot = useCallback((id) => {
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    saveSnapshots(updated);
    setCompareIds(prev => prev.filter(cid => cid !== id));
  }, [snapshots]);

  const toggleCompare = useCallback((id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(cid => cid !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const compareData = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const a = snapshots.find(s => s.id === compareIds[0]);
    const b = snapshots.find(s => s.id === compareIds[1]);
    if (!a || !b) return null;
    return { a, b };
  }, [compareIds, snapshots]);

  // Forecast message
  const forecastMsg = useMemo(() => {
    if (!forecast.length) return null;
    const last = forecast[forecast.length - 1];
    const month = new Date(last.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `If current trends continue, expect ~${last.atRiskCount} at-risk employees by ${month}`;
  }, [forecast]);

  if (!stats) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-gray-400">
        Loading trend data...
      </div>
    );
  }

  const chartMargin = { top: 10, right: 10, left: 0, bottom: 0 };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Historical Trends
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            12-month trend analysis with 3-month forecast
          </p>
        </div>
        <button
          onClick={takeSnapshot}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Camera className="w-4 h-4" />
          Take Snapshot
        </button>
      </div>

      {/* Forecast Banner */}
      {forecastMsg && (
        <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-sm text-orange-800">{forecastMsg}</p>
        </div>
      )}

      {/* MoM Summary Cards */}
      {mom && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Attrition Rate', ...mom.rate, format: 'percent', sparkKey: 'attritionRate', color: '#ef4444' },
            { label: 'At-Risk Count', ...mom.count, format: 'number', sparkKey: 'atRiskCount', color: '#f97316' },
            { label: 'Cost Exposure', ...mom.cost, format: 'currency', sparkKey: 'costExposure', color: '#3b82f6' },
            { label: 'Avg Risk Score', ...mom.risk, format: 'percent', sparkKey: 'avgRisk', color: '#8b5cf6' },
          ].map(card => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-xl font-bold text-gray-800">
                    {card.format === 'currency' ? formatCurrency(card.current) :
                     card.format === 'percent' ? `${card.current}%` : card.current}
                  </p>
                  <div className="mt-1">
                    <ChangeBadge
                      current={card.current}
                      previous={card.previous}
                      format={card.format}
                      suffix=" vs last mo"
                    />
                  </div>
                </div>
                <Sparkline data={history} dataKey={card.sparkKey} color={card.color} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trend Charts 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attrition Rate */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Attrition Rate %</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={combined} margin={chartMargin}>
              <defs>
                <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip valueFormatter={v => `${v}%`} />} />
              <Area
                type="monotone"
                dataKey="attritionRate"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#rateGrad)"
                strokeDasharray={undefined}
                dot={(props) => {
                  if (props.payload?.isCurrent) {
                    return <circle cx={props.cx} cy={props.cy} r={4} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                  }
                  return null;
                }}
              />
              {/* Forecast as dashed */}
              {history.length > 0 && (
                <Area
                  type="monotone"
                  dataKey="attritionRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="none"
                  data={[history[history.length - 1], ...forecast]}
                  connectNulls={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* At-Risk Count */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">At-Risk Employee Count</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={combined} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="atRiskCount"
                radius={[3, 3, 0, 0]}
                fill="#f97316"
                fillOpacity={0.8}
                // Highlight current month
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const fill = payload?.isForecast ? '#fdba74' : payload?.isCurrent ? '#ea580c' : '#f97316';
                  const dash = payload?.isForecast ? '4 2' : undefined;
                  return (
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx={3}
                      fill={fill}
                      fillOpacity={payload?.isForecast ? 0.5 : 0.8}
                      stroke={payload?.isForecast ? '#f97316' : 'none'}
                      strokeWidth={payload?.isForecast ? 1 : 0}
                      strokeDasharray={dash}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Exposure */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Cost Exposure</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={combined} margin={chartMargin}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v)} />
              <Tooltip content={<ChartTooltip valueFormatter={v => formatCurrency(v)} />} />
              <Area
                type="monotone"
                dataKey="costExposure"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#costGrad)"
                dot={(props) => {
                  if (props.payload?.isCurrent) {
                    return <circle cx={props.cx} cy={props.cy} r={4} fill="#3b82f6" stroke="#fff" strokeWidth={2} />;
                  }
                  if (props.payload?.isForecast) {
                    return <circle cx={props.cx} cy={props.cy} r={3} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="2 2" />;
                  }
                  return null;
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Risk Score */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Average Risk Score</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={combined} margin={chartMargin}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip valueFormatter={v => `${v}%`} />} />
              <Area
                type="monotone"
                dataKey="avgRisk"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#riskGrad)"
                dot={(props) => {
                  if (props.payload?.isCurrent) {
                    return <circle cx={props.cx} cy={props.cy} r={4} fill="#8b5cf6" stroke="#fff" strokeWidth={2} />;
                  }
                  if (props.payload?.isForecast) {
                    return <circle cx={props.cx} cy={props.cy} r={3} fill="none" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="2 2" />;
                  }
                  return null;
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Snapshot History */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Snapshot History
          </h3>
          {compareIds.length === 2 && (
            <button
              onClick={() => setCompareIds([])}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear comparison
            </button>
          )}
        </div>

        {snapshots.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No snapshots yet. Take a snapshot to track changes over time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-right px-4 py-2 font-medium">Employees</th>
                  <th className="text-right px-4 py-2 font-medium">At Risk</th>
                  <th className="text-right px-4 py-2 font-medium">Rate</th>
                  <th className="text-right px-4 py-2 font-medium">Cost</th>
                  <th className="text-left px-4 py-2 font-medium">Top Dept</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map(snap => {
                  const isComparing = compareIds.includes(snap.id);
                  return (
                    <tr
                      key={snap.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isComparing ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-gray-700">
                        {new Date(snap.date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{snap.total}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{snap.atRiskCount}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{snap.attritionRate}%</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(snap.costExposure)}</td>
                      <td className="px-4 py-2.5 text-gray-700">{snap.topRiskDept}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleCompare(snap.id)}
                            className={`p-1 rounded text-xs ${isComparing ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            title="Compare"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteSnapshot(snap.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compare View */}
      {compareData && (
        <div className="bg-white border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-blue-600" />
            Snapshot Comparison
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
            {/* Header row */}
            <div className="font-medium text-gray-500">Metric</div>
            <div className="font-medium text-gray-700 text-center">
              {new Date(compareData.a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="font-medium text-gray-700 text-center">
              {new Date(compareData.b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="font-medium text-gray-500 text-center">Delta</div>
            <div className="font-medium text-gray-500 text-center">Trend</div>

            {/* Rows */}
            {[
              { label: 'At-Risk Count', key: 'atRiskCount', format: 'number' },
              { label: 'Attrition Rate', key: 'attritionRate', format: 'percent' },
              { label: 'Cost Exposure', key: 'costExposure', format: 'currency' },
              { label: 'Avg Risk Score', key: 'avgRisk', format: 'percent' },
            ].map(row => {
              const aVal = compareData.a[row.key];
              const bVal = compareData.b[row.key];
              const delta = bVal - aVal;
              const isUp = delta > 0;
              return [
                <div key={`${row.key}-label`} className="text-gray-600">{row.label}</div>,
                <div key={`${row.key}-a`} className="text-center text-gray-800">
                  {row.format === 'currency' ? formatCurrency(aVal) : row.format === 'percent' ? `${aVal}%` : aVal}
                </div>,
                <div key={`${row.key}-b`} className="text-center text-gray-800">
                  {row.format === 'currency' ? formatCurrency(bVal) : row.format === 'percent' ? `${bVal}%` : bVal}
                </div>,
                <div key={`${row.key}-delta`} className="text-center">
                  <ChangeBadge current={bVal} previous={aVal} format={row.format} />
                </div>,
                <div key={`${row.key}-trend`} className="flex justify-center">
                  {isUp ? <TrendingUp className="w-4 h-4 text-red-500" /> : delta < 0 ? <TrendingDown className="w-4 h-4 text-green-500" /> : <Minus className="w-4 h-4 text-gray-400" />}
                </div>,
              ];
            })}
          </div>
        </div>
      )}
    </div>
  );
}

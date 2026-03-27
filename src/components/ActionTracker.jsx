import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ClipboardList, Plus, X, Pencil, Trash2, Filter, CheckCircle2, Clock,
  AlertTriangle, XCircle, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useData } from '../hooks/useEmployees';

const STORAGE_KEY = 'flightrisk-actions';

const ACTION_TYPES = [
  'Compensation Review',
  'Career Discussion',
  'Workload Adjustment',
  'Training/Development',
  'Transfer/Reassignment',
  'Mentorship',
  'Other',
];

const ACTION_TYPE_COLORS = {
  'Compensation Review': 'bg-green-100 text-green-700',
  'Career Discussion': 'bg-blue-100 text-blue-700',
  'Workload Adjustment': 'bg-purple-100 text-purple-700',
  'Training/Development': 'bg-amber-100 text-amber-700',
  'Transfer/Reassignment': 'bg-cyan-100 text-cyan-700',
  'Mentorship': 'bg-pink-100 text-pink-700',
  'Other': 'bg-gray-100 text-gray-700',
};

const PRIORITY_COLORS = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
};

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'Cancelled'];

const STATUS_CHART_COLORS = {
  'Not Started': '#94a3b8',
  'In Progress': '#f59e0b',
  'Completed': '#22c55e',
  'Cancelled': '#ef4444',
};

function loadActions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveActions(actions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}

function isOverdue(action) {
  if (!action.dueDate) return false;
  if (action.status === 'Completed' || action.status === 'Cancelled') return false;
  return new Date(action.dueDate) < new Date(new Date().toDateString());
}

/* ─── Modal ─── */
function ActionModal({ isOpen, onClose, onSave, action, atRiskEmployees }) {
  const [form, setForm] = useState({
    employeeNumber: '',
    employeeName: '',
    employeeDept: '',
    actionType: ACTION_TYPES[0],
    description: '',
    assignedTo: '',
    priority: 'Medium',
    dueDate: '',
    status: 'Not Started',
  });

  useEffect(() => {
    if (action) {
      setForm({ ...action });
    } else {
      setForm({
        employeeNumber: '',
        employeeName: '',
        employeeDept: '',
        actionType: ACTION_TYPES[0],
        description: '',
        assignedTo: '',
        priority: 'Medium',
        dueDate: '',
        status: 'Not Started',
      });
    }
  }, [action, isOpen]);

  if (!isOpen) return null;

  function handleEmployeeChange(e) {
    const empNum = e.target.value;
    const emp = atRiskEmployees.find(em => String(em.EmployeeNumber) === empNum);
    if (emp) {
      setForm(prev => ({
        ...prev,
        employeeNumber: String(emp.EmployeeNumber),
        employeeName: emp.Name,
        employeeDept: emp.Department,
      }));
    } else {
      setForm(prev => ({ ...prev, employeeNumber: empNum }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.employeeName || !form.description) return;
    onSave({
      ...form,
      id: action?.id || crypto.randomUUID(),
      createdAt: action?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {action ? 'Edit Action' : 'Create Action'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Employee Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={form.employeeNumber}
              onChange={handleEmployeeChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
              required
            >
              <option value="">Select an at-risk employee...</option>
              {atRiskEmployees.map(emp => (
                <option key={emp.EmployeeNumber} value={emp.EmployeeNumber}>
                  {emp.Name} - {emp.Department} ({((emp.prob_of_attrition || 0) * 100).toFixed(0)}% risk)
                </option>
              ))}
            </select>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <select
              value={form.actionType}
              onChange={e => setForm(prev => ({ ...prev, actionType: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
            >
              {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
              placeholder="Describe the retention action..."
              required
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <input
              type="text"
              value={form.assignedTo}
              onChange={e => setForm(prev => ({ ...prev, assignedTo: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Manager or HR contact..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {action ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ActionTracker() {
  const { employees, departments } = useData();
  const [actions, setActions] = useState(loadActions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  const atRiskEmployees = useMemo(
    () => employees.filter(e => e.label === 'Yes').sort((a, b) => (b.prob_of_attrition || 0) - (a.prob_of_attrition || 0)),
    [employees]
  );

  const assignees = useMemo(
    () => [...new Set(actions.map(a => a.assignedTo).filter(Boolean))].sort(),
    [actions]
  );

  const persist = useCallback((newActions) => {
    setActions(newActions);
    saveActions(newActions);
  }, []);

  function handleSave(action) {
    const existing = actions.findIndex(a => a.id === action.id);
    if (existing >= 0) {
      const updated = [...actions];
      updated[existing] = action;
      persist(updated);
    } else {
      persist([action, ...actions]);
    }
  }

  function handleDelete(id) {
    persist(actions.filter(a => a.id !== id));
  }

  function handleStatusChange(id, status) {
    const updated = actions.map(a =>
      a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a
    );
    persist(updated);
  }

  function openEdit(action) {
    setEditingAction(action);
    setModalOpen(true);
  }

  function openCreate() {
    setEditingAction(null);
    setModalOpen(true);
  }

  // Stats
  const stats = useMemo(() => {
    const total = actions.length;
    const inProgress = actions.filter(a => a.status === 'In Progress').length;
    const completed = actions.filter(a => a.status === 'Completed').length;
    const overdue = actions.filter(a => isOverdue(a)).length;
    return { total, inProgress, completed, overdue };
  }, [actions]);

  // Chart data
  const chartData = useMemo(() => {
    const counts = {};
    STATUS_OPTIONS.forEach(s => { counts[s] = 0; });
    actions.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return STATUS_OPTIONS.map(s => ({ name: s, count: counts[s] }));
  }, [actions]);

  // Filtered actions
  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterDept !== 'all' && a.employeeDept !== filterDept) return false;
      if (filterPriority !== 'all' && a.priority !== filterPriority) return false;
      if (filterAssignee !== 'all' && a.assignedTo !== filterAssignee) return false;
      return true;
    });
  }, [actions, filterStatus, filterDept, filterPriority, filterAssignee]);

  return (
    <div className="p-6 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Action Tracker
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track retention actions for at-risk employees</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Action
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Actions</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm">
          <p className="text-xs text-amber-600 uppercase tracking-wide">In Progress</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
          <p className="text-xs text-green-600 uppercase tracking-wide">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
          <p className="text-xs text-red-600 uppercase tracking-wide">Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters + Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Filters */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={filterAssignee}
              onChange={e => setFilterAssignee(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All Assignees</option>
              {assignees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-2">Actions by Status</p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <Tooltip formatter={v => [v, 'Count']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_CHART_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Actions Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Action Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Description</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Assigned To</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Priority</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Due Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    {actions.length === 0
                      ? 'No actions created yet. Click "Create Action" to get started.'
                      : 'No actions match the current filters.'}
                  </td>
                </tr>
              ) : (
                filteredActions.map(action => {
                  const overdue = isOverdue(action);
                  return (
                    <tr key={action.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800 truncate max-w-[140px]">{action.employeeName}</p>
                        <p className="text-[11px] text-gray-400">{action.employeeDept}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ACTION_TYPE_COLORS[action.actionType] || 'bg-gray-100 text-gray-700'}`}>
                          {action.actionType}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <p className="text-gray-600 truncate max-w-[200px]" title={action.description}>
                          {action.description}
                        </p>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-gray-600">
                        {action.assignedTo || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_COLORS[action.priority]}`}>
                          {action.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {action.dueDate ? (
                          <span className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                            {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                            {new Date(action.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={action.status}
                          onChange={e => handleStatusChange(action.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border bg-white focus:ring-2 focus:ring-blue-400 ${
                            action.status === 'Completed'
                              ? 'border-green-300 text-green-700'
                              : action.status === 'In Progress'
                              ? 'border-amber-300 text-amber-700'
                              : action.status === 'Cancelled'
                              ? 'border-red-300 text-red-700'
                              : 'border-gray-300 text-gray-700'
                          }`}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(action)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(action.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ActionModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingAction(null); }}
        onSave={handleSave}
        action={editingAction}
        atRiskEmployees={atRiskEmployees}
      />
    </div>
  );
}

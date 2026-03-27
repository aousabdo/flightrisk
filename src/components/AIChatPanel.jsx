import { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, X, Send, Loader2, AlertCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGroq } from '../hooks/useGroq';
import { useData } from '../hooks/useEmployees';

const PRESET_QUESTIONS = [
  'What department should I focus on first?',
  'Why are Sales Executives leaving?',
  "What's the most cost-effective retention strategy?",
  'Summarize our biggest risks in 3 bullets',
];

function buildContext(employees, stats) {
  if (!employees.length || !stats) return 'No employee data available.';

  const topDepts = Object.entries(stats.byDept)
    .map(([dept, d]) => ({ dept, rate: ((d.atRisk / d.total) * 100).toFixed(1), atRisk: d.atRisk, total: d.total }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  const topRoles = Object.entries(stats.byRole)
    .map(([role, d]) => ({ role, rate: ((d.atRisk / d.total) * 100).toFixed(1), atRisk: d.atRisk, total: d.total }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  const avgSalary = Math.round(employees.reduce((s, e) => s + (e.MonthlyIncome || 0), 0) / employees.length);
  const avgTenure = (employees.reduce((s, e) => s + (e.YearsAtCompany || 0), 0) / employees.length).toFixed(1);
  const overtimeRate = ((employees.filter(e => e.OverTime === 'Yes').length / employees.length) * 100).toFixed(1);

  return [
    `Total employees: ${stats.total}`,
    `At-risk employees: ${stats.atRiskCount} (${((stats.atRiskCount / stats.total) * 100).toFixed(1)}%)`,
    `Total attrition cost exposure: $${(stats.totalCost / 1000).toFixed(0)}k`,
    `Average monthly income: $${avgSalary.toLocaleString()}`,
    `Average tenure: ${avgTenure} years`,
    `Overtime rate: ${overtimeRate}%`,
    `Top risk departments: ${topDepts.map(d => `${d.dept} (${d.rate}% rate, ${d.atRisk}/${d.total})`).join(', ')}`,
    `Top risk roles: ${topRoles.map(r => `${r.role} (${r.rate}% rate, ${r.atRisk}/${r.total})`).join(', ')}`,
  ].join('\n');
}

export default function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { askGroq, loading, error } = useGroq();
  const { employees, stats } = useData();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const hasApiKey = useMemo(() => {
    try {
      const raw = localStorage.getItem('flightrisk-settings');
      if (raw) {
        const s = JSON.parse(raw);
        return !!s.groqApiKey;
      }
    } catch {}
    return false;
  }, [isOpen]); // re-check when panel opens

  const context = useMemo(() => buildContext(employees, stats), [employees, stats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  async function handleSend(text) {
    const prompt = text || input.trim();
    if (!prompt || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: prompt }]);

    try {
      const response = await askGroq(prompt, context);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', text: err.message }]);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 print:hidden"
          title="Ask AI"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-96 h-[100dvh] sm:h-[500px] bg-white sm:rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden print:hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold text-sm">AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!hasApiKey ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">API Key Required</p>
                <p className="text-xs text-gray-500 mb-4">
                  Configure your Groq API key in Settings to enable AI insights.
                </p>
                <button
                  onClick={() => { navigate('/settings'); setIsOpen(false); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Go to Settings
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 text-center mb-4">
                  Ask anything about your employee data
                </p>
                {PRESET_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="w-full text-left p-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-700 border border-gray-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : msg.role === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start" role="status">
                <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          {hasApiKey && (
            <div className="border-t border-gray-200 p-3 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your employee data..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

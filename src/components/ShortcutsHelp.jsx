import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['1', '-', '9'], desc: 'Jump to page' },
      { keys: ['Ctrl', 'K'], desc: 'Search employees' },
      { keys: ['Esc'], desc: 'Close modal / panel' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['?'], desc: 'Show this help' },
    ],
  },
  {
    title: 'Pages',
    shortcuts: [
      { keys: ['1'], desc: 'Executive Summary' },
      { keys: ['2'], desc: 'Employee Risk' },
      { keys: ['3'], desc: 'Department Explorer' },
      { keys: ['4'], desc: 'Insights' },
      { keys: ['5'], desc: 'Timeline' },
      { keys: ['6'], desc: 'Benchmarking' },
      { keys: ['7'], desc: 'Trends' },
      { keys: ['8'], desc: 'What-if Analysis' },
      { keys: ['9'], desc: 'Cost Calculator' },
    ],
  },
];

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded shadow-sm">
      {children}
    </kbd>
  );
}

export default function ShortcutsHelp({ onClose }) {
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    // Focus the close button on open
    setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => {
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Keyboard Shortcuts</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-5">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{s.desc}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) =>
                        k === '-' || k === '+' ? (
                          <span key={j} className="text-xs text-gray-400 mx-0.5">{k}</span>
                        ) : (
                          <Kbd key={j}>{k}</Kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Press <Kbd>?</Kbd> or <Kbd>Esc</Kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

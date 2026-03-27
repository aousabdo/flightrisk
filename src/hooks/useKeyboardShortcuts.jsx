import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_ROUTES = [
  '/',            // 1 - Executive Summary
  '/employees',   // 2 - Employee Risk
  '/departments', // 3 - Department Explorer
  '/insights',    // 4 - Insights
  '/timeline',    // 5 - Timeline
  '/benchmarking',// 6 - Benchmarking
  '/trends',      // 7 - Trends
  '/what-if',     // 8 - What-if Analysis
  '/cost-calculator', // 9 - Cost Calculator
];

export default function useKeyboardShortcuts({
  onToggleShortcutsHelp,
  onFocusSearch,
  onCloseAll,
}) {
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e) {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      // Ctrl+K / Cmd+K  — always active
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }

      // Escape — always active
      if (e.key === 'Escape') {
        onCloseAll?.();
        return;
      }

      // Skip remaining shortcuts when typing in an input
      if (isInput) return;

      // ? — toggle help
      if (e.key === '?') {
        e.preventDefault();
        onToggleShortcutsHelp?.();
        return;
      }

      // 1-9 quick nav
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const route = NAV_ROUTES[num - 1];
        if (route) {
          e.preventDefault();
          navigate(route);
        }
      }
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, onToggleShortcutsHelp, onFocusSearch, onCloseAll]);
}

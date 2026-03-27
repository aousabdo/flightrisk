import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const TOUR_STEPS = [
  {
    target: 'aside',
    title: 'Sidebar Navigation',
    description: 'Welcome to FlightRisk! Navigate between pages using this sidebar.',
    placement: 'right',
  },
  {
    target: '[data-tour="kpi-cards"]',
    title: 'Key Metrics',
    description: 'These KPI cards show your organization\'s key attrition metrics at a glance.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="search"]',
    title: 'Employee Search',
    description: 'Search for any employee by name across the entire platform.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Notifications',
    description: 'Notifications alert you when employees cross risk thresholds.',
    placement: 'bottom',
  },
  {
    target: 'a[href="#/employees"]',
    title: 'Employee Risk',
    description: 'Drill into individual employee risk profiles and generate retention playbooks.',
    placement: 'right',
  },
  {
    target: 'a[href="#/what-if"]',
    title: 'What-if Analysis',
    description: 'Run what-if scenarios to see how policy changes affect attrition.',
    placement: 'right',
  },
  {
    target: 'a[href="#/cost-calculator"]',
    title: 'Cost Calculator',
    description: 'Calculate the true cost of employee turnover for your organization.',
    placement: 'right',
  },
];

const PADDING = 8;
const TOOLTIP_GAP = 12;

function getTooltipStyle(rect, placement) {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  const style = { position: 'fixed' };

  switch (placement) {
    case 'right':
      style.top = rect.top + rect.height / 2;
      style.left = rect.right + TOOLTIP_GAP + PADDING;
      style.transform = 'translateY(-50%)';
      break;
    case 'left':
      style.top = rect.top + rect.height / 2;
      style.right = window.innerWidth - rect.left + TOOLTIP_GAP + PADDING;
      style.transform = 'translateY(-50%)';
      break;
    case 'top':
      style.bottom = window.innerHeight - rect.top + TOOLTIP_GAP + PADDING;
      style.left = rect.left + rect.width / 2;
      style.transform = 'translateX(-50%)';
      break;
    case 'bottom':
    default:
      style.top = rect.bottom + TOOLTIP_GAP + PADDING;
      style.left = rect.left + rect.width / 2;
      style.transform = 'translateX(-50%)';
      break;
  }

  return style;
}

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Capture the element that had focus before the tour opened
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    return () => {
      // Return focus to trigger when tour closes
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Focus the first button in the tooltip when it becomes visible
  useEffect(() => {
    if (visible && tooltipRef.current) {
      const firstButton = tooltipRef.current.querySelector('button');
      if (firstButton) firstButton.focus();
    }
  }, [visible, step]);

  const currentStep = TOUR_STEPS[step];

  const measureTarget = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Small delay so scroll settles
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        setVisible(true);
      });
    } else {
      // Target not found, show centered
      setTargetRect(null);
      setVisible(true);
    }
  }, [currentStep]);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(measureTarget, 150);
    return () => clearTimeout(timer);
  }, [step, measureTarget]);

  // Re-measure on resize
  useEffect(() => {
    const handleResize = () => measureTarget();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureTarget]);

  // Clamp tooltip to viewport
  useEffect(() => {
    if (!visible || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth - 16) {
      el.style.left = `${window.innerWidth - rect.width - 16}px`;
      el.style.transform = 'none';
    }
    if (rect.left < 16) {
      el.style.left = '16px';
      el.style.transform = 'none';
    }
    if (rect.bottom > window.innerHeight - 16) {
      el.style.top = `${window.innerHeight - rect.height - 16}px`;
      el.style.transform = 'none';
    }
  }, [visible, targetRect]);

  function finish() {
    localStorage.setItem('flightrisk-tour-done', 'true');
    onComplete();
  }

  function next() {
    if (step < TOUR_STEPS.length - 1) setStep(step + 1);
    else finish();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  // Spotlight clip-path
  const spotlightStyle = targetRect
    ? {
        clipPath: `polygon(
          0% 0%, 0% 100%,
          ${targetRect.left - PADDING}px 100%,
          ${targetRect.left - PADDING}px ${targetRect.top - PADDING}px,
          ${targetRect.right + PADDING}px ${targetRect.top - PADDING}px,
          ${targetRect.right + PADDING}px ${targetRect.bottom + PADDING}px,
          ${targetRect.left - PADDING}px ${targetRect.bottom + PADDING}px,
          ${targetRect.left - PADDING}px 100%,
          100% 100%, 100% 0%
        )`,
      }
    : {};

  const tooltipStyle = getTooltipStyle(targetRect, currentStep?.placement);
  const isLast = step === TOUR_STEPS.length - 1;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 9999 }} role="dialog" aria-modal="true" aria-label="Onboarding tour">
      {/* Semi-transparent backdrop with spotlight cutout */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        style={spotlightStyle}
        onClick={finish}
      />

      {/* Highlight border around target */}
      {targetRect && (
        <div
          className="absolute rounded-lg border-2 border-blue-400 pointer-events-none transition-all duration-300"
          style={{
            zIndex: 10000,
            top: targetRect.top - PADDING,
            left: targetRect.left - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-5 transition-all duration-300 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          ...tooltipStyle,
          zIndex: 10001,
          width: 320,
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {/* Close button */}
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step counter */}
        <div className="flex items-center gap-1.5 mb-3">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-blue-500' : i < step ? 'w-1.5 bg-blue-300' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-gray-800 mb-1.5">{currentStep?.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">{currentStep?.description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <button onClick={finish} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 mr-1">
              {step + 1} of {TOUR_STEPS.length}
            </span>
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {isLast ? 'Finish' : 'Next'} {!isLast && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

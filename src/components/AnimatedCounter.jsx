import { useState, useEffect, useRef } from 'react';

/**
 * Animated number counter that counts up from 0 to a target value
 * with ease-out cubic easing when the element scrolls into view.
 *
 * Usage: <AnimatedCounter value={205} prefix="$" suffix="M" duration={1500} />
 */
export default function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  duration = 1200,
  decimals = 0,
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration, decimals]);

  function animate() {
    const start = performance.now();
    const target = typeof value === 'number' ? value : parseFloat(value) || 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;

      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    }

    requestAnimationFrame(tick);
  }

  const formatted = display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

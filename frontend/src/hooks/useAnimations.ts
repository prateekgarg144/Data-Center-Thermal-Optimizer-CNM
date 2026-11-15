import { useState, useEffect, useRef, useCallback } from 'react';

/** Animate a number from 0 to target */
export function useCountUp(target: number, duration = 1200, active = true) {
  const [value, setValue] = useState(0);
  const startTime = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active || target === 0) { setValue(target); return; }
    startTime.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(target * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, active]);

  return value;
}

/** Intersection observer hook */
export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.15, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView] as const;
}

/** Tilt card effect */
export function useTilt(intensity = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({});

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(800px) rotateX(${-y * intensity}deg) rotateY(${x * intensity}deg)`,
      transition: 'transform 0.1s ease',
    });
  }, [intensity]);

  const handleLeave = useCallback(() => {
    setStyle({ transform: 'perspective(800px) rotateX(0) rotateY(0)', transition: 'transform 0.4s ease' });
  }, []);

  return { ref, style, onMouseMove: handleMove, onMouseLeave: handleLeave };
}

/** Theme toggle */
export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

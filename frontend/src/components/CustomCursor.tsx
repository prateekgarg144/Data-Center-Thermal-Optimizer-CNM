import React, { useEffect, useState, useRef } from 'react';

interface MicroBubble {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export const CustomCursor: React.FC = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [microBubbles, setMicroBubbles] = useState<MicroBubble[]>([]);
  const bubbleIdRef = useRef(0);
  const lastBubbleTime = useRef(0);

  useEffect(() => {
    // Only on pointer-capable desktop
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });

      // Leave micro-bubbles periodically on movement
      const now = performance.now();
      if (now - lastBubbleTime.current > 70) {
        lastBubbleTime.current = now;
        const newBubble: MicroBubble = {
          id: ++bubbleIdRef.current,
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          size: Math.random() * 5 + 3,
          opacity: 0.65,
        };
        setMicroBubbles(prev => [...prev.slice(-12), newBubble]);
      }

      // Detect clickable / interactive elements
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('button, a, input, select, [role="button"], .chip, .cursor-pointer');
        setIsHovered(!!interactive);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Fade out micro bubbles
  useEffect(() => {
    if (microBubbles.length === 0) return;
    const interval = setInterval(() => {
      setMicroBubbles(prev =>
        prev
          .map(b => ({ ...b, opacity: b.opacity - 0.04, y: b.y - 0.5 }))
          .filter(b => b.opacity > 0.05)
      );
    }, 40);
    return () => clearInterval(interval);
  }, [microBubbles.length]);

  return (
    <>
      {/* Micro-bubbles trail */}
      {microBubbles.map(b => (
        <div
          key={b.id}
          className="fixed pointer-events-none rounded-full z-[9998]"
          style={{
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle at 35% 35%, #BDF5EC 0%, rgba(79, 227, 208, 0.4) 60%, transparent 100%)',
            border: '0.5px solid rgba(189, 245, 236, 0.7)',
            opacity: b.opacity,
            boxShadow: '0 0 4px rgba(79, 227, 208, 0.4)',
          }}
        />
      ))}

      {/* Main foam ring cursor */}
      <div
        className="fixed pointer-events-none z-[9999] rounded-full transition-transform duration-75 ease-out"
        style={{
          left: pos.x,
          top: pos.y,
          width: isHovered ? 40 : 22,
          height: isHovered ? 40 : 22,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.8 : 1})`,
          border: isHovered ? '1.5px solid var(--foam)' : '1px solid var(--aqua)',
          background: isHovered ? 'rgba(79, 227, 208, 0.12)' : 'rgba(79, 227, 208, 0.04)',
          boxShadow: isHovered
            ? '0 0 16px rgba(79, 227, 208, 0.45), inset 0 0 8px rgba(189, 245, 236, 0.3)'
            : '0 0 8px rgba(79, 227, 208, 0.25)',
          transition: 'width 0.2s ease, height 0.2s ease, border-color 0.2s ease, background 0.2s ease, transform 0.08s ease-out',
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            top: '30%',
            left: '30%',
            width: isHovered ? 6 : 4,
            height: isHovered ? 6 : 4,
            background: 'var(--foam)',
            opacity: 0.85,
            boxShadow: '0 0 3px var(--foam)',
          }}
        />
      </div>
    </>
  );
};

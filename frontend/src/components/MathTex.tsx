import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathTexProps {
  math: string;
  inline?: boolean;
  className?: string;
}

export const MathTex: React.FC<MathTexProps> = ({ math, inline = false, className = '' }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: !inline,
          throwOnError: false,
        });
      } catch {
        containerRef.current.textContent = math;
      }
    }
  }, [math, inline]);

  return <span ref={containerRef} className={`inline-block ${className}`} />;
};

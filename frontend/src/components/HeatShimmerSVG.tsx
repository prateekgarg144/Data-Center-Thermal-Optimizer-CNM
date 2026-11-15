import React from 'react';

export const HeatShimmerSVG: React.FC = () => {
  return (
    <svg className="absolute w-0 h-0 overflow-hidden" aria-hidden="true" focusable="false">
      <defs>
        <filter id="heatShimmer" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04 0.09"
            numOctaves="2"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="4s"
              values="0.04 0.08; 0.05 0.12; 0.04 0.08"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
};

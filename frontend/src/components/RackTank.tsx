import React, { useMemo } from 'react';

interface RackTankProps {
  rackIndex: number;
  temp: number;
  heatKw: number;
  coolingKw: number;
  minTemp: number;
  maxTemp: number;
  ambientTemp: number;
}

export const RackTank: React.FC<RackTankProps> = ({
  rackIndex,
  temp,
  heatKw,
  coolingKw,
  minTemp,
  maxTemp,
  ambientTemp,
}) => {
  // Normalize temperature for liquid height: minTemp = 15%, maxTemp = 85%
  const tempRange = Math.max(maxTemp - minTemp, 1);
  const normalized = (temp - minTemp) / tempRange;
  const fillPercent = Math.min(Math.max(15 + normalized * 70, 10), 100);

  const isViolation = temp > maxTemp || temp < minTemp;
  const isNearLimit = temp >= maxTemp - 0.5;

  // Temperature color scale
  const { liquidColor, liquidGlow, textColor } = useMemo(() => {
    if (temp >= maxTemp) {
      return {
        liquidColor: 'linear-gradient(180deg, rgba(255,122,89,0.85) 0%, rgba(255,122,89,0.4) 100%)',
        liquidGlow: '0 0 20px rgba(255,122,89,0.6)',
        textColor: 'text-ember',
      };
    }
    if (temp >= maxTemp - 1.0) {
      return {
        liquidColor: 'linear-gradient(180deg, rgba(255,193,94,0.8) 0%, rgba(255,122,89,0.3) 100%)',
        liquidGlow: '0 0 15px rgba(255,193,94,0.4)',
        textColor: 'text-amber',
      };
    }
    if (temp <= minTemp + 0.5) {
      return {
        liquidColor: 'linear-gradient(180deg, rgba(189,245,236,0.8) 0%, rgba(79,227,208,0.3) 100%)',
        liquidGlow: '0 0 15px rgba(189,245,236,0.4)',
        textColor: 'text-foam',
      };
    }
    return {
      liquidColor: 'linear-gradient(180deg, rgba(79,227,208,0.75) 0%, rgba(14,34,48,0.6) 100%)',
      liquidGlow: '0 0 12px rgba(79,227,208,0.3)',
      textColor: 'text-aqua',
    };
  }, [temp, minTemp, maxTemp]);

  return (
    <div className="flex flex-col items-center">
      {/* Tank header */}
      <div className="text-center mb-2">
        <div className="text-[11px] font-mono text-slate uppercase tracking-wider">
          Rack 0{rackIndex + 1}
        </div>
        <div className={`font-mono font-bold text-lg tabular-nums ${textColor}`}>
          {temp.toFixed(2)}°C
        </div>
      </div>

      {/* Vertical tank container */}
      <div
        className={`relative w-20 sm:w-24 h-64 rounded-xl border border-tide bg-deep/90 overflow-hidden shadow-inner flex flex-col justify-end ${
          isNearLimit ? 'heat-shimmer' : ''
        }`}
        style={{
          boxShadow: isViolation ? '0 0 24px rgba(255,122,89,0.45)' : undefined,
          borderColor: isViolation ? 'var(--ember)' : undefined,
        }}
      >
        {/* Safe operating envelope marker lines */}
        <div
          className="absolute w-full border-t border-dashed border-ember/70 z-20 pointer-events-none"
          style={{ bottom: '85%' }}
          title={`Max limit: ${maxTemp}°C`}
        >
          <span className="absolute right-1 -top-3 text-[9px] font-mono text-ember/80">
            {maxTemp}°
          </span>
        </div>

        <div
          className="absolute w-full border-t border-dashed border-amber/60 z-20 pointer-events-none"
          style={{ bottom: '15%' }}
          title={`Min limit: ${minTemp}°C`}
        >
          <span className="absolute right-1 -top-3 text-[9px] font-mono text-amber/80">
            {minTemp}°
          </span>
        </div>

        {/* Tank liquid fill */}
        <div
          className="relative w-full transition-all duration-300 ease-out"
          style={{
            height: `${fillPercent}%`,
            background: liquidColor,
            boxShadow: liquidGlow,
          }}
        >
          {/* Surface meniscus line */}
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-full opacity-80"
            style={{
              background: isViolation ? '#FF7A59' : '#BDF5EC',
              boxShadow: `0 0 6px ${isViolation ? '#FF7A59' : '#4FE3D0'}`,
            }}
          />

          {/* Bubbles floating inside tank */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <span
              className="absolute w-2 h-2 rounded-full border border-foam/60 bg-foam/20 animate-bubble-rise"
              style={{ left: '25%', animationDuration: '3.2s', animationDelay: '0.2s' }}
            />
            <span
              className="absolute w-1.5 h-1.5 rounded-full border border-foam/50 bg-foam/20 animate-bubble-rise"
              style={{ left: '60%', animationDuration: '4.1s', animationDelay: '1.1s' }}
            />
            <span
              className="absolute w-2.5 h-2.5 rounded-full border border-foam/70 bg-foam/20 animate-bubble-rise"
              style={{ left: '40%', animationDuration: '2.8s', animationDelay: '1.9s' }}
            />
          </div>
        </div>

        {/* Server blade silhouettes inside tank */}
        <div className="absolute inset-x-2 inset-y-4 flex flex-col justify-between pointer-events-none opacity-25">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-1.5 w-full bg-slate/40 rounded-sm flex items-center justify-between px-1">
              <span className="w-1 h-1 rounded-full bg-mist/60" />
              <span className="w-1 h-1 rounded-full bg-mist/60" />
            </div>
          ))}
        </div>
      </div>

      {/* Metrics footer for rack */}
      <div className="mt-3 w-full text-center space-y-1 font-mono text-[11px]">
        <div className="text-slate flex justify-between px-1">
          <span>Heat:</span>
          <span className="text-mist font-semibold">{heatKw.toFixed(1)} kW</span>
        </div>
        <div className="text-slate flex justify-between px-1">
          <span>Cool:</span>
          <span className="text-aqua font-semibold">{coolingKw.toFixed(1)} kW</span>
        </div>
      </div>
    </div>
  );
};

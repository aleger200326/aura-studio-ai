'use client';

interface BlueprintLayerProps {
  variant?: 'hero' | 'portfolio' | 'quiz';
}

export function BlueprintLayer({ variant = 'hero' }: BlueprintLayerProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        maskImage:
          'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
      }}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 820"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id={`grid-${variant}`} width="72" height="72" patternUnits="userSpaceOnUse">
            <path
              d="M 72 0 L 0 0 0 72"
              stroke="rgba(22, 131, 189, 0.06)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="1440" height="820" fill={`url(#grid-${variant})`} />

        {variant === 'hero' && (
          <g stroke="rgba(13, 16, 20, 0.08)" strokeWidth="1">
            {/* Architectural floorplan outline */}
            <rect x="80" y="96" width="540" height="390" />
            <line x1="80" y1="280" x2="380" y2="280" />
            <line x1="380" y1="96" x2="380" y2="486" />
            {/* Door swing arc */}
            <path d="M 380 210 A 64 64 0 0 1 444 274" strokeDasharray="4 4" />
            <line x1="380" y1="210" x2="380" y2="274" />
            {/* Axis markers */}
            <circle cx="80" cy="64" r="12" />
            <text
              x="75"
              y="68"
              fill="rgba(14, 102, 112, 0.24)"
              fontSize="10"
              fontFamily="monospace"
            >
              A
            </text>
            <circle cx="380" cy="64" r="12" />
            <text
              x="375"
              y="68"
              fill="rgba(14, 102, 112, 0.24)"
              fontSize="10"
              fontFamily="monospace"
            >
              B
            </text>
            {/* Dimension line */}
            <line x1="80" y1="520" x2="620" y2="520" />
            <line x1="80" y1="514" x2="80" y2="526" />
            <line x1="620" y1="514" x2="620" y2="526" />
            <text
              x="315"
              y="513"
              fill="rgba(14, 102, 112, 0.24)"
              fontSize="10"
              fontFamily="monospace"
            >
              7 800 MM
            </text>
          </g>
        )}

        {variant === 'portfolio' && (
          <g stroke="rgba(14, 102, 112, 0.10)" strokeWidth="1">
            <line x1="120" y1="0" x2="120" y2="820" strokeDasharray="6 6" />
            <line x1="1320" y1="0" x2="1320" y2="820" strokeDasharray="6 6" />
            <circle cx="1260" cy="180" r="140" />
            <path d="M 1120 180 L 1400 180 M 1260 40 L 1260 320" />
          </g>
        )}

        {variant === 'quiz' && (
          <g stroke="rgba(14, 102, 112, 0.10)" strokeWidth="1">
            <rect x="960" y="90" width="380" height="620" />
            <line x1="960" y1="360" x2="1340" y2="360" />
            <path d="M 960 360 A 90 90 0 0 0 1050 270" strokeDasharray="4 4" />
            <text
              x="980"
              y="78"
              fill="rgba(14, 102, 112, 0.24)"
              fontSize="10"
              fontFamily="monospace"
            >
              SEC A-1 / SCALE 1:50
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

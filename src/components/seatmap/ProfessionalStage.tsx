import React, { memo } from 'react';

// ============================================================================
// PROFESSIONAL STAGE COMPONENT - Bagley Wright Theater Style
// ============================================================================

interface ProfessionalStageProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  viewBoxWidth?: number;
}

const ProfessionalStage: React.FC<ProfessionalStageProps> = memo(({
  x,
  y,
  width,
  height,
  label = "STAGE",
  viewBoxWidth = 1600
}) => {
  // Calculate responsive font size based on stage width
  const fontSize = Math.min(width * 0.15, 28);
  const letterSpacing = fontSize * 0.1;

  return (
    <g className="professional-stage">
      {/* Stage platform with gradient */}
      <defs>
        <linearGradient id="stageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1F2937" stopOpacity="1" />
          <stop offset="50%" stopColor="#374151" stopOpacity="1" />
          <stop offset="100%" stopColor="#111827" stopOpacity="1" />
        </linearGradient>
        
        {/* Stage glow effect */}
        <filter id="stageGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Text glow effect */}
        <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Stage shadow for depth */}
      <rect
        x={x + 3}
        y={y + 3}
        width={width}
        height={height}
        rx="8"
        fill="#000000"
        opacity="0.3"
      />

      {/* Main stage platform */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="8"
        fill="url(#stageGradient)"
        stroke="#4B5563"
        strokeWidth="2"
        filter="url(#stageGlow)"
      />

      {/* Stage front edge highlight */}
      <rect
        x={x + 4}
        y={y + height - 8}
        width={width - 8}
        height="4"
        rx="2"
        fill="#6B7280"
        opacity="0.8"
      />

      {/* Stage label with professional styling */}
      <text
        x={x + width / 2}
        y={y + height / 2 + fontSize / 3}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fill="#F9FAFB"
        letterSpacing={letterSpacing}
        filter="url(#textGlow)"
        className="stage-label"
      >
        {label}
      </text>

      {/* Decorative stage elements (curtain indication) */}
      <g opacity="0.6">
        {/* Left curtain */}
        <path
          d={`M ${x - 5} ${y + 5} Q ${x + 15} ${y - 5} ${x + 20} ${y + height + 5}`}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="2"
          opacity="0.4"
        />
        
        {/* Right curtain */}
        <path
          d={`M ${x + width + 5} ${y + 5} Q ${x + width - 15} ${y - 5} ${x + width - 20} ${y + height + 5}`}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="2"
          opacity="0.4"
        />
      </g>

      {/* Stage footlights effect */}
      <g className="footlights" opacity="0.7">
        {Array.from({ length: Math.floor(width / 25) }, (_, i) => (
          <circle
            key={i}
            cx={x + 15 + i * 25}
            cy={y + height - 5}
            r="2"
            fill="#FCD34D"
            opacity="0.8"
          >
            <animate
              attributeName="opacity"
              values="0.4;0.8;0.4"
              dur="3s"
              repeatCount="indefinite"
              begin={`${i * 0.2}s`}
            />
          </circle>
        ))}
      </g>
    </g>
  );
});

ProfessionalStage.displayName = 'ProfessionalStage';

export default ProfessionalStage; 
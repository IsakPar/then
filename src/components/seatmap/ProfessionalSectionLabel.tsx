import React, { memo } from 'react';

// ============================================================================
// PROFESSIONAL SECTION LABEL - Bagley Wright Theater Style
// ============================================================================

interface ProfessionalSectionLabelProps {
  sectionName: string;
  displayName?: string;
  x: number;
  y: number;
  width: number;
  colorHex: string;
  theme: 'premium' | 'standard' | 'budget';
  zoomLevel?: number;
}

const ProfessionalSectionLabel: React.FC<ProfessionalSectionLabelProps> = memo(({
  sectionName,
  displayName,
  x,
  y,
  width,
  colorHex,
  theme,
  zoomLevel = 1
}) => {
  // Calculate responsive sizing based on zoom and section width
  const fontSize = Math.max(12, Math.min(width * 0.08, 18)) * Math.min(zoomLevel, 1.5);
  const labelHeight = fontSize * 2.5;
  const padding = fontSize * 0.4;
  
  // Position label at top center of section
  const labelX = x + width / 2;
  const labelY = y - labelHeight / 2;
  
  // Get text color based on theme
  const getTextColor = () => {
    switch (theme) {
      case 'premium': return '#F3E8FF'; // Light purple
      case 'standard': return '#FEF3C7'; // Light amber
      case 'budget': return '#CFFAFE'; // Light cyan
      default: return '#FFFFFF';
    }
  };

  // Get background opacity based on theme
  const getBackgroundOpacity = () => {
    switch (theme) {
      case 'premium': return 0.95;
      case 'standard': return 0.9;
      case 'budget': return 0.85;
      default: return 0.9;
    }
  };

  const textColor = getTextColor();
  const backgroundOpacity = getBackgroundOpacity();
  const labelWidth = Math.max(displayName?.length || sectionName.length * 8, width * 0.6);

  return (
    <g className="professional-section-label" opacity={zoomLevel > 0.3 ? 1 : 0}>
      {/* Label background with rounded corners */}
      <rect
        x={labelX - labelWidth / 2}
        y={labelY - labelHeight / 2}
        width={labelWidth}
        height={labelHeight}
        rx={fontSize * 0.5}
        ry={fontSize * 0.5}
        fill={colorHex}
        opacity={backgroundOpacity}
        stroke="#000000"
        strokeWidth="1"
        strokeOpacity="0.2"
        filter="url(#sectionLabelShadow)"
      />

      {/* Section name text */}
      <text
        x={labelX}
        y={labelY - fontSize * 0.2}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fill={textColor}
        letterSpacing="0.05em"
        className="section-name"
      >
        {displayName || sectionName}
      </text>

      {/* Premium indicator for high-end sections */}
      {theme === 'premium' && zoomLevel > 0.8 && (
        <g>
          {/* Crown icon for premium sections */}
          <path
            d={`M ${labelX - fontSize * 1.2} ${labelY + fontSize * 0.4} 
                L ${labelX - fontSize * 0.8} ${labelY + fontSize * 0.1}
                L ${labelX - fontSize * 0.4} ${labelY + fontSize * 0.4}
                L ${labelX} ${labelY + fontSize * 0.1}
                L ${labelX + fontSize * 0.4} ${labelY + fontSize * 0.4}
                L ${labelX + fontSize * 0.8} ${labelY + fontSize * 0.1}
                L ${labelX + fontSize * 1.2} ${labelY + fontSize * 0.4}
                L ${labelX + fontSize * 1.0} ${labelY + fontSize * 0.7}
                L ${labelX - fontSize * 1.0} ${labelY + fontSize * 0.7} Z`}
            fill="#FCD34D"
            opacity="0.8"
            stroke="#F59E0B"
            strokeWidth="0.5"
          />
        </g>
      )}

      {/* Define shadow filter for labels */}
      <defs>
        <filter id="sectionLabelShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3"/>
        </filter>
      </defs>
    </g>
  );
});

ProfessionalSectionLabel.displayName = 'ProfessionalSectionLabel';

export default ProfessionalSectionLabel; 
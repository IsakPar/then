import React, { memo } from 'react';
import { SVGCanvasProps, DEFAULT_THEME } from './types';
import ProfessionalStage from './ProfessionalStage';

// ============================================================================
// SVG CANVAS - Main SVG container with proper viewBox and scaling
// ============================================================================

const SVGCanvas: React.FC<SVGCanvasProps> = memo(({
  viewBox,
  aspectRatio,
  children,
  className = ''
}) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={`seat-map-canvas ${className}`}
      style={{
        background: DEFAULT_THEME.colors.background,
        display: 'block',
        maxHeight: '100%',
        maxWidth: '100%'
      }}
      role="img"
      aria-label="Interactive theater seat map"
    >
      {/* Professional stage area */}
      <ProfessionalStageIndicator viewBox={viewBox} />
      
      {/* Main content */}
      {children}
      
      {/* Coordinate grid for debugging (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <CoordinateGrid viewBox={viewBox} />
      )}
    </svg>
  );
});

SVGCanvas.displayName = 'SVGCanvas';

// ============================================================================
// PROFESSIONAL STAGE INDICATOR SUB-COMPONENT
// ============================================================================

interface ProfessionalStageIndicatorProps {
  viewBox: string;
}

const ProfessionalStageIndicator: React.FC<ProfessionalStageIndicatorProps> = memo(({ viewBox }) => {
  // Parse viewBox to get dimensions
  const [x, y, width, height] = viewBox.split(' ').map(Number);
  
  // Professional stage dimensions and positioning (like Bagley Wright Theater)
  const stageWidth = width * 0.15; // Smaller, more realistic stage
  const stageHeight = stageWidth * 0.4; // Better proportions
  const stageX = x + (width - stageWidth) / 2;
  const stageY = y + height * 0.05; // Position at top (like reference image)

  return (
    <ProfessionalStage
      x={stageX}
      y={stageY}
      width={stageWidth}
      height={stageHeight}
      label="STAGE"
      viewBoxWidth={width}
    />
  );
});

ProfessionalStageIndicator.displayName = 'ProfessionalStageIndicator';

// ============================================================================
// COORDINATE GRID FOR DEBUGGING
// ============================================================================

interface CoordinateGridProps {
  viewBox: string;
}

const CoordinateGrid: React.FC<CoordinateGridProps> = memo(({ viewBox }) => {
  const [x, y, width, height] = viewBox.split(' ').map(Number);
  
  // Grid settings
  const gridStep = Math.max(width, height) / 20; // 20 divisions
  const gridLines: JSX.Element[] = [];
  
  // Vertical grid lines
  for (let i = x; i <= x + width; i += gridStep) {
    gridLines.push(
      <line
        key={`v-${i}`}
        x1={i}
        y1={y}
        x2={i}
        y2={y + height}
        stroke="rgba(255, 0, 0, 0.1)"
        strokeWidth={0.5}
      />
    );
  }
  
  // Horizontal grid lines
  for (let i = y; i <= y + height; i += gridStep) {
    gridLines.push(
      <line
        key={`h-${i}`}
        x1={x}
        y1={i}
        x2={x + width}
        y2={i}
        stroke="rgba(255, 0, 0, 0.1)"
        strokeWidth={0.5}
      />
    );
  }

  return (
    <g className="debug-grid" style={{ pointerEvents: 'none' }}>
      {gridLines}
      
      {/* Origin marker */}
      <circle
        cx={x}
        cy={y}
        r={3}
        fill="red"
        opacity={0.5}
      />
      
      {/* Bounds markers */}
      <circle
        cx={x + width}
        cy={y}
        r={2}
        fill="blue"
        opacity={0.5}
      />
      <circle
        cx={x}
        cy={y + height}
        r={2}
        fill="green"
        opacity={0.5}
      />
      <circle
        cx={x + width}
        cy={y + height}
        r={2}
        fill="purple"
        opacity={0.5}
      />
      
      {/* Debug info */}
      <text
        x={x + 10}
        y={y + 20}
        fontSize="8"
        fill="rgba(255, 255, 255, 0.7)"
        fontFamily="monospace"
        pointerEvents="none"
      >
        ViewBox: {viewBox}
      </text>
    </g>
  );
});

CoordinateGrid.displayName = 'CoordinateGrid';

export default SVGCanvas; 
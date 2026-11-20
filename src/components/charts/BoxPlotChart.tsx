import React, { useState } from "react";
import { ColumnProfile } from "../../types/eda";
import { formatStatNumber } from "../../utils/statistics";

interface BoxPlotChartProps {
  column: ColumnProfile | undefined;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

export const BoxPlotChart: React.FC<BoxPlotChartProps> = ({
  column,
  svgRef,
}) => {
  const [hoveredOutlierIdx, setHoveredOutlierIdx] = useState<number | null>(null);

  const stats = column?.numericStats;
  if (!column || !stats) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-[#E5E3F0] bg-[#FAFAFC] text-sm text-[#5B5B73]">
        No hay una variable numérica seleccionada para generar el diagrama BoxPlot.
      </div>
    );
  }

  const width = 720;
  const height = 240;
  const pad = { top: 36, right: 36, bottom: 52, left: 36 };
  const plotW = width - pad.left - pad.right;

  // Determine non-outlier whisker bounds inside fences
  const nonOutliers = stats.values.filter(
    (v) => v >= stats.lowerFence && v <= stats.upperFence
  );
  const whiskerLow = nonOutliers.length > 0 ? Math.min(...nonOutliers) : stats.min;
  const whiskerHigh = nonOutliers.length > 0 ? Math.max(...nonOutliers) : stats.max;

  const domainMin = Math.min(stats.min, whiskerLow);
  const domainMax = Math.max(stats.max, whiskerHigh);
  const span = domainMax - domainMin || 1;
  const marginSpan = span * 0.06;
  const xMin = domainMin - marginSpan;
  const xMax = domainMax + marginSpan;
  const fullSpan = xMax - xMin || 1;

  const sx = (v: number) => pad.left + ((v - xMin) / fullSpan) * plotW;

  const centerY = 112;
  const boxH = 54;
  const xQ1 = sx(stats.q1);
  const xMed = sx(stats.median);
  const xQ3 = sx(stats.q3);
  const xMean = sx(stats.mean);
  const xLow = sx(whiskerLow);
  const xHigh = sx(whiskerHigh);

  const hoveredOutlier =
    hoveredOutlierIdx !== null ? stats.outliers[hoveredOutlierIdx] : null;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full select-none overflow-visible"
        role="img"
        aria-label={`BoxPlot de ${column.name}`}
      >
        {/* Subtle vertical gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const val = xMin + t * fullSpan;
          const xPos = pad.left + t * plotW;
          return (
            <g key={i}>
              <line
                x1={xPos}
                x2={xPos}
                y1={pad.top}
                y2={height - pad.bottom}
                stroke="#F0EEF7"
                strokeWidth="1"
              />
              <text
                x={xPos}
                y={height - pad.bottom + 18}
                textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
                fontSize="11"
                fill="#5B5B73"
              >
                {formatStatNumber(val)}
              </text>
            </g>
          );
        })}

        {/* Whisker horizontal stems */}
        <line
          x1={xLow}
          x2={xQ1}
          y1={centerY}
          y2={centerY}
          stroke="#6D28D9"
          strokeWidth="2"
        />
        <line
          x1={xQ3}
          x2={xHigh}
          y1={centerY}
          y2={centerY}
          stroke="#6D28D9"
          strokeWidth="2"
        />

        {/* Whisker vertical caps */}
        <line
          x1={xLow}
          x2={xLow}
          y1={centerY - 14}
          y2={centerY + 14}
          stroke="#6D28D9"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1={xHigh}
          x2={xHigh}
          y1={centerY - 14}
          y2={centerY + 14}
          stroke="#6D28D9"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* IQR Box */}
        <rect
          x={xQ1}
          y={centerY - boxH / 2}
          width={Math.max(3, xQ3 - xQ1)}
          height={boxH}
          rx={4}
          fill="#EDE9FE"
          stroke="#6D28D9"
          strokeWidth="2"
        />

        {/* Median line */}
        <line
          x1={xMed}
          x2={xMed}
          y1={centerY - boxH / 2}
          y2={centerY + boxH / 2}
          stroke="#4C1D95"
          strokeWidth="3"
        />

        {/* Mean diamond marker */}
        <polygon
          points={`${xMean},${centerY - 6} ${xMean + 6},${centerY} ${xMean},${centerY + 6} ${xMean - 6},${centerY}`}
          fill="#0D9488"
          stroke="#FFFFFF"
          strokeWidth="1"
        />

        {/* Top annotations */}
        <text
          x={xQ1}
          y={centerY - boxH / 2 - 10}
          textAnchor="end"
          fontSize="10"
          fill="#5B5B73"
        >
          Q1: {formatStatNumber(stats.q1)}
        </text>
        <text
          x={xMed}
          y={centerY - boxH / 2 - 22}
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="600"
          fill="#4C1D95"
        >
          Mediana: {formatStatNumber(stats.median)}
        </text>
        <text
          x={xQ3}
          y={centerY - boxH / 2 - 10}
          textAnchor="start"
          fontSize="10"
          fill="#5B5B73"
        >
          Q3: {formatStatNumber(stats.q3)}
        </text>

        {/* Whisker labels */}
        <text
          x={xLow}
          y={centerY + boxH / 2 + 16}
          textAnchor="middle"
          fontSize="10"
          fill="#6B6882"
        >
          Bigote Inf: {formatStatNumber(whiskerLow)}
        </text>
        <text
          x={xHigh}
          y={centerY + boxH / 2 + 16}
          textAnchor="middle"
          fontSize="10"
          fill="#6B6882"
        >
          Bigote Sup: {formatStatNumber(whiskerHigh)}
        </text>

        {/* Outlier points */}
        {stats.outliers.map((out, idx) => {
          const cx = sx(out.value);
          // Small deterministic vertical jitter if multiple outliers overlap closely
          const jitter = ((idx % 3) - 1) * 7;
          const cy = centerY + jitter;
          const active = hoveredOutlierIdx === idx;
          return (
            <circle
              key={`${out.rowIndex}-${idx}`}
              cx={cx}
              cy={cy}
              r={active ? 6.5 : 5}
              fill={out.isExtreme ? "#DC2626" : "#D97706"}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredOutlierIdx(idx)}
              onMouseLeave={() => setHoveredOutlierIdx(null)}
            />
          );
        })}

        {/* Baseline axis */}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={height - pad.bottom}
          y2={height - pad.bottom}
          stroke="#CFCBDF"
        />

        <text
          x={pad.left + plotW / 2}
          y={height - 8}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill="#4A475E"
        >
          {column.name}
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-5 text-xs text-[#5B5B73]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 rounded-xs border border-[#6D28D9] bg-[#EDE9FE]" />
          Caja IQR (Q1–Q3: {formatStatNumber(stats.iqr)})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-[#4C1D95]" />
          Mediana ({formatStatNumber(stats.median)})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#0D9488]" />
          Media ({formatStatNumber(stats.mean)})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#D97706]" />
          Atípico moderado (&gt;1.5×IQR)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
          Atípico extremo (&gt;3×IQR)
        </span>
      </div>

      {hoveredOutlier && (
        <div className="pointer-events-none absolute top-2 right-3 rounded-lg border border-[#FDE68A] bg-white/95 px-3 py-2 text-xs shadow-sm">
          <div className="font-semibold text-[#171526]">
            {hoveredOutlier.isExtreme ? "Valor atípico extremo" : "Valor atípico"}
          </div>
          <div className="mt-0.5 text-[#5B5B73] tabular-nums">
            Fila #{hoveredOutlier.rowIndex} · Valor:{" "}
            <strong className="text-[#B45309]">{formatStatNumber(hoveredOutlier.value)}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

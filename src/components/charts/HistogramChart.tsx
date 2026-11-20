import React, { useMemo, useState } from "react";
import { ColumnProfile } from "../../types/eda";
import { buildHistogramBins, formatStatNumber } from "../../utils/statistics";

interface HistogramChartProps {
  column: ColumnProfile | undefined;
  binCount: number;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

export const HistogramChart: React.FC<HistogramChartProps> = ({
  column,
  binCount,
  svgRef,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const stats = column?.numericStats;
  const bins = useMemo(() => {
    if (!stats) return [];
    return buildHistogramBins(stats.values, binCount);
  }, [stats, binCount]);

  if (!column || !stats || bins.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-[#E5E3F0] bg-[#FAFAFC] text-sm text-[#5B5B73]">
        No hay variables numéricas disponibles para generar un histograma.
      </div>
    );
  }

  const width = 680;
  const height = 310;
  const pad = { top: 24, right: 24, bottom: 48, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const yTicks = 4;
  const barGap = bins.length > 14 ? 2 : 4;
  const barW = Math.max(4, plotW / bins.length - barGap);

  const minVal = stats.min;
  const maxVal = stats.max;
  const span = maxVal - minVal || 1;
  const xForValue = (v: number) =>
    pad.left + ((v - minVal) / span) * plotW;

  const meanX = xForValue(stats.mean);
  const medianX = xForValue(stats.median);

  const hoveredBin = hoveredIdx !== null ? bins[hoveredIdx] : null;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full select-none overflow-visible"
        role="img"
        aria-label={`Histograma de ${column.name}`}
      >
        {/* Horizontal gridlines */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = Math.round((maxCount / yTicks) * i);
          const yPos = pad.top + plotH - (val / maxCount) * plotH;
          return (
            <g key={i}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={yPos}
                y2={yPos}
                stroke="#ECEAF4"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={yPos + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6B6882"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Histogram bars */}
        {bins.map((bin, idx) => {
          const x = pad.left + idx * (plotW / bins.length) + barGap / 2;
          const barH = (bin.count / maxCount) * plotH;
          const y = pad.top + plotH - barH;
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, barH)}
                rx={3}
                fill={isHovered ? "#5B21B6" : "#7C3AED"}
                fillOpacity={isHovered ? 0.95 : 0.82}
              />
              {/* Invisible full-height hover column for smooth interaction */}
              <rect
                x={x - barGap / 2}
                y={pad.top}
                width={barW + barGap}
                height={plotH}
                fill="transparent"
              />
            </g>
          );
        })}

        {/* Mean reference line */}
        {minVal !== maxVal && (
          <g>
            <line
              x1={meanX}
              x2={meanX}
              y1={pad.top}
              y2={pad.top + plotH}
              stroke="#4C1D95"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={Math.min(width - pad.right - 30, Math.max(pad.left + 20, meanX))}
              y={pad.top - 7}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#4C1D95"
            >
              Media: {formatStatNumber(stats.mean)}
            </text>
          </g>
        )}

        {/* Median reference line */}
        {minVal !== maxVal && Math.abs(medianX - meanX) > 36 && (
          <g>
            <line
              x1={medianX}
              x2={medianX}
              y1={pad.top + 8}
              y2={pad.top + plotH}
              stroke="#0D9488"
              strokeWidth="1.5"
              strokeDasharray="2 3"
            />
            <text
              x={Math.min(width - pad.right - 30, Math.max(pad.left + 20, medianX))}
              y={pad.top + 6}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#0F766E"
            >
              Mediana: {formatStatNumber(stats.median)}
            </text>
          </g>
        )}

        {/* Baseline axis */}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + plotH}
          y2={pad.top + plotH}
          stroke="#CFCBDF"
          strokeWidth="1"
        />

        {/* X-axis boundary & midpoint ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const val = minVal + t * span;
          const x = pad.left + t * plotW;
          return (
            <g key={i}>
              <line
                x1={x}
                x2={x}
                y1={pad.top + plotH}
                y2={pad.top + plotH + 5}
                stroke="#CFCBDF"
                strokeWidth="1"
              />
              <text
                x={x}
                y={pad.top + plotH + 19}
                textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
                fontSize="11"
                fill="#5B5B73"
              >
                {formatStatNumber(val)}
              </text>
            </g>
          );
        })}

        <text
          x={pad.left + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="#4A475E"
        >
          {column.name}
        </text>
      </svg>

      {hoveredBin && (
        <div className="pointer-events-none absolute top-2 right-3 rounded-lg border border-[#DDD6FE] bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
          <div className="font-semibold text-[#171526]">
            Intervalo: <span className="font-mono tabular-nums">{hoveredBin.label}</span>
          </div>
          <div className="mt-0.5 text-[#5B5B73] tabular-nums">
            Frecuencia: <strong className="text-[#6D28D9]">{hoveredBin.count}</strong> ({hoveredBin.pct.toFixed(1)}%)
          </div>
        </div>
      )}
    </div>
  );
};

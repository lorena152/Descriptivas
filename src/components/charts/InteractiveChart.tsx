import React, { useMemo, useState } from "react";
import {
  AggregationMethod,
  ColumnProfile,
  InteractiveChartType,
} from "../../types/eda";
import {
  formatStatNumber,
  isMissingValue,
  parseDateValue,
  parseNumericValue,
} from "../../utils/statistics";

interface InteractiveChartProps {
  rows: Record<string, unknown>[];
  xCol: ColumnProfile | undefined;
  yCol: ColumnProfile | undefined;
  chartType: InteractiveChartType;
  aggregation: AggregationMethod;
  showTrendline: boolean;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

interface AggregatedPoint {
  label: string;
  value: number;
  count: number;
  sortKey: number | string;
}

interface ScatterPoint {
  x: number;
  y: number;
  rowIndex: number;
}

function aggregateValues(nums: number[], method: AggregationMethod): number {
  if (method === "count") return nums.length;
  if (nums.length === 0) return 0;
  if (method === "sum") return nums.reduce((a, b) => a + b, 0);
  if (method === "mean") return nums.reduce((a, b) => a + b, 0) / nums.length;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  rows,
  xCol,
  yCol,
  chartType,
  aggregation,
  showTrendline,
  svgRef,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const scatterData = useMemo(() => {
    if (chartType !== "scatter" || !xCol || !yCol) return null;
    const points: ScatterPoint[] = [];

    rows.forEach((r, idx) => {
      const x = parseNumericValue(r[xCol.name]);
      const y = parseNumericValue(r[yCol.name]);
      if (x !== null && y !== null) {
        points.push({ x, y, rowIndex: idx + 1 });
      }
    });

    if (points.length === 0) return { points: [], r: null, slope: 0, intercept: 0 };

    // Linear regression + Pearson r
    const n = points.length;
    const meanX = points.reduce((a, p) => a + p.x, 0) / n;
    const meanY = points.reduce((a, p) => a + p.y, 0) / n;
    let num = 0;
    let denX = 0;
    let denY = 0;

    for (const p of points) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const slope = denX > 0 ? num / denX : 0;
    const intercept = meanY - slope * meanX;
    const r = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : null;

    return { points, r, slope, intercept };
  }, [rows, xCol, yCol, chartType]);

  const seriesData = useMemo<AggregatedPoint[]>(() => {
    if (chartType === "scatter" || !xCol) return [];

    const groups = new Map<string, { nums: number[]; count: number; sortKey: number | string }>();

    for (const r of rows) {
      const rawX = r[xCol.name];
      if (isMissingValue(rawX)) continue;

      let label = String(rawX).trim();
      let sortKey: number | string = label;

      if (xCol.type === "date") {
        const dt = parseDateValue(rawX);
        if (dt) {
          label = dt.toISOString().slice(0, 10);
          sortKey = dt.getTime();
        }
      } else if (xCol.type === "numeric") {
        const nx = parseNumericValue(rawX);
        if (nx !== null) {
          label = formatStatNumber(nx);
          sortKey = nx;
        }
      }

      if (!groups.has(label)) {
        groups.set(label, { nums: [], count: 0, sortKey });
      }
      const g = groups.get(label)!;
      g.count++;

      if (yCol && yCol.type === "numeric") {
        const ny = parseNumericValue(r[yCol.name]);
        if (ny !== null) g.nums.push(ny);
      } else {
        g.nums.push(1);
      }
    }

    const effectiveMethod: AggregationMethod =
      !yCol || yCol.type !== "numeric" ? "count" : aggregation;

    let items: AggregatedPoint[] = Array.from(groups.entries()).map(
      ([label, data]) => ({
        label,
        value: aggregateValues(data.nums, effectiveMethod),
        count: data.count,
        sortKey: data.sortKey,
      })
    );

    if (xCol.type === "date" || xCol.type === "numeric") {
      items.sort((a, b) => Number(a.sortKey) - Number(b.sortKey));
    } else if (chartType === "bar") {
      items.sort((a, b) => b.value - a.value);
    }

    // Cap high-cardinality categories for crisp legibility
    if (xCol.type === "categorical" && items.length > 16) {
      items = items.slice(0, 16);
    } else if (items.length > 60 && chartType === "bar") {
      items = items.slice(0, 24);
    }

    return items;
  }, [rows, xCol, yCol, chartType, aggregation]);

  if (!xCol) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-[#E5E3F0] bg-[#FAFAFC] text-sm text-[#5B5B73]">
        Selecciona una variable para el eje X.
      </div>
    );
  }

  const width = 720;
  const height = 340;
  const pad = { top: 26, right: 26, bottom: 64, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  // SCATTER RENDER
  if (chartType === "scatter") {
    if (!yCol || xCol.type !== "numeric" || yCol.type !== "numeric") {
      return (
        <div className="flex h-80 flex-col items-center justify-center gap-1 rounded-lg border border-[#E5E3F0] bg-[#FAFAFC] px-6 text-center text-sm text-[#5B5B73]">
          <p className="font-medium text-[#171526]">
            El gráfico de dispersión requiere variables numéricas en ambos ejes.
          </p>
          <p className="text-xs">
            Selecciona una variable numérica en el Eje X y otra en el Eje Y.
          </p>
        </div>
      );
    }

    const points = scatterData?.points ?? [];
    if (points.length === 0) {
      return (
        <div className="flex h-80 items-center justify-center rounded-lg border border-[#E5E3F0] bg-[#FAFAFC] text-sm text-[#5B5B73]">
          No hay pares numéricos válidos entre {xCol.name} y {yCol.name}.
        </div>
      );
    }

    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    const sx = (v: number) => pad.left + ((v - minX) / spanX) * plotW;
    const sy = (v: number) => pad.top + plotH - ((v - minY) / spanY) * plotH;

    const hoveredPt = hoveredIndex !== null ? points[hoveredIndex] : null;

    // Trendline endpoints clamped inside plot
    const tY1 = (scatterData?.slope ?? 0) * minX + (scatterData?.intercept ?? 0);
    const tY2 = (scatterData?.slope ?? 0) * maxX + (scatterData?.intercept ?? 0);

    return (
      <div className="relative w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none overflow-visible"
          role="img"
          aria-label={`Dispersión ${xCol.name} vs ${yCol.name}`}
        >
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const yVal = minY + t * spanY;
            const yPos = pad.top + plotH - t * plotH;
            const xVal = minX + t * spanX;
            const xPos = pad.left + t * plotW;
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
                  {formatStatNumber(yVal)}
                </text>
                <line
                  x1={xPos}
                  x2={xPos}
                  y1={pad.top}
                  y2={pad.top + plotH}
                  stroke="#F3F1F9"
                  strokeWidth="1"
                />
                <text
                  x={xPos}
                  y={pad.top + plotH + 18}
                  textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
                  fontSize="11"
                  fill="#5B5B73"
                >
                  {formatStatNumber(xVal)}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + plotH}
            y2={pad.top + plotH}
            stroke="#CFCBDF"
          />
          <line
            x1={pad.left}
            x2={pad.left}
            y1={pad.top}
            y2={pad.top + plotH}
            stroke="#CFCBDF"
          />

          {/* Trendline */}
          {showTrendline && scatterData?.r !== null && (
            <line
              x1={sx(minX)}
              y1={Math.max(pad.top, Math.min(pad.top + plotH, sy(tY1)))}
              x2={sx(maxX)}
              y2={Math.max(pad.top, Math.min(pad.top + plotH, sy(tY2)))}
              stroke="#4C1D95"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          )}

          {/* Points */}
          {points.map((pt, idx) => {
            const cx = sx(pt.x);
            const cy = sy(pt.y);
            const active = hoveredIndex === idx;
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={active ? 6.5 : 4.5}
                fill={active ? "#4C1D95" : "#7C3AED"}
                fillOpacity={active ? 1 : 0.72}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                className="cursor-pointer transition-transform duration-150"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* Axis Titles */}
          <text
            x={pad.left + plotW / 2}
            y={height - 12}
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="600"
            fill="#4A475E"
          >
            {xCol.name}
          </text>
          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="600"
            fill="#4A475E"
            transform={`rotate(-90 16 ${pad.top + plotH / 2})`}
          >
            {yCol.name}
          </text>
        </svg>

        {scatterData?.r !== null && scatterData?.r !== undefined && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5B5B73]">
            <span>
              Correlación de Pearson:{" "}
              <strong className="font-mono tabular-nums text-[#4C1D95]">
                r = {scatterData.r.toFixed(3)}
              </strong>{" "}
              ({Math.abs(scatterData.r) >= 0.7 ? "fuerte" : Math.abs(scatterData.r) >= 0.4 ? "moderada" : "débil"})
            </span>
            <span className="tabular-nums">{points.length} pares válidos graficados</span>
          </div>
        )}

        {hoveredPt && (
          <div className="pointer-events-none absolute top-2 right-3 rounded-lg border border-[#DDD6FE] bg-white/95 px-3 py-2 text-xs shadow-sm">
            <div className="font-semibold text-[#171526]">Fila #{hoveredPt.rowIndex}</div>
            <div className="mt-0.5 text-[#5B5B73] tabular-nums">
              {xCol.name}: <strong className="text-[#171526]">{formatStatNumber(hoveredPt.x)}</strong>
            </div>
            <div className="text-[#5B5B73] tabular-nums">
              {yCol.name}: <strong className="text-[#6D28D9]">{formatStatNumber(hoveredPt.y)}</strong>
            </div>
          </div>
        )}
      </div>
    );
  }

  // BAR & LINE RENDER
  if (seriesData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-[#E5E3F0] bg-[#FAFAFC] text-sm text-[#5B5B73]">
        No hay datos válidos para graficar las variables seleccionadas.
      </div>
    );
  }

  const rawMaxY = Math.max(...seriesData.map((d) => d.value), 0);
  const rawMinY = Math.min(...seriesData.map((d) => d.value), 0);
  const yMin = rawMinY < 0 ? rawMinY * 1.1 : 0;
  const yMax = rawMaxY === yMin ? yMin + 1 : rawMaxY * 1.1;
  const ySpan = yMax - yMin;

  const sy = (v: number) => pad.top + plotH - ((v - yMin) / ySpan) * plotH;
  const zeroY = sy(0);

  const labelStep = seriesData.length > 14 ? Math.ceil(seriesData.length / 10) : 1;
  const hoveredItem = hoveredIndex !== null ? seriesData[hoveredIndex] : null;

  const yAxisTitle =
    !yCol || yCol.type !== "numeric"
      ? "Frecuencia (Conteo)"
      : `${yCol.name} (${
          aggregation === "mean"
            ? "Promedio"
            : aggregation === "sum"
              ? "Suma"
              : aggregation === "median"
                ? "Mediana"
                : "Conteo"
        })`;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full select-none overflow-visible"
        role="img"
        aria-label={`Gráfico de ${chartType === "bar" ? "barras" : "líneas"} para ${xCol.name}`}
      >
        {/* Y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const val = yMin + t * ySpan;
          const yPos = pad.top + plotH - t * plotH;
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
                {formatStatNumber(val)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {chartType === "bar" &&
          seriesData.map((d, idx) => {
            const slotW = plotW / seriesData.length;
            const gap = Math.min(10, slotW * 0.25);
            const barW = Math.max(4, slotW - gap);
            const x = pad.left + idx * slotW + gap / 2;
            const yVal = sy(d.value);
            const topY = Math.min(yVal, zeroY);
            const barH = Math.abs(zeroY - yVal);
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={topY}
                  width={barW}
                  height={Math.max(2, barH)}
                  rx={3}
                  fill={isHovered ? "#4C1D95" : "#7C3AED"}
                  fillOpacity={isHovered ? 0.96 : 0.84}
                />
                <rect
                  x={pad.left + idx * slotW}
                  y={pad.top}
                  width={slotW}
                  height={plotH}
                  fill="transparent"
                />
              </g>
            );
          })}

        {/* Line + Area + Points */}
        {chartType === "line" && (() => {
          const coords = seriesData.map((d, idx) => {
            const x =
              seriesData.length === 1
                ? pad.left + plotW / 2
                : pad.left + (idx / (seriesData.length - 1)) * plotW;
            const y = sy(d.value);
            return { x, y, d };
          });

          const pathD = coords
            .map((c, idx) => `${idx === 0 ? "M" : "L"} ${c.x} ${c.y}`)
            .join(" ");

          const areaD =
            coords.length > 1
              ? `${pathD} L ${coords[coords.length - 1].x} ${pad.top + plotH} L ${coords[0].x} ${pad.top + plotH} Z`
              : "";

          return (
            <g>
              {areaD && <path d={areaD} fill="#7C3AED" fillOpacity="0.09" />}
              <path
                d={pathD}
                fill="none"
                stroke="#6D28D9"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {coords.map((c, idx) => {
                const active = hoveredIndex === idx;
                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={active ? 6 : 3.8}
                      fill={active ? "#4C1D95" : "#FFFFFF"}
                      stroke="#6D28D9"
                      strokeWidth="2"
                    />
                    <circle cx={c.x} cy={c.y} r={14} fill="transparent" />
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* X Baseline */}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + plotH}
          y2={pad.top + plotH}
          stroke="#CFCBDF"
        />

        {/* X Labels */}
        {seriesData.map((d, idx) => {
          if (idx % labelStep !== 0 && idx !== seriesData.length - 1) return null;
          const x =
            chartType === "bar"
              ? pad.left + (idx + 0.5) * (plotW / seriesData.length)
              : seriesData.length === 1
                ? pad.left + plotW / 2
                : pad.left + (idx / (seriesData.length - 1)) * plotW;

          const shortLabel =
            d.label.length > 11 ? `${d.label.slice(0, 10)}…` : d.label;

          return (
            <text
              key={idx}
              x={x}
              y={pad.top + plotH + 17}
              textAnchor={seriesData.length > 8 ? "end" : "middle"}
              fontSize="10.5"
              fill="#5B5B73"
              transform={
                seriesData.length > 8
                  ? `rotate(-25 ${x} ${pad.top + plotH + 17})`
                  : undefined
              }
            >
              {shortLabel}
            </text>
          );
        })}

        {/* Axis titles */}
        <text
          x={pad.left + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill="#4A475E"
        >
          {xCol.name}
        </text>
        <text
          x={16}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill="#4A475E"
          transform={`rotate(-90 16 ${pad.top + plotH / 2})`}
        >
          {yAxisTitle}
        </text>
      </svg>

      {hoveredItem && (
        <div className="pointer-events-none absolute top-2 right-3 rounded-lg border border-[#DDD6FE] bg-white/95 px-3 py-2 text-xs shadow-sm">
          <div className="font-semibold text-[#171526]">{hoveredItem.label}</div>
          <div className="mt-0.5 text-[#5B5B73] tabular-nums">
            Valor: <strong className="text-[#6D28D9]">{formatStatNumber(hoveredItem.value)}</strong>
          </div>
          <div className="text-[#6B6882] tabular-nums">
            Registros en grupo: {hoveredItem.count}
          </div>
        </div>
      )}
    </div>
  );
};

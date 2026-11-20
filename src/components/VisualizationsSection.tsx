import React from "react";
import { BarChart3, LineChart as LineIcon, ScatterChart } from "lucide-react";
import {
  AggregationMethod,
  ColumnProfile,
  DatasetAnalysis,
  InteractiveChartType,
} from "../types/eda";
import { HistogramChart } from "./charts/HistogramChart";
import { InteractiveChart } from "./charts/InteractiveChart";

interface VisualizationsSectionProps {
  dataset: DatasetAnalysis;
  histVar: string;
  onHistVarChange: (col: string) => void;
  histBins: number;
  onHistBinsChange: (bins: number) => void;
  chartType: InteractiveChartType;
  onChartTypeChange: (type: InteractiveChartType) => void;
  xVar: string;
  onXVarChange: (col: string) => void;
  yVar: string;
  onYVarChange: (col: string) => void;
  aggregation: AggregationMethod;
  onAggregationChange: (method: AggregationMethod) => void;
  showTrendline: boolean;
  onShowTrendlineChange: (val: boolean) => void;
  histogramSvgRef: React.RefObject<SVGSVGElement | null>;
  interactiveSvgRef: React.RefObject<SVGSVGElement | null>;
}

export const VisualizationsSection: React.FC<VisualizationsSectionProps> = ({
  dataset,
  histVar,
  onHistVarChange,
  histBins,
  onHistBinsChange,
  chartType,
  onChartTypeChange,
  xVar,
  onXVarChange,
  yVar,
  onYVarChange,
  aggregation,
  onAggregationChange,
  showTrendline,
  onShowTrendlineChange,
  histogramSvgRef,
  interactiveSvgRef,
}) => {
  const numericCols = dataset.columns.filter((c) => c.type === "numeric");
  const selectedHistCol: ColumnProfile | undefined =
    numericCols.find((c) => c.name === histVar) ?? numericCols[0];

  const xCol = dataset.columns.find((c) => c.name === xVar) ?? dataset.columns[0];
  const yCol = dataset.columns.find((c) => c.name === yVar);

  return (
    <section id="sec-graficos" className="space-y-6 scroll-mt-20">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#171526]">
          Histogramas y Gráficos Interactivos
        </h2>
        <p className="mt-1 text-sm text-[#5B5B73]">
          Explora la distribución de variables numéricas y construye gráficos de
          barras, líneas o dispersión seleccionando los ejes X e Y.
        </p>
      </div>

      {/* Histogram Panel */}
      <div className="rounded-xl border border-[#E4E2F0] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECEAF4] pb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#171526]">
              Histograma de distribución numérica
            </h3>
            <p className="text-xs text-[#5B5B73]">
              Visualiza frecuencias por intervalo junto con las líneas de media y
              mediana.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label
                htmlFor="hist-var"
                className="text-xs font-medium text-[#5B5B73] whitespace-nowrap"
              >
                Variable:
              </label>
              <select
                id="hist-var"
                value={selectedHistCol?.name ?? ""}
                onChange={(e) => onHistVarChange(e.target.value)}
                disabled={numericCols.length === 0}
                className="rounded-lg border border-[#DCD9EA] bg-white px-3 py-1.5 text-xs font-medium text-[#171526] focus:border-[#6D28D9] focus:outline-none"
              >
                {numericCols.length === 0 ? (
                  <option value="">Sin numéricas</option>
                ) : (
                  numericCols.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="hist-bins"
                className="text-xs font-medium text-[#5B5B73] whitespace-nowrap"
              >
                Intervalos (<span className="font-mono tabular-nums">{histBins}</span>):
              </label>
              <input
                id="hist-bins"
                type="range"
                min={5}
                max={20}
                value={histBins}
                onChange={(e) => onHistBinsChange(Number(e.target.value))}
                className="h-1.5 w-24 accent-[#6D28D9] cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <HistogramChart
            column={selectedHistCol}
            binCount={histBins}
            svgRef={histogramSvgRef}
          />
        </div>
      </div>

      {/* Interactive X/Y Chart Builder */}
      <div className="rounded-xl border border-[#E4E2F0] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECEAF4] pb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#171526]">
              Explorador gráfico interactivo (Ejes X / Y)
            </h3>
            <p className="text-xs text-[#5B5B73]">
              Alterna entre barras, líneas y dispersión para detectar relaciones y
              comportamientos.
            </p>
          </div>

          {/* Chart Type Segmented Control */}
          <div className="inline-flex items-center gap-1 rounded-lg bg-[#F3F1F9] p-1">
            <button
              type="button"
              onClick={() => onChartTypeChange("bar")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartType === "bar"
                  ? "bg-white text-[#6D28D9] shadow-xs"
                  : "text-[#5B5B73] hover:text-[#171526]"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Barras
            </button>
            <button
              type="button"
              onClick={() => onChartTypeChange("line")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartType === "line"
                  ? "bg-white text-[#6D28D9] shadow-xs"
                  : "text-[#5B5B73] hover:text-[#171526]"
              }`}
            >
              <LineIcon className="h-3.5 w-3.5" />
              Líneas
            </button>
            <button
              type="button"
              onClick={() => onChartTypeChange("scatter")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartType === "scatter"
                  ? "bg-white text-[#6D28D9] shadow-xs"
                  : "text-[#5B5B73] hover:text-[#171526]"
              }`}
            >
              <ScatterChart className="h-3.5 w-3.5" />
              Dispersión
            </button>
          </div>
        </div>

        {/* Axis Selectors */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-[#F9F8FC] px-4 py-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="axis-x"
              className="text-xs font-medium text-[#5B5B73] whitespace-nowrap"
            >
              Eje X:
            </label>
            <select
              id="axis-x"
              value={xCol?.name ?? ""}
              onChange={(e) => onXVarChange(e.target.value)}
              className="rounded-lg border border-[#DCD9EA] bg-white px-3 py-1.5 text-xs font-medium text-[#171526] focus:border-[#6D28D9] focus:outline-none"
            >
              {(chartType === "scatter" ? numericCols : dataset.columns).map(
                (c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="axis-y"
              className="text-xs font-medium text-[#5B5B73] whitespace-nowrap"
            >
              Eje Y:
            </label>
            <select
              id="axis-y"
              value={yCol?.name ?? ""}
              onChange={(e) => onYVarChange(e.target.value)}
              className="rounded-lg border border-[#DCD9EA] bg-white px-3 py-1.5 text-xs font-medium text-[#171526] focus:border-[#6D28D9] focus:outline-none"
            >
              {chartType !== "scatter" && (
                <option value="">Conteo de registros</option>
              )}
              {numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {chartType !== "scatter" && yCol && yCol.type === "numeric" && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="agg-method"
                className="text-xs font-medium text-[#5B5B73] whitespace-nowrap"
              >
                Agregación:
              </label>
              <select
                id="agg-method"
                value={aggregation}
                onChange={(e) =>
                  onAggregationChange(e.target.value as AggregationMethod)
                }
                className="rounded-lg border border-[#DCD9EA] bg-white px-3 py-1.5 text-xs font-medium text-[#171526] focus:border-[#6D28D9] focus:outline-none"
              >
                <option value="mean">Promedio</option>
                <option value="sum">Suma total</option>
                <option value="median">Mediana</option>
                <option value="count">Conteo</option>
              </select>
            </div>
          )}

          {chartType === "scatter" && (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#5B5B73] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTrendline}
                onChange={(e) => onShowTrendlineChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#DCD9EA] accent-[#6D28D9]"
              />
              Mostrar recta de tendencia
            </label>
          )}
        </div>

        <div className="mt-5">
          <InteractiveChart
            rows={dataset.rawRows}
            xCol={xCol}
            yCol={yCol}
            chartType={chartType}
            aggregation={aggregation}
            showTrendline={showTrendline}
            svgRef={interactiveSvgRef}
          />
        </div>
      </div>
    </section>
  );
};

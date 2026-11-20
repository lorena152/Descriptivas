import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ColumnProfile, DatasetAnalysis } from "../types/eda";
import { formatStatNumber } from "../utils/statistics";
import { BoxPlotChart } from "./charts/BoxPlotChart";

interface BoxPlotSectionProps {
  dataset: DatasetAnalysis;
  selectedVar: string;
  onSelectedVarChange: (colName: string) => void;
  boxplotSvgRef: React.RefObject<SVGSVGElement | null>;
}

export const BoxPlotSection: React.FC<BoxPlotSectionProps> = ({
  dataset,
  selectedVar,
  onSelectedVarChange,
  boxplotSvgRef,
}) => {
  const numericCols = dataset.columns.filter(
    (c) => c.type === "numeric" && c.numericStats
  );
  const activeCol: ColumnProfile | undefined =
    numericCols.find((c) => c.name === selectedVar) ?? numericCols[0];

  const stats = activeCol?.numericStats;

  return (
    <section id="sec-boxplot" className="space-y-6 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171526]">
            Diagrama BoxPlot y Detección de Valores Atípicos
          </h2>
          <p className="mt-1 text-sm text-[#5B5B73]">
            Inspección por cuartiles y rango intercuartílico (IQR) para aislar
            valores fuera de rango esperado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="boxplot-var"
            className="text-xs font-medium text-[#5B5B73] whitespace-nowrap"
          >
            Variable numérica:
          </label>
          <select
            id="boxplot-var"
            value={activeCol?.name ?? ""}
            onChange={(e) => onSelectedVarChange(e.target.value)}
            disabled={numericCols.length === 0}
            className="rounded-lg border border-[#DCD9EA] bg-white px-3 py-1.5 text-xs font-medium text-[#171526] focus:border-[#6D28D9] focus:outline-none"
          >
            {numericCols.length === 0 ? (
              <option value="">Sin numéricas</option>
            ) : (
              numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.numericStats!.outliers.length} atípicos)
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-[#E4E2F0] bg-white p-5 sm:p-6">
        <BoxPlotChart column={activeCol} svgRef={boxplotSvgRef} />

        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#ECEAF4] pt-5 sm:grid-cols-5">
            <div>
              <div className="text-xs text-[#6B6882]">Límite inferior (Q1−1.5×IQR)</div>
              <div className="mt-1 font-mono text-sm font-semibold text-[#171526] tabular-nums">
                {formatStatNumber(stats.lowerFence)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B6882]">Cuartil 1 (Q1)</div>
              <div className="mt-1 font-mono text-sm font-semibold text-[#171526] tabular-nums">
                {formatStatNumber(stats.q1)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B6882]">Mediana (Q2)</div>
              <div className="mt-1 font-mono text-sm font-semibold text-[#4C1D95] tabular-nums">
                {formatStatNumber(stats.median)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B6882]">Cuartil 3 (Q3)</div>
              <div className="mt-1 font-mono text-sm font-semibold text-[#171526] tabular-nums">
                {formatStatNumber(stats.q3)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B6882]">Límite superior (Q3+1.5×IQR)</div>
              <div className="mt-1 font-mono text-sm font-semibold text-[#171526] tabular-nums">
                {formatStatNumber(stats.upperFence)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Outlier detail table */}
      {activeCol && stats && (
        <div className="rounded-xl border border-[#E4E2F0] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEAF4] px-5 py-4">
            <div className="flex items-center gap-2">
              {stats.outliers.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-[#D97706]" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
              )}
              <h3 className="text-sm font-semibold text-[#171526]">
                {stats.outliers.length > 0
                  ? `${stats.outliers.length} valores atípicos detectados en "${activeCol.name}"`
                  : `Sin valores atípicos en "${activeCol.name}"`}
              </h3>
            </div>
            <span className="font-mono text-xs text-[#6B6882] tabular-nums">
              IQR = {formatStatNumber(stats.iqr)}
            </span>
          </div>

          {stats.outliers.length === 0 ? (
            <div className="px-5 py-6 text-xs text-[#5B5B73]">
              Todos los registros válidos ({stats.count}) se encuentran dentro del
              rango [{formatStatNumber(stats.lowerFence)},{" "}
              {formatStatNumber(stats.upperFence)}].
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#ECEAF4] bg-[#F9F8FC] text-[#5B5B73]">
                    <th className="px-4 py-2.5 text-left font-semibold">
                      Número de fila
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold">
                      Valor registrado
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold">
                      Posición respecto al rango
                    </th>
                    <th className="px-4 py-2.5 text-left font-semibold">
                      Severidad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EFF8]">
                  {stats.outliers.slice(0, 25).map((out, idx) => (
                    <tr key={`${out.rowIndex}-${idx}`} className="hover:bg-[#FAF9FE]">
                      <td className="px-4 py-2.5 font-mono text-[#171526] tabular-nums">
                        Fila #{out.rowIndex}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#4C1D95] tabular-nums">
                        {formatStatNumber(out.value)}
                      </td>
                      <td className="px-4 py-2.5 text-[#5B5B73]">
                        {out.value > stats.upperFence
                          ? `Superior al límite (${formatStatNumber(stats.upperFence)})`
                          : `Inferior al límite (${formatStatNumber(stats.lowerFence)})`}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`font-medium ${
                            out.isExtreme ? "text-[#DC2626]" : "text-[#B45309]"
                          }`}
                        >
                          {out.isExtreme ? "Extremo (>3×IQR)" : "Moderado (>1.5×IQR)"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stats.outliers.length > 25 && (
                <div className="border-t border-[#ECEAF4] px-4 py-2.5 text-xs text-[#6B6882]">
                  Mostrando los primeros 25 de {stats.outliers.length} valores
                  atípicos detectados.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

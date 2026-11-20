import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DatasetAnalysis } from "../types/eda";
import { formatStatNumber } from "../utils/statistics";

interface DescriptiveStatsSectionProps {
  dataset: DatasetAnalysis;
}

export const DescriptiveStatsSection: React.FC<DescriptiveStatsSectionProps> = ({
  dataset,
}) => {
  const [query, setQuery] = useState("");

  const numericCols = useMemo(
    () =>
      dataset.columns.filter(
        (c) =>
          c.type === "numeric" &&
          c.numericStats &&
          c.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [dataset.columns, query]
  );

  const categoricalCols = useMemo(
    () =>
      dataset.columns.filter(
        (c) =>
          c.type === "categorical" &&
          c.categoricalStats &&
          c.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [dataset.columns, query]
  );

  const dateCols = useMemo(
    () =>
      dataset.columns.filter(
        (c) =>
          c.type === "date" &&
          c.dateStats &&
          c.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [dataset.columns, query]
  );

  return (
    <section id="sec-estadistica" className="space-y-6 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171526]">
            Análisis Estadístico Descriptivo
          </h2>
          <p className="mt-1 text-sm text-[#5B5B73]">
            Tendencia central, dispersión, extremos y frecuencias calculadas sobre
            los registros válidos.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8D89A6]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar variable…"
            className="w-full rounded-lg border border-[#DCD9EA] bg-white py-2 pr-3 pl-9 text-xs text-[#171526] placeholder:text-[#8D89A6] focus:border-[#6D28D9] focus:outline-none"
          />
        </div>
      </div>

      {/* Numeric Descriptive Stats Table */}
      <div className="rounded-xl border border-[#E4E2F0] bg-white">
        <div className="border-b border-[#ECEAF4] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#171526]">
            Variables numéricas
          </h3>
          <p className="text-xs text-[#5B5B73]">
            Media, mediana, moda, desviación estándar muestral, mínimo, máximo,
            cuartiles y asimetría.
          </p>
        </div>

        {numericCols.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#5B5B73]">
            No se encontraron variables numéricas que coincidan con el filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#ECEAF4] bg-[#F9F8FC] text-[#5B5B73]">
                  <th className="px-4 py-2.5 text-left font-semibold">Variable</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Media</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Mediana</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Moda</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Desv. Est.</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Mínimo</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Máximo</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Q1 (25%)</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Q3 (75%)</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Asimetría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EFF8]">
                {numericCols.map((col) => {
                  const s = col.numericStats!;
                  return (
                    <tr key={col.name} className="hover:bg-[#FAF9FE]">
                      <td className="px-4 py-2.5 font-medium text-[#171526] whitespace-nowrap">
                        {col.name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-[#4C1D95] tabular-nums">
                        {formatStatNumber(s.mean)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#171526] tabular-nums">
                        {formatStatNumber(s.median)}
                      </td>
                      <td
                        className="px-4 py-2.5 text-right font-mono text-[#5B5B73] tabular-nums whitespace-nowrap"
                        title={
                          s.modeFrequency > 1
                            ? `Frecuencia: ${s.modeFrequency} apariciones`
                            : "Todos los valores son únicos"
                        }
                      >
                        {s.modeLabel}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#171526] tabular-nums">
                        {formatStatNumber(s.stdDev)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#5B5B73] tabular-nums">
                        {formatStatNumber(s.min)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#5B5B73] tabular-nums">
                        {formatStatNumber(s.max)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#5B5B73] tabular-nums">
                        {formatStatNumber(s.q1)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#5B5B73] tabular-nums">
                        {formatStatNumber(s.q3)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#5B5B73] tabular-nums">
                        {s.skewness.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Categorical & Date Summaries */}
      {(categoricalCols.length > 0 || dateCols.length > 0) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {categoricalCols.map((col) => {
            const cat = col.categoricalStats!;
            return (
              <div
                key={col.name}
                className="rounded-xl border border-[#E4E2F0] bg-white p-5"
              >
                <div className="flex items-baseline justify-between gap-2 border-b border-[#F1EFF8] pb-3">
                  <h4 className="text-sm font-semibold text-[#171526]">
                    {col.name}
                  </h4>
                  <span className="text-xs text-[#6B6882] tabular-nums">
                    Categórica · {col.uniqueCount} categorías
                  </span>
                </div>
                <div className="mt-3 text-xs text-[#5B5B73]">
                  Moda:{" "}
                  <strong className="font-medium text-[#4C1D95]">{cat.mode}</strong>{" "}
                  <span className="font-mono tabular-nums">({cat.modeCount} reg.)</span>
                </div>
                <div className="mt-3 space-y-2">
                  {cat.topValues.slice(0, 4).map((item) => (
                    <div key={item.value} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate pr-2 text-[#171526]">
                          {item.value}
                        </span>
                        <span className="font-mono text-[#5B5B73] tabular-nums shrink-0">
                          {item.count} ({item.pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F1EFF8]">
                        <div
                          className="h-full rounded-full bg-[#7C3AED]"
                          style={{ width: `${Math.max(3, item.pct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {dateCols.map((col) => {
            const dt = col.dateStats!;
            return (
              <div
                key={col.name}
                className="rounded-xl border border-[#E4E2F0] bg-white p-5"
              >
                <div className="flex items-baseline justify-between gap-2 border-b border-[#F1EFF8] pb-3">
                  <h4 className="text-sm font-semibold text-[#171526]">
                    {col.name}
                  </h4>
                  <span className="text-xs text-[#6B6882]">Variable temporal</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <dt className="text-[#6B6882]">Fecha mínima</dt>
                    <dd className="mt-1 font-mono font-medium text-[#171526] tabular-nums">
                      {dt.minDate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B6882]">Fecha máxima</dt>
                    <dd className="mt-1 font-mono font-medium text-[#171526] tabular-nums">
                      {dt.maxDate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B6882]">Cobertura</dt>
                    <dd className="mt-1 font-mono font-medium text-[#4C1D95] tabular-nums">
                      {dt.spanDays.toLocaleString("es-ES")} días
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

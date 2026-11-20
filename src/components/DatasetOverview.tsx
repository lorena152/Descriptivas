import React from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Hash,
  Type as TypeIcon,
} from "lucide-react";
import { DatasetAnalysis, VariableType } from "../types/eda";
import { formatCellDisplay } from "../utils/statistics";

interface DatasetOverviewProps {
  dataset: DatasetAnalysis;
  onTypeChange: (colName: string, newType: VariableType) => void;
  onSheetChange?: (sheetName: string) => void;
}

const TYPE_LABEL: Record<VariableType, string> = {
  numeric: "Numérica",
  categorical: "Categórica",
  date: "Fecha",
};

function TypeIconSmall({ type }: { type: VariableType }) {
  if (type === "numeric") return <Hash className="h-3.5 w-3.5 text-[#6D28D9]" />;
  if (type === "date") return <Calendar className="h-3.5 w-3.5 text-[#0F766E]" />;
  return <TypeIcon className="h-3.5 w-3.5 text-[#5B5B73]" />;
}

export const DatasetOverview: React.FC<DatasetOverviewProps> = ({
  dataset,
  onTypeChange,
  onSheetChange,
}) => {
  const numCount = dataset.columns.filter((c) => c.type === "numeric").length;
  const catCount = dataset.columns.filter((c) => c.type === "categorical").length;
  const dateCount = dataset.columns.filter((c) => c.type === "date").length;
  const colsWithMissing = dataset.columns.filter((c) => c.missingCount > 0).length;

  return (
    <section id="sec-resumen" className="space-y-6 scroll-mt-20">
      {/* Header + Optional Excel Sheet Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171526]">
            Resumen del Dataset y Verificación de Estructura
          </h2>
          <p className="mt-1 text-sm text-[#5B5B73]">
            Identificación automática de dimensiones, primeras 3 filas, tipología de
            variables y completitud.
          </p>
        </div>

        {dataset.sheetNames && dataset.sheetNames.length > 1 && onSheetChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="sheet-selector"
              className="text-xs font-medium text-[#5B5B73]"
            >
              Hoja de Excel:
            </label>
            <select
              id="sheet-selector"
              value={dataset.activeSheet}
              onChange={(e) => onSheetChange(e.target.value)}
              className="rounded-lg border border-[#DCD9EA] bg-white px-3 py-1.5 text-xs font-medium text-[#171526] focus:border-[#6D28D9] focus:outline-none"
            >
              {dataset.sheetNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E4E2F0] bg-white p-5">
          <div className="text-xs font-medium text-[#5B5B73]">
            Total de registros
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#171526] tabular-nums">
            {dataset.rowCount.toLocaleString("es-ES")}
          </div>
          <div className="mt-1 text-xs text-[#6B6882]">
            Formato {dataset.fileFormat}
          </div>
        </div>

        <div className="rounded-xl border border-[#E4E2F0] bg-white p-5">
          <div className="text-xs font-medium text-[#5B5B73]">
            Variables detectadas
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#171526] tabular-nums">
            {dataset.colCount}
          </div>
          <div className="mt-1 text-xs text-[#6B6882] tabular-nums">
            {numCount} num · {catCount} cat · {dateCount} fecha
          </div>
        </div>

        <div className="rounded-xl border border-[#E4E2F0] bg-white p-5">
          <div className="text-xs font-medium text-[#5B5B73]">
            Datos faltantes globales
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#171526] tabular-nums">
            {dataset.totalMissingCells.toLocaleString("es-ES")}
          </div>
          <div className="mt-1 text-xs text-[#6B6882] tabular-nums">
            {dataset.totalMissingPct.toFixed(2)}% de{" "}
            {dataset.totalCells.toLocaleString("es-ES")} celdas
          </div>
        </div>

        <div className="rounded-xl border border-[#E4E2F0] bg-white p-5">
          <div className="text-xs font-medium text-[#5B5B73]">
            Variables incompletas
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#171526] tabular-nums">
            {colsWithMissing} / {dataset.colCount}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {colsWithMissing === 0 ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" />
                <span className="font-medium text-[#15803D]">Base completa</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
                <span className="font-medium text-[#B45309]">
                  Requiere revisión
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* First 3 Rows Verification Table */}
      <div className="rounded-xl border border-[#E4E2F0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEAF4] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-[#171526]">
              Primeras 3 filas del dataset
            </h3>
            <p className="text-xs text-[#5B5B73]">
              Muestra de verificación estructural de encabezados y valores iniciales.
            </p>
          </div>
          <span className="font-mono text-xs text-[#6B6882] tabular-nums">
            Mostrando 3 de {dataset.rowCount.toLocaleString("es-ES")} filas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#ECEAF4] bg-[#F9F8FC]">
                <th className="px-4 py-2.5 font-mono text-[11px] font-medium text-[#6B6882]">
                  #
                </th>
                {dataset.columns.map((col) => (
                  <th
                    key={col.name}
                    className={`px-4 py-2.5 font-semibold text-[#171526] whitespace-nowrap ${
                      col.type === "numeric" ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.type === "numeric" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span>{col.name}</span>
                      <span className="font-normal text-[11px] text-[#6B6882]">
                        ({TYPE_LABEL[col.type]})
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFF8]">
              {dataset.previewRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#FAF9FE]">
                  <td className="px-4 py-2.5 font-mono text-[#6B6882] tabular-nums">
                    {rIdx + 1}
                  </td>
                  {dataset.columns.map((col) => {
                    const display = formatCellDisplay(row[col.name]);
                    const isNull = display === "Nulo";
                    return (
                      <td
                        key={col.name}
                        className={`px-4 py-2.5 whitespace-nowrap ${
                          col.type === "numeric"
                            ? "text-right font-mono tabular-nums"
                            : "text-left"
                        } ${
                          isNull
                            ? "italic text-[#B45309]"
                            : "text-[#171526]"
                        }`}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Variable Types & Missing Values Diagnostics */}
      <div className="rounded-xl border border-[#E4E2F0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEAF4] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-[#171526]">
              Tipología de variables y diagnóstico de datos faltantes
            </h3>
            <p className="text-xs text-[#5B5B73]">
              Clasificación automática entre numéricas, categóricas y fechas; puedes
              ajustar el tipo manualmente si lo necesitas.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#ECEAF4] bg-[#F9F8FC] text-[#5B5B73]">
                <th className="px-4 py-2.5 font-semibold">Variable</th>
                <th className="px-4 py-2.5 font-semibold">Tipo detectado</th>
                <th className="px-4 py-2.5 text-right font-semibold">Válidos</th>
                <th className="px-4 py-2.5 text-right font-semibold">Faltantes</th>
                <th className="px-4 py-2.5 font-semibold">Completitud</th>
                <th className="px-4 py-2.5 text-right font-semibold">Únicos</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFF8]">
              {dataset.columns.map((col) => {
                const completeness = 100 - col.missingPct;
                const hasMissing = col.missingCount > 0;
                return (
                  <tr key={col.name} className="hover:bg-[#FAF9FE]">
                    <td className="px-4 py-2.5 font-medium text-[#171526]">
                      {col.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="inline-flex items-center gap-1.5">
                        <TypeIconSmall type={col.type} />
                        <select
                          aria-label={`Tipo de variable para ${col.name}`}
                          value={col.type}
                          onChange={(e) =>
                            onTypeChange(col.name, e.target.value as VariableType)
                          }
                          className="rounded border border-transparent bg-transparent py-0.5 pr-1 text-xs font-medium text-[#171526] hover:border-[#DCD9EA] focus:border-[#6D28D9] focus:outline-none cursor-pointer"
                        >
                          <option value="numeric">Numérica</option>
                          <option value="categorical">Categórica</option>
                          <option value="date">Fecha</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[#171526] tabular-nums">
                      {col.nonNullCount.toLocaleString("es-ES")}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                        hasMissing ? "font-semibold text-[#B45309]" : "text-[#5B5B73]"
                      }`}
                    >
                      {col.missingCount.toLocaleString("es-ES")} ({col.missingPct.toFixed(1)}%)
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#ECEAF4]">
                          <div
                            className={`h-full rounded-full ${
                              completeness === 100
                                ? "bg-[#6D28D9]"
                                : completeness >= 85
                                  ? "bg-[#D97706]"
                                  : "bg-[#DC2626]"
                            }`}
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-[#5B5B73] tabular-nums">
                          {completeness.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[#5B5B73] tabular-nums">
                      {col.uniqueCount.toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-2.5">
                      {hasMissing ? (
                        <span className="inline-flex items-center gap-1 text-[#B45309]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Con faltantes</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#15803D]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Completo</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

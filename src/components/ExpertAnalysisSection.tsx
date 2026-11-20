import React from "react";
import {
  AlertCircle,
  Compass,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { DatasetAnalysis, ExpertAnalysisResult } from "../types/eda";

interface ExpertAnalysisSectionProps {
  dataset: DatasetAnalysis;
  expertAnalysis: ExpertAnalysisResult | null;
  isAnalyzing: boolean;
  analyzeError: string | null;
  onGenerateExpertAnalysis: () => Promise<void>;
}

export const ExpertAnalysisSection: React.FC<ExpertAnalysisSectionProps> = ({
  dataset,
  expertAnalysis,
  isAnalyzing,
  analyzeError,
  onGenerateExpertAnalysis,
}) => {
  return (
    <section id="sec-conclusiones" className="space-y-6 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171526]">
            Análisis de Tendencias y Conclusiones de Experto
          </h2>
          <p className="mt-1 text-sm text-[#5B5B73]">
            Síntesis automática de comportamientos estadísticos y dictamen
            analítico avanzado sobre tendencias, correlaciones y calidad de datos.
          </p>
        </div>

        <button
          type="button"
          disabled={isAnalyzing}
          onClick={() => void onGenerateExpertAnalysis()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6D28D9] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#5B21B6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Analizando tendencias…
            </>
          ) : expertAnalysis ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar análisis experto
            </>
          ) : (
            <>
              <Compass className="h-3.5 w-3.5" />
              Generar análisis experto
            </>
          )}
        </button>
      </div>

      {/* Deterministic Statistical Findings */}
      <div className="rounded-xl border border-[#E4E2F0] bg-white p-5 sm:p-6">
        <div className="border-b border-[#ECEAF4] pb-3">
          <h3 className="text-sm font-semibold text-[#171526]">
            Hallazgos estadísticos inmediatos
          </h3>
          <p className="text-xs text-[#5B5B73]">
            Observaciones cuantitativas calculadas directamente sobre las
            distribuciones, asimetrías y correlaciones del archivo.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {dataset.autoInsights.map((insight) => (
            <div
              key={insight.id}
              className="rounded-lg border border-[#ECEAF4] bg-[#FAFAFD] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-[#171526]">
                  {insight.title}
                </h4>
                <span
                  className={`text-[11px] font-medium ${
                    insight.severity === "warning"
                      ? "text-[#B45309]"
                      : insight.severity === "highlight"
                        ? "text-[#6D28D9]"
                        : "text-[#5B5B73]"
                  }`}
                >
                  {insight.category.charAt(0).toUpperCase() +
                    insight.category.slice(1)}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#4A475E]">
                {insight.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Top Correlations Matrix Summary */}
        {dataset.correlations.length > 0 && (
          <div className="mt-6 border-t border-[#ECEAF4] pt-4">
            <h4 className="text-xs font-semibold text-[#171526]">
              Correlaciones lineales destacadas (Pearson r)
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dataset.correlations.slice(0, 6).map((pair) => (
                <div
                  key={`${pair.colA}-${pair.colB}`}
                  className="flex items-center justify-between rounded-lg border border-[#ECEAF4] px-3 py-2 text-xs"
                >
                  <span className="truncate pr-2 text-[#171526]">
                    {pair.colA} ↔ {pair.colB}
                  </span>
                  <span
                    className={`font-mono font-semibold tabular-nums shrink-0 ${
                      pair.absR >= 0.7
                        ? "text-[#6D28D9]"
                        : pair.absR >= 0.4
                          ? "text-[#4C1D95]"
                          : "text-[#6B6882]"
                    }`}
                  >
                    r = {pair.r.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expert AI Synthesis */}
      <div className="rounded-xl border border-[#E4E2F0] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEAF4] pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#6D28D9]" />
            <h3 className="text-sm font-semibold text-[#171526]">
              Dictamen y conclusiones del analista experto
            </h3>
          </div>
          {expertAnalysis && (
            <span className="text-xs text-[#6B6882]">
              Actualizado{" "}
              {new Date(expertAnalysis.generatedAt).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        {analyzeError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
            <div>
              <p className="font-semibold">
                No fue posible generar el análisis experto
              </p>
              <p className="mt-0.5">{analyzeError}</p>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="mt-5 space-y-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#ECEAF4]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#F3F1F9]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[#F3F1F9]" />
            <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
              <div className="h-24 animate-pulse rounded-lg bg-[#F7F6FB]" />
              <div className="h-24 animate-pulse rounded-lg bg-[#F7F6FB]" />
              <div className="h-24 animate-pulse rounded-lg bg-[#F7F6FB]" />
            </div>
          </div>
        )}

        {!isAnalyzing && !expertAnalysis && !analyzeError && (
          <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-lg border border-[#ECEAF4] bg-[#FAFAFD] p-5 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#171526]">
                Obtén una interpretación ejecutiva completa de tus datos
              </p>
              <p className="text-xs text-[#5B5B73]">
                El analizador evaluará distribuciones, sesgos, correlaciones,
                valores atípicos y datos faltantes para redactar conclusiones
                accionables listas para tu informe PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onGenerateExpertAnalysis()}
              className="rounded-lg border border-[#6D28D9] bg-white px-4 py-2 text-xs font-medium text-[#6D28D9] transition-colors hover:bg-[#F5F3FF] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Generar conclusiones ahora
            </button>
          </div>
        )}

        {!isAnalyzing && expertAnalysis && (
          <div className="mt-5 space-y-6">
            <div className="rounded-lg border border-[#E6E0FA] bg-[#F8F6FE] p-4">
              <div className="text-xs font-semibold text-[#4C1D95]">
                Resumen ejecutivo
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#171526]">
                {expertAnalysis.resumenEjecutivo}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-2.5">
                <h4 className="border-b border-[#ECEAF4] pb-2 text-xs font-semibold text-[#171526]">
                  Tendencias principales
                </h4>
                <ul className="space-y-2 text-xs leading-relaxed text-[#4A475E]">
                  {expertAnalysis.tendenciasPrincipales.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="font-mono font-semibold text-[#6D28D9]">
                        {idx + 1}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2.5">
                <h4 className="border-b border-[#ECEAF4] pb-2 text-xs font-semibold text-[#171526]">
                  Relaciones y anomalías
                </h4>
                <ul className="space-y-2 text-xs leading-relaxed text-[#4A475E]">
                  {expertAnalysis.relacionesYAnomalias.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="font-mono font-semibold text-[#6D28D9]">
                        {idx + 1}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2.5">
                <h4 className="border-b border-[#ECEAF4] pb-2 text-xs font-semibold text-[#171526]">
                  Calidad y recomendaciones
                </h4>
                <ul className="space-y-2 text-xs leading-relaxed text-[#4A475E]">
                  {expertAnalysis.calidadYRecomendaciones.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="font-mono font-semibold text-[#6D28D9]">
                        {idx + 1}.
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

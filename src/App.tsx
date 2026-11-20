import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart2,
  BoxSelect,
  Compass,
  FileDown,
  FileSpreadsheet,
  LayoutDashboard,
  Sigma,
  Upload,
} from "lucide-react";
import {
  AggregationMethod,
  DatasetAnalysis,
  ExpertAnalysisResult,
  InteractiveChartType,
  VariableType,
} from "./types/eda";
import {
  extractSheetFromWorkbook,
  ParsedDatasetRaw,
  parseUploadedFile,
  SampleDatasetDescriptor,
} from "./utils/parser";
import { analyzeDataset } from "./utils/statistics";
import { svgElementToPngDataUrl } from "./utils/svgCapture";
import { exportDatasetReportPdf } from "./utils/pdfExport";
import { UploadScreen } from "./components/UploadScreen";
import { DatasetOverview } from "./components/DatasetOverview";
import { DescriptiveStatsSection } from "./components/DescriptiveStatsSection";
import { VisualizationsSection } from "./components/VisualizationsSection";
import { BoxPlotSection } from "./components/BoxPlotSection";
import { ExpertAnalysisSection } from "./components/ExpertAnalysisSection";

type SectionId =
  | "sec-resumen"
  | "sec-estadistica"
  | "sec-graficos"
  | "sec-boxplot"
  | "sec-conclusiones";

const NAV_ITEMS: Array<{
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "sec-resumen", label: "Resumen y 3 filas", icon: LayoutDashboard },
  { id: "sec-estadistica", label: "Estadística descriptiva", icon: Sigma },
  { id: "sec-graficos", label: "Histograma y gráficos", icon: BarChart2 },
  { id: "sec-boxplot", label: "BoxPlot y atípicos", icon: BoxSelect },
  { id: "sec-conclusiones", label: "Tendencias y experto", icon: Compass },
];

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const histogramSvgRef = useRef<SVGSVGElement | null>(null);
  const interactiveSvgRef = useRef<SVGSVGElement | null>(null);
  const boxplotSvgRef = useRef<SVGSVGElement | null>(null);

  const [rawDataset, setRawDataset] = useState<ParsedDatasetRaw | null>(null);
  const [typeOverrides, setTypeOverrides] = useState<Record<string, VariableType>>({});
  const [dataset, setDataset] = useState<DatasetAnalysis | null>(null);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("sec-resumen");

  // Chart states
  const [histVar, setHistVar] = useState<string>("");
  const [histBins, setHistBins] = useState<number>(8);
  const [chartType, setChartType] = useState<InteractiveChartType>("bar");
  const [xVar, setXVar] = useState<string>("");
  const [yVar, setYVar] = useState<string>("");
  const [aggregation, setAggregation] = useState<AggregationMethod>("mean");
  const [showTrendline, setShowTrendline] = useState<boolean>(true);
  const [boxplotVar, setBoxplotVar] = useState<string>("");

  // Expert AI analysis state
  const [expertAnalysis, setExpertAnalysis] =
    useState<ExpertAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const applyDefaultsForAnalysis = useCallback((analysis: DatasetAnalysis) => {
    const numericCols = analysis.columns.filter((c) => c.type === "numeric");
    const catOrDateCols = analysis.columns.filter((c) => c.type !== "numeric");

    const firstNum = numericCols[0]?.name ?? "";
    const secondNum = numericCols[1]?.name ?? firstNum;

    setHistVar(firstNum);
    setHistBins(
      Math.max(5, Math.min(14, Math.ceil(Math.log2(Math.max(analysis.rowCount, 4)) + 1)))
    );

    if (catOrDateCols.length > 0 && numericCols.length > 0) {
      setChartType("bar");
      setXVar(catOrDateCols[0].name);
      setYVar(firstNum);
    } else if (numericCols.length >= 2) {
      setChartType("scatter");
      setXVar(firstNum);
      setYVar(secondNum);
    } else {
      setChartType("bar");
      setXVar(analysis.columns[0]?.name ?? "");
      setYVar("");
    }

    // Pick numeric column with most outliers or first numeric for BoxPlot
    const mostOutliersCol = [...numericCols].sort(
      (a, b) =>
        (b.numericStats?.outliers.length ?? 0) -
        (a.numericStats?.outliers.length ?? 0)
    )[0];
    setBoxplotVar(mostOutliersCol?.name ?? firstNum);
  }, []);

  const loadRawIntoAnalysis = useCallback(
    (raw: ParsedDatasetRaw, overrides: Record<string, VariableType>) => {
      const analysis = analyzeDataset({
        fileName: raw.fileName,
        fileSize: raw.fileSize,
        fileFormat: raw.fileFormat,
        headers: raw.headers,
        rows: raw.rows,
        sheetNames: raw.sheetNames,
        activeSheet: raw.activeSheet,
        typeOverrides: overrides,
      });
      setDataset(analysis);
      return analysis;
    },
    []
  );

  const handleFileSelected = async (file: File) => {
    setIsLoadingFile(true);
    setFileError(null);
    try {
      const parsed = await parseUploadedFile(file);
      const freshOverrides: Record<string, VariableType> = {};
      setRawDataset(parsed);
      setTypeOverrides(freshOverrides);
      setExpertAnalysis(null);
      setAnalyzeError(null);
      const analysis = loadRawIntoAnalysis(parsed, freshOverrides);
      applyDefaultsForAnalysis(analysis);
      setActiveSection("sec-resumen");
    } catch (err: unknown) {
      setFileError(
        err instanceof Error
          ? err.message
          : "No se pudo leer el archivo seleccionado."
      );
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleSampleSelected = (sample: SampleDatasetDescriptor) => {
    setFileError(null);
    const headers = Object.keys(sample.rows[0] ?? {});
    const raw: ParsedDatasetRaw = {
      fileName: sample.fileName,
      fileSize: JSON.stringify(sample.rows).length,
      fileFormat: "CSV",
      headers,
      rows: sample.rows,
    };
    const freshOverrides: Record<string, VariableType> = {};
    setRawDataset(raw);
    setTypeOverrides(freshOverrides);
    setExpertAnalysis(null);
    setAnalyzeError(null);
    const analysis = loadRawIntoAnalysis(raw, freshOverrides);
    applyDefaultsForAnalysis(analysis);
    setActiveSection("sec-resumen");
  };

  const handleSheetChange = (sheetName: string) => {
    if (!rawDataset?.workbookRef) return;
    try {
      const nextRaw = extractSheetFromWorkbook(
        rawDataset.workbookRef,
        sheetName,
        rawDataset.fileName,
        rawDataset.fileSize,
        rawDataset.fileFormat
      );
      const freshOverrides: Record<string, VariableType> = {};
      setRawDataset(nextRaw);
      setTypeOverrides(freshOverrides);
      setExpertAnalysis(null);
      setAnalyzeError(null);
      const analysis = loadRawIntoAnalysis(nextRaw, freshOverrides);
      applyDefaultsForAnalysis(analysis);
    } catch (err: unknown) {
      setFileError(
        err instanceof Error ? err.message : "Error al cambiar de hoja."
      );
    }
  };

  const handleTypeChange = (colName: string, newType: VariableType) => {
    if (!rawDataset) return;
    const nextOverrides = { ...typeOverrides, [colName]: newType };
    setTypeOverrides(nextOverrides);
    loadRawIntoAnalysis(rawDataset, nextOverrides);
  };

  const handleGenerateExpertAnalysis = async () => {
    if (!dataset) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const payload = {
        fileName: dataset.fileName,
        rowCount: dataset.rowCount,
        colCount: dataset.colCount,
        totalMissingPct: dataset.totalMissingPct,
        columns: dataset.columns.map((c) => ({
          name: c.name,
          type: c.type,
          missingCount: c.missingCount,
          missingPct: c.missingPct,
          uniqueCount: c.uniqueCount,
          numericStats: c.numericStats
            ? {
                mean: c.numericStats.mean,
                median: c.numericStats.median,
                modeLabel: c.numericStats.modeLabel,
                stdDev: c.numericStats.stdDev,
                min: c.numericStats.min,
                max: c.numericStats.max,
                q1: c.numericStats.q1,
                q3: c.numericStats.q3,
                skewness: c.numericStats.skewness,
                outlierCount: c.numericStats.outliers.length,
              }
            : undefined,
          categoricalStats: c.categoricalStats
            ? {
                mode: c.categoricalStats.mode,
                modeCount: c.categoricalStats.modeCount,
                topValues: c.categoricalStats.topValues.slice(0, 6),
              }
            : undefined,
          dateStats: c.dateStats,
        })),
        correlations: dataset.correlations.map((p) => ({
          colA: p.colA,
          colB: p.colB,
          r: Number(p.r.toFixed(3)),
        })),
        sampleRows: dataset.previewRows,
      };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al generar el análisis experto.");
      }

      setExpertAnalysis(data as ExpertAnalysisResult);
    } catch (err: unknown) {
      setAnalyzeError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servicio de análisis."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPdf = async () => {
    if (!dataset) return;
    setIsExportingPdf(true);
    try {
      const [histogramPng, interactivePng, boxplotPng] = await Promise.all([
        svgElementToPngDataUrl(histogramSvgRef.current),
        svgElementToPngDataUrl(interactiveSvgRef.current),
        svgElementToPngDataUrl(boxplotSvgRef.current),
      ]);

      const chartTypeLabel =
        chartType === "bar"
          ? "Gráfico de Barras"
          : chartType === "line"
            ? "Gráfico de Líneas"
            : "Gráfico de Dispersión";

      exportDatasetReportPdf({
        dataset,
        expertAnalysis,
        charts: {
          histogramPng,
          histogramCaption: histVar
            ? `Histograma de distribución: ${histVar} (${histBins} intervalos)`
            : "Histograma de distribución",
          interactivePng,
          interactiveCaption: `${chartTypeLabel}: Eje X "${xVar}"${yVar ? ` vs Eje Y "${yVar}"` : " (Conteo)"}`,
          boxplotPng,
          boxplotCaption: boxplotVar
            ? `Diagrama BoxPlot y atípicos: ${boxplotVar}`
            : "Diagrama BoxPlot",
        },
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Track active scroll section smoothly
  useEffect(() => {
    if (!dataset) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );

    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [dataset]);

  return (
    <div className="min-h-screen bg-[#F6F6FA] text-[#171526]">
      {/* Hidden global file input for reloading from header */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.xlsm,.ods,.txt,.tsv,.dat,.json"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            void handleFileSelected(files[0]);
          }
          e.target.value = "";
        }}
      />

      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#E4E2F0] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-6 min-w-0">
            <button
              type="button"
              onClick={() => {
                setDataset(null);
                setRawDataset(null);
                setFileError(null);
              }}
              className="text-base font-bold tracking-tight text-[#4C1D95] whitespace-nowrap shrink-0 cursor-pointer"
            >
              LuminaEDA
            </button>

            {dataset && (
              <div className="hidden items-center gap-2 text-xs text-[#5B5B73] sm:flex min-w-0">
                <span aria-hidden="true">/</span>
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]" />
                <span className="truncate max-w-[260px] font-medium text-[#171526]">
                  {dataset.fileName}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums whitespace-nowrap">
                  {dataset.rowCount.toLocaleString("es-ES")} filas × {dataset.colCount} col.
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {dataset ? (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD9EA] bg-white px-3.5 py-2 text-xs font-medium text-[#171526] transition-colors hover:border-[#A78BFA] hover:bg-[#FAF9FE] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-[#6D28D9]" />
                  Cargar archivo
                </button>
                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={() => void handleExportPdf()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#6D28D9] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#5B21B6] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  {isExportingPdf ? "Generando PDF…" : "Exportar informe PDF"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#6D28D9] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#5B21B6] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                Cargar base de datos
              </button>
            )}
          </div>
        </div>
      </header>

      {!dataset ? (
        <main>
          <UploadScreen
            onFileSelected={handleFileSelected}
            onSampleSelected={handleSampleSelected}
            isLoading={isLoadingFile}
            error={fileError}
          />
        </main>
      ) : (
        <div className="mx-auto flex max-w-[1440px]">
          {/* Fixed Left Sidebar (Desktop) */}
          <aside className="hidden w-64 shrink-0 border-r border-[#E4E2F0] bg-white lg:block">
            <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col justify-between p-4">
              <div className="space-y-6">
                <div className="space-y-1">
                  <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-[#6B6882]">
                    Secciones del análisis
                  </div>
                  <nav className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const active = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => scrollToSection(item.id)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? "bg-[#F3EFFE] text-[#5B21B6]"
                              : "text-[#5B5B73] hover:bg-[#F7F6FB] hover:text-[#171526]"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active ? "text-[#6D28D9]" : "text-[#8D89A6]"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Compact Dataset Metadata */}
                <div className="border-t border-[#ECEAF4] pt-4 px-3 space-y-2.5 text-xs">
                  <div className="font-semibold text-[#171526]">
                    Archivo activo
                  </div>
                  <div className="truncate font-mono text-[11px] text-[#5B5B73]" title={dataset.fileName}>
                    {dataset.fileName}
                  </div>
                  <div className="flex justify-between text-[#5B5B73]">
                    <span>Registros</span>
                    <span className="font-mono font-medium text-[#171526] tabular-nums">
                      {dataset.rowCount.toLocaleString("es-ES")}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#5B5B73]">
                    <span>Variables</span>
                    <span className="font-mono font-medium text-[#171526] tabular-nums">
                      {dataset.colCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#5B5B73]">
                    <span>Datos faltantes</span>
                    <span className="font-mono font-medium text-[#171526] tabular-nums">
                      {dataset.totalMissingPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#ECEAF4] pt-4 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setDataset(null);
                    setRawDataset(null);
                    setExpertAnalysis(null);
                  }}
                  className="w-full rounded-lg border border-[#DCD9EA] bg-white px-3 py-2 text-xs font-medium text-[#5B5B73] transition-colors hover:border-[#A78BFA] hover:text-[#171526] cursor-pointer"
                >
                  Cambiar base de datos
                </button>
              </div>
            </div>
          </aside>

          {/* Main Analytical Viewport */}
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
            {/* Mobile compact jump bar */}
            <div className="mb-6 flex gap-1.5 overflow-x-auto pb-2 lg:hidden">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                    activeSection === item.id
                      ? "bg-[#6D28D9] text-white"
                      : "border border-[#E4E2F0] bg-white text-[#5B5B73]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {fileError && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]"
              >
                {fileError}
              </div>
            )}

            <div className="space-y-12">
              <DatasetOverview
                dataset={dataset}
                onTypeChange={handleTypeChange}
                onSheetChange={
                  rawDataset?.workbookRef ? handleSheetChange : undefined
                }
              />

              <DescriptiveStatsSection dataset={dataset} />

              <VisualizationsSection
                dataset={dataset}
                histVar={histVar}
                onHistVarChange={setHistVar}
                histBins={histBins}
                onHistBinsChange={setHistBins}
                chartType={chartType}
                onChartTypeChange={setChartType}
                xVar={xVar}
                onXVarChange={setXVar}
                yVar={yVar}
                onYVarChange={setYVar}
                aggregation={aggregation}
                onAggregationChange={setAggregation}
                showTrendline={showTrendline}
                onShowTrendlineChange={setShowTrendline}
                histogramSvgRef={histogramSvgRef}
                interactiveSvgRef={interactiveSvgRef}
              />

              <BoxPlotSection
                dataset={dataset}
                selectedVar={boxplotVar}
                onSelectedVarChange={setBoxplotVar}
                boxplotSvgRef={boxplotSvgRef}
              />

              <ExpertAnalysisSection
                dataset={dataset}
                expertAnalysis={expertAnalysis}
                isAnalyzing={isAnalyzing}
                analyzeError={analyzeError}
                onGenerateExpertAnalysis={handleGenerateExpertAnalysis}
              />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

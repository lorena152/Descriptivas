export type VariableType = "numeric" | "categorical" | "date";

export interface OutlierRecord {
  rowIndex: number; // 1-based row number in dataset
  value: number;
  isExtreme: boolean; // beyond 3 * IQR
}

export interface NumericStats {
  count: number;
  mean: number;
  median: number;
  modes: number[];
  modeLabel: string;
  modeFrequency: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  skewness: number;
  outliers: OutlierRecord[];
  values: number[];
}

export interface CategoricalFrequency {
  value: string;
  count: number;
  pct: number;
}

export interface CategoricalStats {
  count: number;
  mode: string;
  modeCount: number;
  topValues: CategoricalFrequency[];
}

export interface DateStats {
  count: number;
  minDate: string;
  maxDate: string;
  spanDays: number;
}

export interface ColumnProfile {
  name: string;
  type: VariableType;
  nonNullCount: number;
  missingCount: number;
  missingPct: number;
  uniqueCount: number;
  sampleValues: string[];
  numericStats?: NumericStats;
  categoricalStats?: CategoricalStats;
  dateStats?: DateStats;
}

export interface CorrelationPair {
  colA: string;
  colB: string;
  r: number;
  absR: number;
  strength: "Fuerte" | "Moderada" | "Débil";
  direction: "Positiva" | "Negativa";
}

export interface AutoInsight {
  id: string;
  category: "estructura" | "calidad" | "distribucion" | "correlacion" | "atipicos";
  title: string;
  detail: string;
  severity: "info" | "warning" | "highlight";
}

export interface DatasetAnalysis {
  fileName: string;
  fileSize: number;
  fileFormat: string;
  sheetNames?: string[];
  activeSheet?: string;
  rowCount: number;
  colCount: number;
  totalCells: number;
  totalMissingCells: number;
  totalMissingPct: number;
  columns: ColumnProfile[];
  rawRows: Record<string, unknown>[];
  previewRows: Record<string, unknown>[]; // Strictly first 3 rows for structure verification
  correlations: CorrelationPair[];
  autoInsights: AutoInsight[];
}

export interface ExpertAnalysisResult {
  resumenEjecutivo: string;
  tendenciasPrincipales: string[];
  relacionesYAnomalias: string[];
  calidadYRecomendaciones: string[];
  generatedAt: string;
}

export type InteractiveChartType = "bar" | "line" | "scatter";
export type AggregationMethod = "mean" | "sum" | "median" | "count";

export interface ChartSnapshotSet {
  histogramPng?: string;
  histogramCaption?: string;
  interactivePng?: string;
  interactiveCaption?: string;
  boxplotPng?: string;
  boxplotCaption?: string;
}

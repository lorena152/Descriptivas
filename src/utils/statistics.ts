import {
  AutoInsight,
  CategoricalStats,
  ColumnProfile,
  CorrelationPair,
  DatasetAnalysis,
  DateStats,
  NumericStats,
  OutlierRecord,
  VariableType,
} from "../types/eda";

const MISSING_TOKENS = new Set([
  "",
  "na",
  "n/a",
  "null",
  "nan",
  "none",
  "undefined",
  "-",
  "?",
  "sin dato",
]);

export function isMissingValue(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "number") return Number.isNaN(val);
  if (val instanceof Date) return Number.isNaN(val.getTime());
  const str = String(val).trim().toLowerCase();
  return MISSING_TOKENS.has(str);
}

export function parseNumericValue(val: unknown): number | null {
  if (isMissingValue(val)) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (val instanceof Date) return null;

  let str = String(val).trim();
  // Strip common currency symbols, percent signs, and spaces
  str = str.replace(/[$€£¥%\s]/g, "");
  if (!str) return null;

  // Handle European decimal comma vs thousands separator
  const hasComma = str.includes(",");
  const hasDot = str.includes(".");
  if (hasComma && !hasDot) {
    // e.g. "12,45" -> "12.45" unless it's clearly "1,234"
    if (/^-?\d{1,3}(,\d{3})+$/.test(str)) {
      str = str.replace(/,/g, "");
    } else {
      str = str.replace(",", ".");
    }
  } else if (hasComma && hasDot) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  }

  if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(str)) {
    return null;
  }

  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

export function parseDateValue(val: unknown): Date | null {
  if (isMissingValue(val)) return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "number") return null;

  const str = String(val).trim();
  // Avoid matching plain integers like "2024" or "42" as dates
  if (/^-?\d+(\.\d+)?$/.test(str)) return null;

  // ISO YYYY-MM-DD or YYYY/MM/DD (with optional time)
  const isoMatch = str.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (isoMatch) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = isoMatch;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    if (!Number.isNaN(dt.getTime()) && dt.getMonth() === Number(m) - 1) return dt;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, a, b, y] = dmyMatch;
    const first = Number(a);
    const second = Number(b);
    const day = first > 12 ? first : first;
    const month = first > 12 ? second : second;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const dt = new Date(Number(y), month - 1, day);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }

  // Month name strings or RFC strings
  if (/[a-zA-Z]{3}/.test(str)) {
    const parsed = Date.parse(str);
    if (!Number.isNaN(parsed)) {
      const dt = new Date(parsed);
      if (dt.getFullYear() >= 1900 && dt.getFullYear() <= 2150) return dt;
    }
  }

  return null;
}

function inferVariableType(values: unknown[]): VariableType {
  const nonMissing = values.filter((v) => !isMissingValue(v));
  if (nonMissing.length === 0) return "categorical";

  let numericCount = 0;
  let dateCount = 0;

  for (const v of nonMissing) {
    if (v instanceof Date) {
      dateCount++;
      continue;
    }
    if (parseNumericValue(v) !== null) {
      numericCount++;
      continue;
    }
    if (parseDateValue(v) !== null) {
      dateCount++;
    }
  }

  const ratioNumeric = numericCount / nonMissing.length;
  const ratioDate = dateCount / nonMissing.length;

  if (ratioDate >= 0.8) return "date";
  if (ratioNumeric >= 0.85) return "numeric";
  return "categorical";
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function computeNumericStats(
  rawValues: unknown[]
): NumericStats | undefined {
  const indexed: Array<{ rowIndex: number; value: number }> = [];
  rawValues.forEach((v, idx) => {
    const num = parseNumericValue(v);
    if (num !== null) {
      indexed.push({ rowIndex: idx + 1, value: num });
    }
  });

  const n = indexed.length;
  if (n === 0) return undefined;

  const values = indexed.map((item) => item.value);
  const sorted = [...values].sort((a, b) => a - b);

  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const extremeLower = q1 - 3 * iqr;
  const extremeUpper = q3 + 3 * iqr;

  // Variance & Sample StdDev
  const sqDiffSum = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variance = n > 1 ? sqDiffSum / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // Skewness (Fisher-Pearson)
  let skewness = 0;
  if (n > 2 && stdDev > 0) {
    const cubedDiffSum = values.reduce(
      (acc, v) => acc + Math.pow((v - mean) / stdDev, 3),
      0
    );
    skewness = (n / ((n - 1) * (n - 2))) * cubedDiffSum;
  }

  // Mode calculation (exact rounded to 4 decimals for stability)
  const freqMap = new Map<number, number>();
  for (const v of values) {
    const key = Math.round(v * 10000) / 10000;
    freqMap.set(key, (freqMap.get(key) ?? 0) + 1);
  }
  let maxFreq = 0;
  freqMap.forEach((f) => {
    if (f > maxFreq) maxFreq = f;
  });

  const modes: number[] = [];
  if (maxFreq > 1) {
    freqMap.forEach((f, val) => {
      if (f === maxFreq) modes.push(val);
    });
    modes.sort((a, b) => a - b);
  }

  let modeLabel = "Sin repetición (únicos)";
  if (modes.length === 1) {
    modeLabel = formatStatNumber(modes[0]);
  } else if (modes.length > 1 && modes.length <= 3) {
    modeLabel = modes.map(formatStatNumber).join(", ");
  } else if (modes.length > 3) {
    modeLabel = `${formatStatNumber(modes[0])} (+${modes.length - 1} empates)`;
  }

  const outliers: OutlierRecord[] = indexed
    .filter((item) => item.value < lowerFence || item.value > upperFence)
    .map((item) => ({
      rowIndex: item.rowIndex,
      value: item.value,
      isExtreme: item.value < extremeLower || item.value > extremeUpper,
    }));

  return {
    count: n,
    mean,
    median,
    modes,
    modeLabel,
    modeFrequency: maxFreq,
    stdDev,
    variance,
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    q1,
    q3,
    iqr,
    lowerFence,
    upperFence,
    skewness,
    outliers,
    values,
  };
}

function computeCategoricalStats(rawValues: unknown[]): CategoricalStats {
  const counts = new Map<string, number>();
  let total = 0;

  for (const v of rawValues) {
    if (isMissingValue(v)) continue;
    const key = String(v).trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total++;
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      value,
      count,
      pct: total > 0 ? (count / total) * 100 : 0,
    }));

  return {
    count: total,
    mode: sorted[0]?.value ?? "—",
    modeCount: sorted[0]?.count ?? 0,
    topValues: sorted.slice(0, 12),
  };
}

function computeDateStats(rawValues: unknown[]): DateStats | undefined {
  const dates: Date[] = [];
  for (const v of rawValues) {
    const dt = parseDateValue(v);
    if (dt) dates.push(dt);
  }
  if (dates.length === 0) return undefined;

  dates.sort((a, b) => a.getTime() - b.getTime());
  const minDt = dates[0];
  const maxDt = dates[dates.length - 1];
  const spanDays = Math.round(
    (maxDt.getTime() - minDt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    count: dates.length,
    minDate: minDt.toISOString().slice(0, 10),
    maxDate: maxDt.toISOString().slice(0, 10),
    spanDays,
  };
}

function computeCorrelations(
  columns: ColumnProfile[],
  rows: Record<string, unknown>[]
): CorrelationPair[] {
  const numericCols = columns.filter((c) => c.type === "numeric");
  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const colA = numericCols[i].name;
      const colB = numericCols[j].name;
      const xs: number[] = [];
      const ys: number[] = [];

      for (const row of rows) {
        const x = parseNumericValue(row[colA]);
        const y = parseNumericValue(row[colB]);
        if (x !== null && y !== null) {
          xs.push(x);
          ys.push(y);
        }
      }

      if (xs.length < 3) continue;

      const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
      const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;

      let num = 0;
      let denX = 0;
      let denY = 0;

      for (let k = 0; k < xs.length; k++) {
        const dx = xs[k] - meanX;
        const dy = ys[k] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }

      const denom = Math.sqrt(denX * denY);
      if (denom === 0) continue;

      const r = Math.max(-1, Math.min(1, num / denom));
      const absR = Math.abs(r);

      pairs.push({
        colA,
        colB,
        r,
        absR,
        strength: absR >= 0.7 ? "Fuerte" : absR >= 0.4 ? "Moderada" : "Débil",
        direction: r >= 0 ? "Positiva" : "Negativa",
      });
    }
  }

  return pairs.sort((a, b) => b.absR - a.absR);
}

function buildAutoInsights(
  rowCount: number,
  colCount: number,
  totalMissingPct: number,
  columns: ColumnProfile[],
  correlations: CorrelationPair[]
): AutoInsight[] {
  const insights: AutoInsight[] = [];

  const numCount = columns.filter((c) => c.type === "numeric").length;
  const catCount = columns.filter((c) => c.type === "categorical").length;
  const dateCount = columns.filter((c) => c.type === "date").length;

  insights.push({
    id: "structure",
    category: "estructura",
    severity: "info",
    title: "Composición estructural del dataset",
    detail: `La base contiene ${rowCount.toLocaleString("es-ES")} registros y ${colCount} variables: ${numCount} numéricas, ${catCount} categóricas y ${dateCount} de tipo fecha.`,
  });

  const colsWithMissing = columns
    .filter((c) => c.missingCount > 0)
    .sort((a, b) => b.missingPct - a.missingPct);

  if (colsWithMissing.length === 0) {
    insights.push({
      id: "completeness",
      category: "calidad",
      severity: "highlight",
      title: "Integridad completa de registros",
      detail:
        "No se detectaron valores faltantes ni celdas nulas en ninguna de las variables analizadas (100% de completitud).",
    });
  } else {
    const worst = colsWithMissing[0];
    insights.push({
      id: "completeness",
      category: "calidad",
      severity: worst.missingPct > 15 ? "warning" : "info",
      title: `Datos faltantes en ${colsWithMissing.length} variable${colsWithMissing.length > 1 ? "s" : ""}`,
      detail: `El porcentaje global de celdas faltantes es ${totalMissingPct.toFixed(2)}%. La variable con mayor ausencia es "${worst.name}" con ${worst.missingCount} registros nulos (${worst.missingPct.toFixed(1)}%).`,
    });
  }

  // Skewness and Dispersion
  const skewedCols = columns
    .filter((c) => c.numericStats && Math.abs(c.numericStats.skewness) >= 0.75)
    .sort(
      (a, b) =>
        Math.abs(b.numericStats!.skewness) - Math.abs(a.numericStats!.skewness)
    );

  if (skewedCols.length > 0) {
    const top = skewedCols[0];
    const sk = top.numericStats!.skewness;
    const dir = sk > 0 ? "positiva (cola hacia valores altos)" : "negativa (cola hacia valores bajos)";
    insights.push({
      id: "skewness",
      category: "distribucion",
      severity: "highlight",
      title: `Asimetría marcada en "${top.name}"`,
      detail: `Presenta una asimetría ${dir} con coeficiente ${sk.toFixed(2)}: la media (${formatStatNumber(top.numericStats!.mean)}) difiere de la mediana (${formatStatNumber(top.numericStats!.median)}), por lo que la mediana es un indicador más robusto.`,
    });
  }

  // Outliers
  const outlierCols = columns
    .filter((c) => c.numericStats && c.numericStats.outliers.length > 0)
    .sort((a, b) => b.numericStats!.outliers.length - a.numericStats!.outliers.length);

  if (outlierCols.length > 0) {
    const totalOutliers = outlierCols.reduce(
      (acc, c) => acc + c.numericStats!.outliers.length,
      0
    );
    const top = outlierCols[0];
    insights.push({
      id: "outliers",
      category: "atipicos",
      severity: "warning",
      title: `${totalOutliers} valores atípicos identificados vía IQR`,
      detail: `La variable "${top.name}" concentra ${top.numericStats!.outliers.length} valores fuera de los límites [${formatStatNumber(top.numericStats!.lowerFence)}, ${formatStatNumber(top.numericStats!.upperFence)}]. Revisa el diagrama BoxPlot para inspeccionar su impacto.`,
    });
  } else if (numCount > 0) {
    insights.push({
      id: "outliers-none",
      category: "atipicos",
      severity: "info",
      title: "Sin valores atípicos extremos (criterio 1.5×IQR)",
      detail:
        "Todas las variables numéricas se mantienen dentro de los bigotes intercuartílicos estándar, lo que indica una dispersión controlada.",
    });
  }

  // Top Correlation
  if (correlations.length > 0) {
    const topCorr = correlations[0];
    if (topCorr.absR >= 0.35) {
      insights.push({
        id: "correlation",
        category: "correlacion",
        severity: "highlight",
        title: `Relación ${topCorr.strength.toLowerCase()} ${topCorr.direction.toLowerCase()} entre "${topCorr.colA}" y "${topCorr.colB}"`,
        detail: `El coeficiente de correlación de Pearson es r = ${topCorr.r.toFixed(3)}, lo que evidencia una asociación lineal ${topCorr.direction === "Positiva" ? "directa" : "inversa"} relevante entre ambas métricas.`,
      });
    }
  }

  return insights;
}

export function analyzeDataset(params: {
  fileName: string;
  fileSize: number;
  fileFormat: string;
  headers: string[];
  rows: Record<string, unknown>[];
  sheetNames?: string[];
  activeSheet?: string;
  typeOverrides?: Record<string, VariableType>;
}): DatasetAnalysis {
  const {
    fileName,
    fileSize,
    fileFormat,
    headers,
    rows,
    sheetNames,
    activeSheet,
    typeOverrides = {},
  } = params;

  const rowCount = rows.length;
  const colCount = headers.length;
  const totalCells = rowCount * colCount;
  let totalMissingCells = 0;

  const columns: ColumnProfile[] = headers.map((colName) => {
    const colValues = rows.map((r) => r[colName]);
    const missingCount = colValues.filter(isMissingValue).length;
    totalMissingCells += missingCount;

    const nonNullValues = colValues.filter((v) => !isMissingValue(v));
    const nonNullCount = nonNullValues.length;
    const missingPct = rowCount > 0 ? (missingCount / rowCount) * 100 : 0;

    const uniqueSet = new Set(nonNullValues.map((v) => String(v).trim()));
    const type: VariableType =
      typeOverrides[colName] ?? inferVariableType(colValues);

    const sampleValues = Array.from(uniqueSet).slice(0, 4);

    let numericStats: NumericStats | undefined;
    let categoricalStats: CategoricalStats | undefined;
    let dateStats: DateStats | undefined;

    if (type === "numeric") {
      numericStats = computeNumericStats(colValues);
      if (!numericStats) {
        categoricalStats = computeCategoricalStats(colValues);
      }
    } else if (type === "date") {
      dateStats = computeDateStats(colValues);
      categoricalStats = computeCategoricalStats(colValues);
    } else {
      categoricalStats = computeCategoricalStats(colValues);
    }

    return {
      name: colName,
      type,
      nonNullCount,
      missingCount,
      missingPct,
      uniqueCount: uniqueSet.size,
      sampleValues,
      numericStats,
      categoricalStats,
      dateStats,
    };
  });

  const totalMissingPct =
    totalCells > 0 ? (totalMissingCells / totalCells) * 100 : 0;
  const correlations = computeCorrelations(columns, rows);
  const autoInsights = buildAutoInsights(
    rowCount,
    colCount,
    totalMissingPct,
    columns,
    correlations
  );

  return {
    fileName,
    fileSize,
    fileFormat,
    sheetNames,
    activeSheet,
    rowCount,
    colCount,
    totalCells,
    totalMissingCells,
    totalMissingPct,
    columns,
    rawRows: rows,
    previewRows: rows.slice(0, 3),
    correlations,
    autoInsights,
  };
}

export function formatStatNumber(val: number): string {
  if (!Number.isFinite(val)) return "—";
  const abs = Math.abs(val);
  if (abs === 0) return "0";
  if (abs >= 10000) {
    return val.toLocaleString("es-ES", { maximumFractionDigits: 1 });
  }
  if (abs >= 100) {
    return val.toLocaleString("es-ES", { maximumFractionDigits: 2 });
  }
  if (abs >= 1) {
    return val.toLocaleString("es-ES", { maximumFractionDigits: 3 });
  }
  return val.toLocaleString("es-ES", { maximumFractionDigits: 4 });
}

export function formatCellDisplay(val: unknown): string {
  if (isMissingValue(val)) return "Nulo";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "number") return formatStatNumber(val);
  return String(val);
}

export function buildHistogramBins(
  values: number[],
  requestedBins?: number
): Array<{
  x0: number;
  x1: number;
  count: number;
  pct: number;
  label: string;
}> {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);

  const binCount =
    requestedBins ?? Math.max(5, Math.min(20, Math.ceil(Math.log2(values.length) + 1)));

  if (min === max) {
    return [
      {
        x0: min,
        x1: max,
        count: values.length,
        pct: 100,
        label: formatStatNumber(min),
      },
    ];
  }

  const step = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const x0 = min + i * step;
    const x1 = i === binCount - 1 ? max : min + (i + 1) * step;
    return {
      x0,
      x1,
      count: 0,
      pct: 0,
      label: `${formatStatNumber(x0)} – ${formatStatNumber(x1)}`,
    };
  });

  for (const v of values) {
    let idx = Math.floor((v - min) / step);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }

  bins.forEach((b) => {
    b.pct = (b.count / values.length) * 100;
  });

  return bins;
}

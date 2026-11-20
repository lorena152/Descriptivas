import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedDatasetRaw {
  fileName: string;
  fileSize: number;
  fileFormat: string;
  headers: string[];
  rows: Record<string, unknown>[];
  sheetNames?: string[];
  activeSheet?: string;
  workbookRef?: XLSX.WorkBook;
}

function normalizeHeaders(rawHeaders: string[]): string[] {
  const seen = new Map<string, number>();
  return rawHeaders.map((h, idx) => {
    const base = String(h ?? "").trim() || `Variable_${idx + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function cleanRowArray(
  matrix: unknown[][]
): { headers: string[]; rows: Record<string, unknown>[] } {
  const nonEmptyRows = matrix.filter((row) =>
    row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")
  );

  if (nonEmptyRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaderRow = nonEmptyRows[0].map((cell) => String(cell ?? "").trim());
  const headers = normalizeHeaders(rawHeaderRow);

  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < nonEmptyRows.length; i++) {
    const arr = nonEmptyRows[i];
    const rowObj: Record<string, unknown> = {};
    let hasAnyValue = false;

    for (let c = 0; c < headers.length; c++) {
      const val = c < arr.length ? arr[c] : null;
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        hasAnyValue = true;
      }
      rowObj[headers[c]] = val ?? null;
    }

    if (hasAnyValue) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

export function extractSheetFromWorkbook(
  workbook: XLSX.WorkBook,
  sheetName: string,
  fileName: string,
  fileSize: number,
  fileFormat: string
): ParsedDatasetRaw {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`No se encontró la hoja "${sheetName}" en el archivo.`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  const { headers, rows } = cleanRowArray(matrix);
  if (headers.length === 0 || rows.length === 0) {
    throw new Error("La hoja seleccionada no contiene encabezados ni filas de datos válidas.");
  }

  return {
    fileName,
    fileSize,
    fileFormat,
    headers,
    rows,
    sheetNames: workbook.SheetNames,
    activeSheet: sheetName,
    workbookRef: workbook,
  };
}

function detectDelimiter(sampleText: string): string {
  const firstLines = sampleText.split(/\r?\n/).slice(0, 8).join("\n");
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestScore = -1;

  for (const delim of candidates) {
    const lines = firstLines.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;
    const counts = lines.map((l) => l.split(delim).length - 1);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const consistent = counts.every((c) => c === counts[0]) ? 1.5 : 1;
    const score = avg * consistent;
    if (avg > 0 && score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }
  return best;
}

export async function parseUploadedFile(file: File): Promise<ParsedDatasetRaw> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    if (workbook.SheetNames.length === 0) {
      throw new Error("El archivo de Excel no contiene hojas legibles.");
    }
    const firstSheet = workbook.SheetNames[0];
    return extractSheetFromWorkbook(
      workbook,
      firstSheet,
      file.name,
      file.size,
      ext.toUpperCase()
    );
  }

  if (ext === "json") {
    const text = await file.text();
    const parsed = JSON.parse(text);
    let arrayData: unknown[] = [];

    if (Array.isArray(parsed)) {
      arrayData = parsed;
    } else if (parsed && typeof parsed === "object") {
      const firstArrKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
      if (firstArrKey) {
        arrayData = parsed[firstArrKey];
      }
    }

    if (arrayData.length === 0) {
      throw new Error("El archivo JSON no contiene un arreglo de registros válido.");
    }

    const headerSet = new Set<string>();
    arrayData.forEach((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        Object.keys(item).forEach((k) => headerSet.add(k));
      }
    });

    const headers = Array.from(headerSet);
    const rows = arrayData
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map((item) => {
        const row: Record<string, unknown> = {};
        headers.forEach((h) => {
          row[h] = item[h] ?? null;
        });
        return row;
      });

    if (headers.length === 0 || rows.length === 0) {
      throw new Error("No se pudieron extraer columnas y filas del archivo JSON.");
    }

    return {
      fileName: file.name,
      fileSize: file.size,
      fileFormat: "JSON",
      headers,
      rows,
    };
  }

  // CSV, TXT, TSV, DAT or delimited text
  const rawText = await file.text();
  const cleanText = rawText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) {
    throw new Error("El archivo seleccionado está vacío.");
  }

  const delimiter = ext === "tsv" ? "\t" : detectDelimiter(cleanText);
  const result = Papa.parse<unknown[]>(cleanText, {
    delimiter,
    skipEmptyLines: "greedy",
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`No se pudo interpretar el archivo: ${result.errors[0].message}`);
  }

  const { headers, rows } = cleanRowArray(result.data);
  if (headers.length === 0 || rows.length === 0) {
    throw new Error("No se detectaron columnas o registros válidos en el archivo.");
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    fileFormat: ext ? ext.toUpperCase() : "TXT",
    headers,
    rows,
  };
}

export interface SampleDatasetDescriptor {
  id: string;
  name: string;
  subtitle: string;
  fileName: string;
  rows: Record<string, unknown>[];
}

export const SAMPLE_DATASETS: SampleDatasetDescriptor[] = [
  {
    id: "retail",
    name: "Ventas Retail y Comercio Electrónico",
    subtitle: "48 registros · 8 variables (fechas, ingresos, margen, satisfacción y atípicos)",
    fileName: "ventas_retail_2026.csv",
    rows: [
      { Fecha: "2026-01-05", Region: "Norte", Categoria: "Electrónica", Canal: "Web", Ventas_USD: 1420, Margen_Pct: 24.5, Unidades: 12, Satisfaccion: 4.6 },
      { Fecha: "2026-01-08", Region: "Centro", Categoria: "Hogar", Canal: "Tienda", Ventas_USD: 890, Margen_Pct: 31.2, Unidades: 9, Satisfaccion: 4.3 },
      { Fecha: "2026-01-12", Region: "Sur", Categoria: "Moda", Canal: "App", Ventas_USD: 640, Margen_Pct: 42.0, Unidades: 15, Satisfaccion: 4.8 },
      { Fecha: "2026-01-15", Region: "Norte", Categoria: "Electrónica", Canal: "Web", Ventas_USD: 1780, Margen_Pct: 23.1, Unidades: 14, Satisfaccion: 4.5 },
      { Fecha: "2026-01-19", Region: "Oeste", Categoria: "Deportes", Canal: "Tienda", Ventas_USD: 950, Margen_Pct: 29.8, Unidades: 8, Satisfaccion: 4.1 },
      { Fecha: "2026-01-23", Region: "Centro", Categoria: "Electrónica", Canal: "App", Ventas_USD: 2150, Margen_Pct: 22.4, Unidades: 18, Satisfaccion: 4.7 },
      { Fecha: "2026-01-27", Region: "Sur", Categoria: "Hogar", Canal: "Web", Ventas_USD: 720, Margen_Pct: 33.5, Unidades: 7, Satisfaccion: null },
      { Fecha: "2026-02-02", Region: "Norte", Categoria: "Moda", Canal: "Tienda", Ventas_USD: 580, Margen_Pct: 44.1, Unidades: 13, Satisfaccion: 4.4 },
      { Fecha: "2026-02-06", Region: "Centro", Categoria: "Electrónica", Canal: "Web", Ventas_USD: 1640, Margen_Pct: 25.0, Unidades: 15, Satisfaccion: 4.6 },
      { Fecha: "2026-02-10", Region: "Oeste", Categoria: "Hogar", Canal: "App", Ventas_USD: 1120, Margen_Pct: 30.6, Unidades: 11, Satisfaccion: 4.2 },
      { Fecha: "2026-02-14", Region: "Sur", Categoria: "Moda", Canal: "Web", Ventas_USD: 790, Margen_Pct: 40.8, Unidades: 17, Satisfaccion: 4.9 },
      { Fecha: "2026-02-18", Region: "Norte", Categoria: "Deportes", Canal: "Tienda", Ventas_USD: 1030, Margen_Pct: 28.4, Unidades: 10, Satisfaccion: 4.0 },
      { Fecha: "2026-02-22", Region: "Centro", Categoria: "Electrónica", Canal: "Web", Ventas_USD: 4950, Margen_Pct: 19.2, Unidades: 39, Satisfaccion: 4.8 },
      { Fecha: "2026-02-26", Region: "Oeste", Categoria: "Moda", Canal: "App", Ventas_USD: 615, Margen_Pct: 43.2, Unidades: 14, Satisfaccion: 4.5 },
      { Fecha: "2026-03-03", Region: "Sur", Categoria: "Hogar", Canal: "Tienda", Ventas_USD: 860, Margen_Pct: 32.0, Unidades: 9, Satisfaccion: 4.3 },
      { Fecha: "2026-03-07", Region: "Norte", Categoria: "Electrónica", Canal: "Web", Ventas_USD: 1910, Margen_Pct: 24.8, Unidades: 16, Satisfaccion: 4.7 },
      { Fecha: "2026-03-11", Region: "Centro", Categoria: "Deportes", Canal: "App", Ventas_USD: 1180, Margen_Pct: null, Unidades: 11, Satisfaccion: 4.4 },
      { Fecha: "2026-03-15", Region: "Oeste", Categoria: "Hogar", Canal: "Web", Ventas_USD: 980, Margen_Pct: 31.5, Unidades: 10, Satisfaccion: 4.2 },
      { Fecha: "2026-03-19", Region: "Sur", Categoria: "Electrónica", Canal: "Tienda", Ventas_USD: 1520, Margen_Pct: 25.4, Unidades: 13, Satisfaccion: 4.5 },
      { Fecha: "2026-03-23", Region: "Norte", Categoria: "Moda", Canal: "App", Ventas_USD: 710, Margen_Pct: 41.7, Unidades: 16, Satisfaccion: 4.6 },
      { Fecha: "2026-03-28", Region: "Centro", Categoria: "Hogar", Canal: "Web", Ventas_USD: 1050, Margen_Pct: 30.9, Unidades: 11, Satisfaccion: 4.4 },
      { Fecha: "2026-04-02", Region: "Oeste", Categoria: "Deportes", Canal: "Tienda", Ventas_USD: 870, Margen_Pct: 29.1, Unidades: 8, Satisfaccion: 3.9 },
      { Fecha: "2026-04-06", Region: "Norte", Categoria: "Electrónica", Canal: "Web", Ventas_USD: 2040, Margen_Pct: 23.8, Unidades: 17, Satisfaccion: 4.8 },
      { Fecha: "2026-04-10", Region: "Sur", Categoria: "Moda", Canal: "App", Ventas_USD: 685, Margen_Pct: 42.5, Unidades: 15, Satisfaccion: 4.7 },
      { Fecha: "2026-04-14", Region: "Centro", Categoria: "Hogar", Canal: "Tienda", Ventas_USD: 930, Margen_Pct: 32.8, Unidades: 9, Satisfaccion: null },
      { Fecha: "2026-04-18", Region: "Oeste", Categoria: "Electrónica", Canal: "Web", Ventas_USD: 1690, Margen_Pct: 24.1, Unidades: 14, Satisfaccion: 4.5 },
      { Fecha: "2026-04-22", Region: "Norte", Categoria: "Deportes", Canal: "App", Ventas_USD: 1240, Margen_Pct: 27.9, Unidades: 12, Satisfaccion: 4.3 },
      { Fecha: "2026-04-26", Region: "Sur", Categoria: "Hogar", Canal: "Web", Ventas_USD: 790, Margen_Pct: 34.2, Unidades: 8, Satisfaccion: 4.4 },
      { Fecha: "2026-05-01", Region: "Centro", Categoria: "Electrónica", Canal: "App", Ventas_USD: 2290, Margen_Pct: 22.9, Unidades: 19, Satisfaccion: 4.7 },
      { Fecha: "2026-05-05", Region: "Oeste", Categoria: "Moda", Canal: "Tienda", Ventas_USD: 540, Margen_Pct: 45.0, Unidades: 12, Satisfaccion: 4.6 },
      { Fecha: "2026-05-09", Region: "Norte", Categoria: "Hogar", Canal: "Web", Ventas_USD: 1150, Margen_Pct: 31.0, Unidades: 12, Satisfaccion: 4.5 },
      { Fecha: "2026-05-13", Region: "Sur", Categoria: "Deportes", Canal: "App", Ventas_USD: 990, Margen_Pct: 28.8, Unidades: 9, Satisfaccion: 4.2 },
      { Fecha: "2026-05-17", Region: "Centro", Categoria: "Electrónica", Canal: "Web", Ventas_USD: 5620, Margen_Pct: 18.5, Unidades: 44, Satisfaccion: 4.9 },
      { Fecha: "2026-05-21", Region: "Oeste", Categoria: "Hogar", Canal: "Tienda", Ventas_USD: 840, Margen_Pct: 32.4, Unidades: 8, Satisfaccion: 4.1 },
      { Fecha: "2026-05-25", Region: "Norte", Categoria: "Moda", Canal: "Web", Ventas_USD: 760, Margen_Pct: 41.2, Unidades: 17, Satisfaccion: 4.7 },
      { Fecha: "2026-05-29", Region: "Sur", Categoria: "Electrónica", Canal: "App", Ventas_USD: 1830, Margen_Pct: 24.4, Unidades: 15, Satisfaccion: 4.6 },
      { Fecha: "2026-06-03", Region: "Centro", Categoria: "Deportes", Canal: "Web", Ventas_USD: 1120, Margen_Pct: 29.5, Unidades: 11, Satisfaccion: 4.3 },
      { Fecha: "2026-06-07", Region: "Oeste", Categoria: "Hogar", Canal: "App", Ventas_USD: 1010, Margen_Pct: 31.7, Unidades: 10, Satisfaccion: 4.4 },
      { Fecha: "2026-06-11", Region: "Norte", Categoria: "Electrónica", Canal: "Tienda", Ventas_USD: 1750, Margen_Pct: 24.9, Unidades: 15, Satisfaccion: 4.5 },
      { Fecha: "2026-06-15", Region: "Sur", Categoria: "Moda", Canal: "Web", Ventas_USD: 630, Margen_Pct: 43.0, Unidades: 14, Satisfaccion: null },
      { Fecha: "2026-06-19", Region: "Centro", Categoria: "Hogar", Canal: "App", Ventas_USD: 1090, Margen_Pct: 30.2, Unidades: 11, Satisfaccion: 4.4 },
      { Fecha: "2026-06-23", Region: "Oeste", Categoria: "Deportes", Canal: "Web", Ventas_USD: 910, Margen_Pct: 28.6, Unidades: 9, Satisfaccion: 4.0 },
      { Fecha: "2026-06-27", Region: "Norte", Categoria: "Electrónica", Canal: "App", Ventas_USD: 2380, Margen_Pct: 23.0, Unidades: 20, Satisfaccion: 4.8 },
      { Fecha: "2026-07-02", Region: "Sur", Categoria: "Hogar", Canal: "Tienda", Ventas_USD: 880, Margen_Pct: 32.1, Unidades: 9, Satisfaccion: 4.3 },
      { Fecha: "2026-07-06", Region: "Centro", Categoria: "Moda", Canal: "Web", Ventas_USD: 740, Margen_Pct: 41.9, Unidades: 16, Satisfaccion: 4.6 },
      { Fecha: "2026-07-10", Region: "Oeste", Categoria: "Electrónica", Canal: "App", Ventas_USD: 1940, Margen_Pct: null, Unidades: 16, Satisfaccion: 4.7 },
      { Fecha: "2026-07-14", Region: "Norte", Categoria: "Deportes", Canal: "Web", Ventas_USD: 1310, Margen_Pct: 27.4, Unidades: 13, Satisfaccion: 4.4 },
      { Fecha: "2026-07-18", Region: "Centro", Categoria: "Hogar", Canal: "Tienda", Ventas_USD: 960, Margen_Pct: 31.8, Unidades: 10, Satisfaccion: 4.5 },
    ],
  },
  {
    id: "academico",
    name: "Rendimiento Académico Universitario",
    subtitle: "42 registros · 7 variables (asistencia, horas de estudio, promedio y becas)",
    fileName: "rendimiento_academico.csv",
    rows: [
      { Estudiante: "EST-101", Facultad: "Ingeniería", Modalidad: "Presencial", Asistencia_Pct: 92, Horas_Estudio_Sem: 18, Promedio_Final: 8.9, Becado: "Sí" },
      { Estudiante: "EST-102", Facultad: "Economía", Modalidad: "Híbrida", Asistencia_Pct: 84, Horas_Estudio_Sem: 12, Promedio_Final: 7.8, Becado: "No" },
      { Estudiante: "EST-103", Facultad: "Ciencias", Modalidad: "Presencial", Asistencia_Pct: 96, Horas_Estudio_Sem: 22, Promedio_Final: 9.4, Becado: "Sí" },
      { Estudiante: "EST-104", Facultad: "Diseño", Modalidad: "Virtual", Asistencia_Pct: 78, Horas_Estudio_Sem: 10, Promedio_Final: 7.3, Becado: "No" },
      { Estudiante: "EST-105", Facultad: "Ingeniería", Modalidad: "Presencial", Asistencia_Pct: 88, Horas_Estudio_Sem: 15, Promedio_Final: 8.3, Becado: "Sí" },
      { Estudiante: "EST-106", Facultad: "Economía", Modalidad: "Presencial", Asistencia_Pct: 71, Horas_Estudio_Sem: 8, Promedio_Final: 6.7, Becado: "No" },
      { Estudiante: "EST-107", Facultad: "Ciencias", Modalidad: "Híbrida", Asistencia_Pct: 91, Horas_Estudio_Sem: 19, Promedio_Final: 9.0, Becado: "Sí" },
      { Estudiante: "EST-108", Facultad: "Diseño", Modalidad: "Presencial", Asistencia_Pct: 86, Horas_Estudio_Sem: 14, Promedio_Final: 8.1, Becado: "No" },
      { Estudiante: "EST-109", Facultad: "Ingeniería", Modalidad: "Virtual", Asistencia_Pct: 65, Horas_Estudio_Sem: 6, Promedio_Final: 5.9, Becado: "No" },
      { Estudiante: "EST-110", Facultad: "Economía", Modalidad: "Híbrida", Asistencia_Pct: 89, Horas_Estudio_Sem: 16, Promedio_Final: 8.5, Becado: "Sí" },
      { Estudiante: "EST-111", Facultad: "Ciencias", Modalidad: "Presencial", Asistencia_Pct: 94, Horas_Estudio_Sem: 20, Promedio_Final: 9.2, Becado: "Sí" },
      { Estudiante: "EST-112", Facultad: "Diseño", Modalidad: "Virtual", Asistencia_Pct: 82, Horas_Estudio_Sem: 11, Promedio_Final: 7.6, Becado: "No" },
      { Estudiante: "EST-113", Facultad: "Ingeniería", Modalidad: "Presencial", Asistencia_Pct: 90, Horas_Estudio_Sem: 17, Promedio_Final: 8.7, Becado: "Sí" },
      { Estudiante: "EST-114", Facultad: "Economía", Modalidad: "Presencial", Asistencia_Pct: 76, Horas_Estudio_Sem: 9, Promedio_Final: 7.1, Becado: "No" },
      { Estudiante: "EST-115", Facultad: "Ciencias", Modalidad: "Híbrida", Asistencia_Pct: 42, Horas_Estudio_Sem: 4, Promedio_Final: 4.5, Becado: "No" },
      { Estudiante: "EST-116", Facultad: "Diseño", Modalidad: "Presencial", Asistencia_Pct: 88, Horas_Estudio_Sem: 15, Promedio_Final: 8.4, Becado: "No" },
      { Estudiante: "EST-117", Facultad: "Ingeniería", Modalidad: "Híbrida", Asistencia_Pct: 85, Horas_Estudio_Sem: 14, Promedio_Final: 8.0, Becado: "No" },
      { Estudiante: "EST-118", Facultad: "Economía", Modalidad: "Virtual", Asistencia_Pct: 79, Horas_Estudio_Sem: 11, Promedio_Final: 7.5, Becado: "No" },
      { Estudiante: "EST-119", Facultad: "Ciencias", Modalidad: "Presencial", Asistencia_Pct: 97, Horas_Estudio_Sem: 24, Promedio_Final: 9.6, Becado: "Sí" },
      { Estudiante: "EST-120", Facultad: "Diseño", Modalidad: "Híbrida", Asistencia_Pct: 83, Horas_Estudio_Sem: 13, Promedio_Final: 7.9, Becado: "No" },
      { Estudiante: "EST-121", Facultad: "Ingeniería", Modalidad: "Presencial", Asistencia_Pct: 93, Horas_Estudio_Sem: 21, Promedio_Final: 9.1, Becado: "Sí" },
      { Estudiante: "EST-122", Facultad: "Economía", Modalidad: "Presencial", Asistencia_Pct: 87, Horas_Estudio_Sem: 14, Promedio_Final: 8.2, Becado: "No" },
      { Estudiante: "EST-123", Facultad: "Ciencias", Modalidad: "Virtual", Asistencia_Pct: 74, Horas_Estudio_Sem: null, Promedio_Final: 6.9, Becado: "No" },
      { Estudiante: "EST-124", Facultad: "Diseño", Modalidad: "Presencial", Asistencia_Pct: 90, Horas_Estudio_Sem: 16, Promedio_Final: 8.6, Becado: "Sí" },
      { Estudiante: "EST-125", Facultad: "Ingeniería", Modalidad: "Híbrida", Asistencia_Pct: 86, Horas_Estudio_Sem: 15, Promedio_Final: 8.2, Becado: "No" },
      { Estudiante: "EST-126", Facultad: "Economía", Modalidad: "Presencial", Asistencia_Pct: 91, Horas_Estudio_Sem: 17, Promedio_Final: 8.8, Becado: "Sí" },
      { Estudiante: "EST-127", Facultad: "Ciencias", Modalidad: "Presencial", Asistencia_Pct: 95, Horas_Estudio_Sem: 21, Promedio_Final: 9.3, Becado: "Sí" },
      { Estudiante: "EST-128", Facultad: "Diseño", Modalidad: "Virtual", Asistencia_Pct: 77, Horas_Estudio_Sem: 10, Promedio_Final: 7.2, Becado: "No" },
      { Estudiante: "EST-129", Facultad: "Ingeniería", Modalidad: "Presencial", Asistencia_Pct: 89, Horas_Estudio_Sem: 16, Promedio_Final: 8.5, Becado: "Sí" },
      { Estudiante: "EST-130", Facultad: "Economía", Modalidad: "Híbrida", Asistencia_Pct: 81, Horas_Estudio_Sem: 12, Promedio_Final: 7.7, Becado: "No" },
      { Estudiante: "EST-131", Facultad: "Ciencias", Modalidad: "Presencial", Asistencia_Pct: 92, Horas_Estudio_Sem: 19, Promedio_Final: 8.9, Becado: "Sí" },
      { Estudiante: "EST-132", Facultad: "Diseño", Modalidad: "Presencial", Asistencia_Pct: 85, Horas_Estudio_Sem: 14, Promedio_Final: 8.0, Becado: "No" },
      { Estudiante: "EST-133", Facultad: "Ingeniería", Modalidad: "Virtual", Asistencia_Pct: 68, Horas_Estudio_Sem: 7, Promedio_Final: 6.3, Becado: "No" },
      { Estudiante: "EST-134", Facultad: "Economía", Modalidad: "Presencial", Asistencia_Pct: 90, Horas_Estudio_Sem: 16, Promedio_Final: 8.6, Becado: "Sí" },
      { Estudiante: "EST-135", Facultad: "Ciencias", Modalidad: "Híbrida", Asistencia_Pct: 88, Horas_Estudio_Sem: 15, Promedio_Final: 8.4, Becado: "Sí" },
      { Estudiante: "EST-136", Facultad: "Diseño", Modalidad: "Virtual", Asistencia_Pct: 80, Horas_Estudio_Sem: 12, Promedio_Final: null, Becado: "No" },
      { Estudiante: "EST-137", Facultad: "Ingeniería", Modalidad: "Presencial", Asistencia_Pct: 94, Horas_Estudio_Sem: 20, Promedio_Final: 9.2, Becado: "Sí" },
      { Estudiante: "EST-138", Facultad: "Economía", Modalidad: "Presencial", Asistencia_Pct: 83, Horas_Estudio_Sem: 13, Promedio_Final: 7.9, Becado: "No" },
      { Estudiante: "EST-139", Facultad: "Ciencias", Modalidad: "Presencial", Asistencia_Pct: 98, Horas_Estudio_Sem: 31, Promedio_Final: 9.8, Becado: "Sí" },
      { Estudiante: "EST-140", Facultad: "Diseño", Modalidad: "Híbrida", Asistencia_Pct: 84, Horas_Estudio_Sem: 13, Promedio_Final: 8.0, Becado: "No" },
      { Estudiante: "EST-141", Facultad: "Ingeniería", Modalidad: "Presencial", Asistencia_Pct: 91, Horas_Estudio_Sem: 18, Promedio_Final: 8.8, Becado: "Sí" },
      { Estudiante: "EST-142", Facultad: "Economía", Modalidad: "Virtual", Asistencia_Pct: 75, Horas_Estudio_Sem: 9, Promedio_Final: 7.0, Becado: "No" },
    ],
  },
];

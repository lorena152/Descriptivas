import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ChartSnapshotSet,
  DatasetAnalysis,
  ExpertAnalysisResult,
} from "../types/eda";
import { formatCellDisplay, formatStatNumber } from "./statistics";

const TYPE_LABEL_ES: Record<string, string> = {
  numeric: "Numérica",
  categorical: "Categórica",
  date: "Fecha",
};

export function exportDatasetReportPdf(params: {
  dataset: DatasetAnalysis;
  expertAnalysis: ExpertAnalysisResult | null;
  charts: ChartSnapshotSet;
}): void {
  const { dataset, expertAnalysis, charts } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const purplePrimary: [number, number, number] = [109, 40, 217]; // #6D28D9
  const slateDark: [number, number, number] = [23, 21, 38]; // #171526
  const slateMuted: [number, number, number] = [91, 91, 115]; // #5B5B73
  const lavenderBg: [number, number, number] = [245, 243, 255]; // #F5F3FF

  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 18;
    }
  };

  const drawSectionHeading = (title: string, subtitle?: string) => {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...purplePrimary);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(228, 226, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...slateMuted);
      const lines = doc.splitTextToSize(subtitle, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4 + 2;
    }
  };

  // Top Banner
  doc.setFillColor(...purplePrimary);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Informe de Análisis Exploratorio y Descriptivo", margin, 12.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(237, 233, 254);
  const dateLabel = new Date().toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(
    `Archivo: ${dataset.fileName}${dataset.activeSheet ? ` (${dataset.activeSheet})` : ""}  ·  Generado: ${dateLabel}`,
    margin,
    20.5
  );

  y = 36;

  // Summary metrics bar
  const numCols = dataset.columns.filter((c) => c.type === "numeric").length;
  const catCols = dataset.columns.filter((c) => c.type === "categorical").length;
  const dateCols = dataset.columns.filter((c) => c.type === "date").length;

  doc.setFillColor(...lavenderBg);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "F");

  const kpis = [
    { label: "Registros", value: dataset.rowCount.toLocaleString("es-ES") },
    { label: "Variables", value: String(dataset.colCount) },
    {
      label: "Tipos (Num / Cat / Fec)",
      value: `${numCols} / ${catCols} / ${dateCols}`,
    },
    {
      label: "Datos Faltantes",
      value: `${dataset.totalMissingCells} (${dataset.totalMissingPct.toFixed(1)}%)`,
    },
  ];

  const colW = contentWidth / kpis.length;
  kpis.forEach((k, idx) => {
    const x = margin + idx * colW + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text(k.label, x, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...slateDark);
    doc.text(k.value, x, y + 13.5);
  });

  y += 26;

  // Section 1: First 3 rows
  drawSectionHeading(
    "1. Verificación de Estructura (Primeras 3 Filas)",
    "Muestra inicial de los registros cargados para confirmar encabezados y formato."
  );

  const previewCols = dataset.columns.slice(0, 8).map((c) => c.name);
  const previewBody = dataset.previewRows.map((row) =>
    previewCols.map((col) => {
      const text = formatCellDisplay(row[col]);
      return text.length > 26 ? `${text.slice(0, 24)}…` : text;
    })
  );

  autoTable(doc, {
    startY: y,
    head: [previewCols],
    body: previewBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: slateDark },
    headStyles: { fillColor: purplePrimary, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 252] },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (dataset.columns.length > 8) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text(
      `Nota: Se muestran las primeras 8 de ${dataset.columns.length} columnas en la vista previa tabular.`,
      margin,
      y - 4
    );
  }

  // Section 2: Variable types & missing values
  drawSectionHeading(
    "2. Clasificación de Variables y Valores Faltantes",
    "Detección automática de tipos de dato, cardinalidad y diagnóstico de valores nulos."
  );

  autoTable(doc, {
    startY: y,
    head: [["Variable", "Tipo", "Válidos", "Faltantes", "% Faltante", "Únicos"]],
    body: dataset.columns.map((c) => [
      c.name,
      TYPE_LABEL_ES[c.type] ?? c.type,
      String(c.nonNullCount),
      String(c.missingCount),
      `${c.missingPct.toFixed(1)}%`,
      String(c.uniqueCount),
    ]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2, textColor: slateDark },
    headStyles: { fillColor: purplePrimary, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 252] },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;

  // Section 3: Descriptive Statistics
  const numericCols = dataset.columns.filter((c) => c.type === "numeric" && c.numericStats);
  if (numericCols.length > 0) {
    drawSectionHeading(
      "3. Estadística Descriptiva (Variables Numéricas)",
      "Medidas de tendencia central, dispersión, cuartiles y asimetría calculadas sobre valores válidos."
    );

    autoTable(doc, {
      startY: y,
      head: [["Variable", "Media", "Mediana", "Moda", "Desv. Est.", "Mín", "Máx", "Q1", "Q3"]],
      body: numericCols.map((c) => {
        const s = c.numericStats!;
        return [
          c.name,
          formatStatNumber(s.mean),
          formatStatNumber(s.median),
          s.modeLabel.length > 16 ? `${s.modeLabel.slice(0, 14)}…` : s.modeLabel,
          formatStatNumber(s.stdDev),
          formatStatNumber(s.min),
          formatStatNumber(s.max),
          formatStatNumber(s.q1),
          formatStatNumber(s.q3),
        ];
      }),
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 2, textColor: slateDark },
      headStyles: { fillColor: purplePrimary, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 248, 252] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  }

  // Section 4: Charts
  const chartEntries: Array<{ title: string; dataUrl?: string }> = [
    {
      title: charts.histogramCaption || "Distribución (Histograma)",
      dataUrl: charts.histogramPng,
    },
    {
      title: charts.interactiveCaption || "Gráfico Interactivo (Ejes X / Y)",
      dataUrl: charts.interactivePng,
    },
    {
      title: charts.boxplotCaption || "Diagrama BoxPlot y Valores Atípicos",
      dataUrl: charts.boxplotPng,
    },
  ].filter((c) => Boolean(c.dataUrl));

  if (chartEntries.length > 0) {
    drawSectionHeading(
      "4. Visualizaciones Gráficas del Análisis",
      "Gráficos generados a partir de la configuración actual en la plataforma."
    );

    for (const entry of chartEntries) {
      if (!entry.dataUrl) continue;
      ensureSpace(78);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...slateDark);
      doc.text(entry.title, margin, y);
      y += 3;

      const imgProps = doc.getImageProperties(entry.dataUrl);
      const imgWidth = contentWidth;
      const imgHeight = Math.min(72, (imgProps.height * imgWidth) / imgProps.width);
      doc.setDrawColor(232, 230, 242);
      doc.rect(margin, y, imgWidth, imgHeight);
      doc.addImage(entry.dataUrl, "PNG", margin, y, imgWidth, imgHeight);
      y += imgHeight + 8;
    }
  }

  // Section 5: Outliers summary
  const outlierSummary = numericCols.filter((c) => c.numericStats!.outliers.length > 0);
  if (outlierSummary.length > 0) {
    drawSectionHeading(
      "5. Detección de Valores Atípicos (Criterio 1.5 × IQR)",
      "Registros ubicados fuera de los límites inferior y superior del diagrama BoxPlot."
    );

    autoTable(doc, {
      startY: y,
      head: [["Variable", "Atípicos", "Límite Inf.", "Límite Sup.", "Valores Destacados"]],
      body: outlierSummary.map((c) => {
        const s = c.numericStats!;
        const sampleOut = s.outliers
          .slice(0, 5)
          .map((o) => `F${o.rowIndex}: ${formatStatNumber(o.value)}`)
          .join(", ");
        return [
          c.name,
          String(s.outliers.length),
          formatStatNumber(s.lowerFence),
          formatStatNumber(s.upperFence),
          s.outliers.length > 5 ? `${sampleOut} (+${s.outliers.length - 5})` : sampleOut,
        ];
      }),
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 2, textColor: slateDark },
      headStyles: { fillColor: purplePrimary, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 248, 252] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
  }

  // Section 6: Trends and Conclusions
  drawSectionHeading(
    "6. Análisis de Tendencias y Conclusiones",
    expertAnalysis
      ? "Síntesis generada por el módulo de analista experto y hallazgos estadísticos."
      : "Hallazgos estadísticos automáticos derivados de las distribuciones y correlaciones."
  );

  if (expertAnalysis) {
    ensureSpace(22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...purplePrimary);
    doc.text("Resumen Ejecutivo", margin, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slateDark);
    const execLines = doc.splitTextToSize(expertAnalysis.resumenEjecutivo, contentWidth);
    doc.text(execLines, margin, y);
    y += execLines.length * 4.3 + 4;

    const blocks: Array<{ heading: string; items: string[] }> = [
      { heading: "Tendencias Principales", items: expertAnalysis.tendenciasPrincipales },
      { heading: "Relaciones y Anomalías", items: expertAnalysis.relacionesYAnomalias },
      { heading: "Calidad de Datos y Recomendaciones", items: expertAnalysis.calidadYRecomendaciones },
    ];

    for (const block of blocks) {
      if (block.items.length === 0) continue;
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...purplePrimary);
      doc.text(block.heading, margin, y);
      y += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      doc.setTextColor(...slateDark);
      for (const item of block.items) {
        const wrapped = doc.splitTextToSize(`• ${item}`, contentWidth - 2);
        ensureSpace(wrapped.length * 4.2 + 2);
        doc.text(wrapped, margin + 2, y);
        y += wrapped.length * 4.2 + 1.5;
      }
      y += 3;
    }
  } else {
    for (const ins of dataset.autoInsights) {
      const wrapped = doc.splitTextToSize(`• ${ins.title}: ${ins.detail}`, contentWidth - 2);
      ensureSpace(wrapped.length * 4.2 + 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      doc.setTextColor(...slateDark);
      doc.text(wrapped, margin + 2, y);
      y += wrapped.length * 4.2 + 2;
    }
  }

  // Page numbering footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text(
      `LuminaEDA · Informe Estadístico · Página ${i} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" }
    );
  }

  const baseName = dataset.fileName.replace(/\.[^/.]+$/, "");
  doc.save(`${baseName}_informe_eda.pdf`);
}

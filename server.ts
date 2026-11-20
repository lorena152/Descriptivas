import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "2mb" }));

interface AnalyzeRequestBody {
  fileName: string;
  rowCount: number;
  colCount: number;
  totalMissingPct: number;
  columns: Array<{
    name: string;
    type: string;
    missingCount: number;
    missingPct: number;
    uniqueCount: number;
    numericStats?: {
      mean: number;
      median: number;
      modeLabel: string;
      stdDev: number;
      min: number;
      max: number;
      q1: number;
      q3: number;
      skewness: number;
      outlierCount: number;
    };
    categoricalStats?: {
      mode: string;
      modeCount: number;
      topValues: Array<{ value: string; count: number; pct: number }>;
    };
    dateStats?: {
      minDate: string;
      maxDate: string;
      spanDays: number;
    };
  }>;
  correlations: Array<{
    colA: string;
    colB: string;
    r: number;
  }>;
  sampleRows: Array<Record<string, unknown>>;
}

app.post("/api/analyze", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        "No se encontró la clave GEMINI_API_KEY en el entorno del servidor. Configúrala en Settings > Secrets para generar el análisis con IA.",
    });
    return;
  }

  const payload = req.body as AnalyzeRequestBody | undefined;
  if (!payload || !payload.fileName || !Array.isArray(payload.columns)) {
    res.status(400).json({
      error: "Solicitud inválida: faltan los metadatos estadísticos del dataset.",
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const compactProfile = {
      archivo: payload.fileName,
      registros: payload.rowCount,
      variables: payload.colCount,
      porcentajeDatosFaltantesGlobal: Number(payload.totalMissingPct.toFixed(2)),
      variablesDetalle: payload.columns.slice(0, 30),
      correlacionesRelevantes: payload.correlations.slice(0, 12),
      primerasTresFilas: payload.sampleRows.slice(0, 3),
    };

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analiza el siguiente perfil estadístico descriptivo de un conjunto de datos reales y redacta un informe de tendencias y conclusiones en español con rigor de analista de datos senior.\n\nPerfil del dataset:\n${JSON.stringify(compactProfile, null, 2)}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          "Eres un científico de datos y analista estadístico senior. Redacta en español claro, preciso, objetivo y profesional. Basa todas tus afirmaciones exclusivamente en las cifras proporcionadas (medias, medianas, desviaciones estándar, asimetría, valores atípicos, correlaciones de Pearson y datos faltantes). Evita generalidades vacías; cita nombres exactos de variables y métricas concretas.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumenEjecutivo: {
              type: Type.STRING,
              description:
                "Párrafo ejecutivo de 3 a 4 oraciones sintetizando la naturaleza del dataset, su calidad y el hallazgo central.",
            },
            tendenciasPrincipales: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Lista de 3 a 5 conclusiones clave sobre distribuciones, concentración de categorías, tendencias centrales y dispersión.",
            },
            relacionesYAnomalias: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Lista de 2 a 4 observaciones sobre correlaciones entre variables numéricas, asimetrías y valores atípicos detectados.",
            },
            calidadYRecomendaciones: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Lista de 2 a 4 recomendaciones accionables sobre tratamiento de datos faltantes, outliers o próximos análisis.",
            },
          },
          required: [
            "resumenEjecutivo",
            "tendenciasPrincipales",
            "relacionesYAnomalias",
            "calidadYRecomendaciones",
          ],
        },
      },
    });

    const rawText = (response.text ?? "{}").trim();
    const parsed = JSON.parse(rawText);

    res.json({
      ...parsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Error inesperado al comunicarse con el servicio de análisis.";
    console.error("Error en /api/analyze:", err);
    res.status(502).json({
      error: `No se pudo completar el análisis experto: ${message}`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();

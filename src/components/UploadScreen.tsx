import React, { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Database,
  FileSpreadsheet,
  FileText,
  Upload,
} from "lucide-react";
import { SAMPLE_DATASETS, SampleDatasetDescriptor } from "../utils/parser";

interface UploadScreenProps {
  onFileSelected: (file: File) => Promise<void>;
  onSampleSelected: (sample: SampleDatasetDescriptor) => void;
  isLoading: boolean;
  error: string | null;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onFileSelected,
  onSampleSelected,
  isLoading,
  error,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void onFileSelected(files[0]);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 py-10 px-6">
      <div className="space-y-3 text-center">
        <p className="text-xs font-medium tracking-wide text-[#6D28D9]">
          Exploración estadística y visualización interactiva
        </p>
        <h1 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-[#171526] sm:text-4xl [text-wrap:balance]">
          Convierte tus bases de datos en análisis claros y reportes ejecutivos
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-[#5B5B73]">
          Carga archivos en formato CSV, Excel, TXT, TSV o JSON. La plataforma
          detecta variables, calcula estadística descriptiva, identifica valores
          atípicos y genera un informe PDF listo para compartir.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border bg-white px-8 py-12 text-center transition-colors ${
          isDragging
            ? "border-[#6D28D9] bg-[#F5F3FF]"
            : "border-[#E4E2F0] hover:border-[#C4B5FD]"
        }`}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#F3EFFE] text-[#6D28D9]">
          <Upload className="h-6 w-6" />
        </div>

        <h2 className="text-base font-semibold text-[#171526]">
          Arrastra tu archivo aquí o selecciónalo desde tu equipo
        </h2>
        <p className="mt-1.5 text-xs text-[#5B5B73]">
          Formatos compatibles: CSV · Excel (.xlsx, .xls) · TXT / TSV · JSON
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.xlsm,.ods,.txt,.tsv,.dat,.json"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#6D28D9] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5B21B6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isLoading ? "Procesando archivo…" : "Seleccionar archivo"}
        </button>

        {error && (
          <div
            role="alert"
            className="mt-5 flex max-w-lg items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-left text-xs text-[#991B1B]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Sample datasets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E5F2] pb-2.5">
          <h3 className="text-sm font-semibold text-[#171526]">
            O prueba al instante con un dataset de ejemplo
          </h3>
          <span className="text-xs text-[#6B6882]">Carga inmediata</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SAMPLE_DATASETS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onSampleSelected(sample)}
              className="group flex items-start justify-between gap-4 rounded-xl border border-[#E4E2F0] bg-white p-5 text-left transition-colors hover:border-[#A78BFA] hover:bg-[#FCFBFF] focus-visible:outline-2 focus-visible:outline-[#6D28D9] cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#6D28D9]">
                  {sample.id === "retail" ? (
                    <FileSpreadsheet className="h-4 w-4" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  <span className="font-mono text-[11px]">{sample.fileName}</span>
                </div>
                <div className="text-sm font-semibold text-[#171526]">
                  {sample.name}
                </div>
                <p className="text-xs leading-relaxed text-[#5B5B73]">
                  {sample.subtitle}
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#8D89A6] transition-transform group-hover:translate-x-0.5 group-hover:text-[#6D28D9]" />
            </button>
          ))}
        </div>
      </div>

      {/* Capability summary */}
      <div className="grid grid-cols-1 gap-6 border-t border-[#E7E5F2] pt-6 text-xs text-[#5B5B73] sm:grid-cols-3">
        <div className="flex items-start gap-2.5">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9]" />
          <div>
            <p className="font-semibold text-[#171526]">Diagnóstico automático</p>
            <p className="mt-0.5">
              Conteo de registros, vista previa de 3 filas, tipificación y datos
              faltantes.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9]" />
          <div>
            <p className="font-semibold text-[#171526]">Gráficos y BoxPlot</p>
            <p className="mt-0.5">
              Histogramas, barras, líneas, dispersión X/Y y detección de valores
              atípicos.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9]" />
          <div>
            <p className="font-semibold text-[#171526]">Conclusiones y PDF</p>
            <p className="mt-0.5">
              Análisis experto de tendencias y exportación directa a informe PDF.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

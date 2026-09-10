import type { DragEvent } from "react";
import { Upload } from "lucide-react";
import { CLIENT_MAX_BYTES, formatBytes } from "@/lib/compression/limits";
import type { SelectedFile } from "@/lib/compression/file-controller";
import { cn } from "@/lib/utils";

type Props = {
  inputId: string;
  errorId?: string;
  dragging: boolean;
  setDragging(value: boolean): void;
  onDrop(event: DragEvent): void;
  mode: "compress" | "decompress";
  acceptsMany: boolean;
  onSelect(files: FileList | null): void;
  files: SelectedFile[];
  language: "pt" | "en";
};

export function FileInput({ inputId, errorId, dragging, setDragging, onDrop, mode, acceptsMany, onSelect, files, language }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <label
        htmlFor={inputId}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => {
          // Só sai do estado quando o ponteiro deixa a área inteira, não ao
          // cruzar a fronteira de um filho.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed bg-surface-raised px-4 py-10 text-center transition-colors hover:border-accent hover:bg-surface",
          dragging ? "border-accent bg-surface" : "border-border-interactive",
        )}
      >
        <Upload aria-hidden className={cn("size-5", dragging ? "text-accent-text" : "text-text-muted")} />
        <span className="text-sm text-text">
          {dragging
            ? (language === "pt" ? "Solte para começar" : "Drop to start")
            : mode === "compress"
            ? (language === "pt" ? "Arraste os arquivos aqui ou clique para escolher" : "Drag files here or click to choose")
            : (language === "pt" ? "Arraste o arquivo aqui ou clique para escolher" : "Drag an archive here or click to choose")}
        </span>
        <span className="text-xs text-text-muted">
          {acceptsMany
            ? (language === "pt" ? "Vários arquivos podem ser selecionados de uma vez." : "You can select several files at once.")
            : (language === "pt" ? "Um arquivo por vez." : "One file at a time.")}
        </span>
        {mode === "decompress" ? (
          <span className="max-w-lg text-xs text-text-muted">
            {language === "pt"
              ? <>ZIP, GZIP e TAR rodam localmente até {formatBytes(CLIENT_MAX_BYTES)}. ZSTD, RAR e 7Z usam o servidor.</>
              : <>ZIP, GZIP, and TAR run locally up to {formatBytes(CLIENT_MAX_BYTES)}. ZSTD, RAR, and 7Z use the server.</>}
          </span>
        ) : null}
      </label>

      <input
        id={inputId}
        type="file"
        multiple={acceptsMany}
        onChange={(event) => { onSelect(event.target.files); event.target.value = ""; }}
        className="sr-only"
        aria-describedby={errorId}
      />

      {files.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {files.map((file) => (
            <li key={file.name} className="bullet-arrow flex justify-between gap-4 text-text">
              <span className="truncate">{file.name}</span>
              <span className="tabular shrink-0 text-text-muted">{formatBytes(file.size)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

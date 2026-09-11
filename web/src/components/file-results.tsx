import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Archive } from "@/lib/compression/codecs";
import type { FileResult } from "@/lib/compression/file-controller";
import { FORMATS } from "@/lib/compression/formats";
import { formatBytes } from "@/lib/compression/limits";
import { message } from "@/lib/messages";

type Props = {
  archive?: Archive;
  result?: FileResult;
  busy: boolean;
  mode: "compress" | "decompress";
  totalSize: number;
  language: "pt" | "en";
  onExtract(entryName?: string): void;
  onDownload(): void;
};

export function FileResults({ archive, result, busy, mode, totalSize, language, onExtract, onDownload }: Props) {
  return (
    <>
      {archive ? (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">
            {message(language, "ui.contents")} ({FORMATS[archive.format].label})
          </h2>

          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {archive.entries.map((entry) => (
              <li
                key={entry.name}
                className="flex flex-wrap items-center justify-between gap-3 bg-surface px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-text">
                  {entry.name}
                </span>
                <span className="tabular shrink-0 text-xs text-text-muted">
                  {formatBytes(entry.size)}
                  {entry.compressedSize !== undefined
                    ? message(language, "ui.compressedSize", { size: formatBytes(entry.compressedSize) })
                    : ""}
                </span>
                {entry.directory ? (
                  <span className="text-xs text-text-muted">{message(language, "ui.folder")}</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExtract(archive.single ? undefined : entry.name)}
                    disabled={busy}
                  >
                    {message(language, "ui.extract")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result ? (
        <section className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button variant="primary" size="md" onClick={onDownload}>
            <Download aria-hidden />
            <span>{message(language, "ui.download")} {result.name}</span>
          </Button>
          <p className="tabular text-xs text-text-muted">
            {formatBytes(result.bytes.length)}
            {mode === "compress" && totalSize > 0
              ? message(language, "ui.originalPercent", { percent: Math.round((result.bytes.length / totalSize) * 100) })
              : ""}
          </p>
        </section>
      ) : null}
    </>
  );
}

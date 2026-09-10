import { FORMATS, type FormatId } from "./formats.ts";

/**
 * Scripts Python para rodar a mesma operação fora daqui.
 *
 * O toolbox roda no navegador e tem teto de tamanho; um arquivo de 4 GB, uma
 * pasta inteira ou um pipeline que precisa repetir a operação toda semana não
 * cabem nessa tela. O script é a saída honesta: o mesmo formato, o mesmo
 * nível, na máquina de quem pediu, sem passar por lugar nenhum.
 *
 * São dados puros — string, não execução. Nada aqui roda: o texto é copiado.
 */

export type ScriptMode = "compress" | "decompress";
export type ScriptLanguage = "pt" | "en";

export type PythonScript = {
  /** Nome sugerido para salvar o arquivo. */
  filename: string;
  /** A linha de comando, já com o nome do arquivo salvo. */
  usage: string;
  /** Dependência externa, quando a biblioteca padrão não cobre o formato. */
  requires?: string;
  /** Versão mínima do Python, quando o script depende de algo recente. */
  minPython?: string;
  code: string;
};

const HEADER = "#!/usr/bin/env python3";

/** O bloco `main` é o mesmo em todos: só muda a linha de uso. */
function entrypoint(): string {
  return 'if __name__ == "__main__":\n    main(sys.argv[1:])';
}

function usageLine(filename: string, args: string): string {
  return `uso: python3 ${filename} ${args}`;
}

// ---------------------------------------------------------------------------
// Compactar
// ---------------------------------------------------------------------------

function compressScript(
  format: FormatId,
  level: number,
  language: ScriptLanguage,
): PythonScript {
  const pt = language === "pt";
  const filename = pt ? `compactar_${format}.py` : `compress_${format}.py`;

  if (format === "zip") {
    const args = pt ? "arquivo [arquivo...]" : "file [file...]";
    return {
      filename,
      usage: `python3 ${filename} notas.txt fotos/`,
      code: `${HEADER}
"""${pt ? `Compacta arquivos e pastas em ZIP, nível ${level}.` : `Compress files and folders into ZIP, level ${level}.`}"""
import sys
import zipfile
from pathlib import Path

LEVEL = ${level}


def add(archive: zipfile.ZipFile, path: Path) -> None:
    if path.is_dir():
        for item in sorted(path.rglob("*")):
            if item.is_file():
                archive.write(item, item.relative_to(path.parent))
    else:
        archive.write(path, path.name)


def main(paths: list[str]) -> None:
    if not paths:
        sys.exit("${usageLine(filename, args)}")
    output = Path(paths[0]).with_suffix(".zip")
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=LEVEL) as archive:
        for path in paths:
            add(archive, Path(path))
    print(output)


${entrypoint()}
`,
    };
  }

  if (format === "tar") {
    const args = pt ? "arquivo [arquivo...]" : "file [file...]";
    return {
      filename,
      usage: `python3 ${filename} notas.txt fotos/`,
      code: `${HEADER}
"""${pt ? "Junta arquivos e pastas em um TAR. TAR não comprime: só empacota." : "Bundle files and folders into a TAR. TAR does not compress: it only packs."}"""
import sys
import tarfile
from pathlib import Path


def main(paths: list[str]) -> None:
    if not paths:
        sys.exit("${usageLine(filename, args)}")
    output = Path(paths[0]).with_suffix(".tar")
    with tarfile.open(output, "w") as archive:
        for path in paths:
            archive.add(path, arcname=Path(path).name)
    print(output)


${entrypoint()}
`,
    };
  }

  if (format === "gzip") {
    const args = pt ? "arquivo" : "file";
    return {
      filename,
      usage: `python3 ${filename} dump.sql`,
      code: `${HEADER}
"""${pt ? `Compacta um arquivo em GZIP, nível ${level}. Um arquivo por vez.` : `Compress one file into GZIP, level ${level}. One file at a time.`}"""
import gzip
import shutil
import sys
from pathlib import Path

LEVEL = ${level}


def main(paths: list[str]) -> None:
    if not paths:
        sys.exit("${usageLine(filename, args)}")
    source = Path(paths[0])
    output = source.with_name(source.name + ".gz")
    # ${pt ? "Copia em blocos: a memória usada não cresce com o tamanho do arquivo." : "Copies in chunks: memory use does not grow with the file size."}
    with source.open("rb") as raw, gzip.open(output, "wb", compresslevel=LEVEL) as compressed:
        shutil.copyfileobj(raw, compressed)
    print(output)


${entrypoint()}
`,
    };
  }

  const args = pt ? "arquivo" : "file";
  return {
    filename,
    usage: `python3 ${filename} dump.sql`,
    requires: pt ? "pip install zstandard" : "pip install zstandard",
    code: `${HEADER}
"""${pt ? `Compacta um arquivo em ZSTD, nível ${level}. Um arquivo por vez.` : `Compress one file into ZSTD, level ${level}. One file at a time.`}"""
import sys
from pathlib import Path

import zstandard

LEVEL = ${level}


def main(paths: list[str]) -> None:
    if not paths:
        sys.exit("${usageLine(filename, args)}")
    source = Path(paths[0])
    output = source.with_name(source.name + ".zst")
    compressor = zstandard.ZstdCompressor(level=LEVEL)
    # ${pt ? "Fluxo, não buffer: vale para arquivos maiores que a memória." : "Streamed, not buffered: works for files larger than memory."}
    with source.open("rb") as raw, output.open("wb") as compressed:
        compressor.copy_stream(raw, compressed)
    print(output)


${entrypoint()}
`,
  };
}

// ---------------------------------------------------------------------------
// Descompactar
// ---------------------------------------------------------------------------

function decompressScript(format: FormatId, language: ScriptLanguage): PythonScript {
  const pt = language === "pt";
  const filename = pt ? `descompactar_${format}.py` : `extract_${format}.py`;
  const args = pt ? `arquivo${FORMATS[format].extension} [destino]` : `file${FORMATS[format].extension} [target]`;
  const example = `python3 ${filename} backup${FORMATS[format].extension}`;

  /** O preâmbulo é igual em todos: origem, destino opcional, e nada mais. */
  const resolve = `    if not paths:
        sys.exit("${usageLine(filename, args)}")
    source = Path(paths[0])
    target = Path(paths[1]) if len(paths) > 1 else source.with_suffix("")`;

  if (format === "zip") {
    return {
      filename,
      usage: example,
      code: `${HEADER}
"""${pt ? "Extrai um ZIP para uma pasta." : "Extract a ZIP into a folder."}"""
import sys
import zipfile
from pathlib import Path


def main(paths: list[str]) -> None:
${resolve}
    with zipfile.ZipFile(source) as archive:
        # ${pt ? "extractall normaliza o caminho de cada entrada: nada escapa do destino." : "extractall normalizes every entry path: nothing escapes the target."}
        archive.extractall(target)
    print(target)


${entrypoint()}
`,
    };
  }

  if (format === "tar") {
    return {
      filename,
      usage: example,
      minPython: "3.12",
      code: `${HEADER}
"""${pt ? "Extrai um TAR para uma pasta." : "Extract a TAR into a folder."}"""
import sys
import tarfile
from pathlib import Path


def main(paths: list[str]) -> None:
${resolve}
    with tarfile.open(source) as archive:
        # ${pt ? 'filter="data" recusa caminho absoluto, ".." e link para fora do destino.' : 'filter="data" rejects absolute paths, "..", and links outside the target.'}
        archive.extractall(target, filter="data")
    print(target)


${entrypoint()}
`,
    };
  }

  if (format === "gzip") {
    return {
      filename,
      usage: example,
      code: `${HEADER}
"""${pt ? "Descompacta um GZIP. Um arquivo dentro, um arquivo fora." : "Decompress a GZIP. One file in, one file out."}"""
import gzip
import shutil
import sys
from pathlib import Path


def main(paths: list[str]) -> None:
${resolve}
    # ${pt ? "Copia em blocos: a memória usada não cresce com o tamanho do arquivo." : "Copies in chunks: memory use does not grow with the file size."}
    with gzip.open(source, "rb") as compressed, target.open("wb") as raw:
        shutil.copyfileobj(compressed, raw)
    print(target)


${entrypoint()}
`,
    };
  }

  if (format === "zstd") {
    return {
      filename,
      usage: example,
      requires: "pip install zstandard",
      code: `${HEADER}
"""${pt ? "Descompacta um ZSTD. Um arquivo dentro, um arquivo fora." : "Decompress a ZSTD. One file in, one file out."}"""
import sys
from pathlib import Path

import zstandard


def main(paths: list[str]) -> None:
${resolve}
    decompressor = zstandard.ZstdDecompressor()
    # ${pt ? "Fluxo, não buffer: vale para arquivos maiores que a memória." : "Streamed, not buffered: works for files larger than memory."}
    with source.open("rb") as compressed, target.open("wb") as raw:
        decompressor.copy_stream(compressed, raw)
    print(target)


${entrypoint()}
`,
    };
  }

  if (format === "rar") {
    return {
      filename,
      usage: example,
      requires: pt
        ? "pip install rarfile — e o executável unrar ou bsdtar no PATH"
        : "pip install rarfile — plus the unrar or bsdtar binary on your PATH",
      code: `${HEADER}
"""${pt ? "Extrai um RAR para uma pasta. Só leitura: não existe encoder RAR livre." : "Extract a RAR into a folder. Read only: there is no free RAR encoder."}"""
import sys
from pathlib import Path

import rarfile


def main(paths: list[str]) -> None:
${resolve}
    with rarfile.RarFile(source) as archive:
        archive.extractall(target)
    print(target)


${entrypoint()}
`,
    };
  }

  return {
    filename,
    usage: example,
    requires: "pip install py7zr",
    code: `${HEADER}
"""${pt ? "Extrai um 7Z para uma pasta." : "Extract a 7Z into a folder."}"""
import sys
from pathlib import Path

import py7zr


def main(paths: list[str]) -> None:
${resolve}
    with py7zr.SevenZipFile(source, "r") as archive:
        archive.extractall(target)
    print(target)


${entrypoint()}
`,
  };
}

/**
 * O script do formato e do sentido pedidos. O nível vem da tela: o script
 * copiado faz o que a tela faria, e não o que um padrão qualquer faria.
 */
export function pythonScript(
  format: FormatId,
  mode: ScriptMode,
  level: number,
  language: ScriptLanguage,
): PythonScript {
  return mode === "compress"
    ? compressScript(format, level, language)
    : decompressScript(format, language);
}

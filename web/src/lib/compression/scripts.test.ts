import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { COMPRESSIBLE_FORMATS, DECOMPRESSIBLE_FORMATS, type FormatId } from "./formats.ts";
import { pythonScript, type ScriptMode } from "./scripts.ts";

/**
 * O que esta feature entrega é código Python. Um script que não compila é pior
 * do que script nenhum — quem copiou confiou —, então quem verifica aqui é o
 * próprio interpretador, e não uma expectativa sobre a string.
 */
const python = (() => {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const cases: [FormatId, ScriptMode][] = [
  ...COMPRESSIBLE_FORMATS.map((format) => [format, "compress"] as [FormatId, ScriptMode]),
  ...DECOMPRESSIBLE_FORMATS.map((format) => [format, "decompress"] as [FormatId, ScriptMode]),
];

describe("scripts Python", () => {
  it("cobre todo formato que a tela oferece, nos dois sentidos", () => {
    expect(cases).toHaveLength(10);
    for (const [format, mode] of cases) {
      const script = pythonScript(format, mode, 6, "pt");
      expect(script.code.length, `${mode} ${format}`).toBeGreaterThan(200);
      expect(script.filename, `${mode} ${format}`).toContain(format);
    }
  });

  it.runIf(python)("gera Python sintaticamente válido em todos os casos", () => {
    const directory = mkdtempSync(join(tmpdir(), "toolbox-scripts-"));

    for (const [format, mode] of cases) {
      for (const language of ["pt", "en"] as const) {
        const script = pythonScript(format, mode, 6, language);
        const path = join(directory, `${language}_${mode}_${format.replace("7z", "sevenz")}.py`);
        writeFileSync(path, script.code);
        expect(() => execFileSync("python3", ["-m", "py_compile", path], { stdio: "pipe" }),
          `${language}/${mode}/${format}`).not.toThrow();
      }
    }
  });

  it("leva o nível da tela para dentro do script", () => {
    expect(pythonScript("zip", "compress", 9, "pt").code).toContain("LEVEL = 9");
    expect(pythonScript("zstd", "compress", 19, "pt").code).toContain("LEVEL = 19");
    // TAR não comprime: não há nível para levar.
    expect(pythonScript("tar", "compress", 6, "pt").code).not.toContain("LEVEL");
  });

  it("declara a dependência dos formatos que a biblioteca padrão não cobre", () => {
    expect(pythonScript("zstd", "compress", 3, "pt").requires).toContain("zstandard");
    expect(pythonScript("rar", "decompress", 0, "pt").requires).toContain("rarfile");
    expect(pythonScript("7z", "decompress", 0, "pt").requires).toContain("py7zr");
    // Estes são biblioteca padrão: pedir instalação seria mentira.
    expect(pythonScript("zip", "compress", 6, "pt").requires).toBeUndefined();
    expect(pythonScript("gzip", "decompress", 0, "pt").requires).toBeUndefined();
    expect(pythonScript("tar", "decompress", 0, "pt").requires).toBeUndefined();
  });

  it("mostra a linha de uso com o nome do arquivo que manda salvar", () => {
    for (const [format, mode] of cases) {
      const script = pythonScript(format, mode, 6, "pt");
      expect(script.usage, `${mode} ${format}`).toContain(script.filename);
      expect(script.code, `${mode} ${format}`).toContain(`uso: python3 ${script.filename}`);
    }
  });

  it("traduz a mensagem de uso junto com o resto", () => {
    const english = pythonScript("zip", "compress", 6, "en");
    expect(english.filename).toBe("compress_zip.py");
    expect(english.code).toContain("Compress files and folders into ZIP");
  });
});

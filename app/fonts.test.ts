import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// NEU-176: o build baixava as fontes do Google e caía quando a rede falhava.
// Estes testes garantem que nada volta a depender disso e que o CSS aponta só
// para arquivos que existem no repo.

const root = process.cwd();
const fontsCss = readFileSync(join(root, "app/fonts.css"), "utf8");
const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(e.name) ? [path] : [];
  });
}

describe("fontes do próprio repo", () => {
  it("nenhum arquivo usa next/font/google nem o CDN do Google Fonts", () => {
    const offenders = ["app", "components", "lib"]
      .flatMap(sourceFiles)
      .filter((f) =>
        /from\s+["']next\/font\/google["']|https?:\/\/fonts\.(googleapis|gstatic)\.com/.test(
          readFileSync(join(root, f), "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });

  it("todo arquivo citado em fonts.css existe em public/fonts", () => {
    const urls = [...fontsCss.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(existsSync(join(root, "public", url)), url).toBe(true);
    }
  });

  it("as três famílias têm a face Fallback, que evita o salto do texto ao trocar a fonte", () => {
    for (const family of ["Space Grotesk", "Inter", "JetBrains Mono"]) {
      expect(fontsCss).toContain(`font-family: "${family} Fallback"`);
      expect(fontsCss).toMatch(new RegExp(`--font-[a-z-]+: "${family}", "${family} Fallback"`));
    }
  });

  it("o layout pré-carrega só arquivos que existem", () => {
    const preloaded = [...layout.matchAll(/"(\/fonts\/[^"]+\.woff2)"/g)].map((m) => m[1]);
    expect(preloaded).toHaveLength(3);
    for (const href of preloaded) {
      expect(existsSync(join(root, "public", href)), href).toBe(true);
    }
  });
});

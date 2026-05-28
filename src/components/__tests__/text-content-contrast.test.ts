import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static contrast guard for text content dialogs.
 *
 * Estes diálogos têm fundo branco/claro (glassmorphism com !bg-white) e já
 * regrediram várias vezes para texto branco sobre branco. Este teste
 * trava os padrões obrigatórios para que regressões falhem no CI antes
 * de chegarem ao preview.
 *
 * Ver docs/CONTRAST_CHECKLIST.md para a versão humana.
 */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("text content dialogs — contrast guards", () => {
  const createDlg = read("src/components/CreateTextContentDialog.tsx");
  const detailDlg = read("src/components/TextContentDetailDialog.tsx");

  describe("CreateTextContentDialog — client preview", () => {
    it("force-blacks the preview DialogContent", () => {
      expect(createDlg).toMatch(/!bg-white[^"]*!text-black/);
    });

    it("force-blacks the preview title", () => {
      // Título do preview deve ter !text-black explícito
      expect(createDlg).toMatch(/!text-black[^"]*">\{title \|\| "Sem título"\}/);
    });

    it("force-blacks the preview subtitle", () => {
      // Subtítulo deve usar !text-black/70 (com !) — text-black/70 puro
      // foi sobrescrito por estilos pai no passado.
      expect(createDlg).toMatch(/!text-black\/70[^"]*">\{subtitle\}/);
    });

    it("force-blacks the prose article and its descendants", () => {
      expect(createDlg).toMatch(/!text-black \[&_\*\]:!text-black/);
    });

    it("forces a visible link color inside the prose article", () => {
      expect(createDlg).toMatch(/\[&_a\]:!text-blue-600/);
    });

    it("never uses text-white inside the preview block", () => {
      // Recorta apenas o JSX do Dialog de preview do cliente
      const previewStart = createDlg.indexOf("<Dialog open={previewOpen}");
      const previewEnd = createDlg.indexOf("</Dialog>", previewStart);
      expect(previewStart).toBeGreaterThan(-1);
      const sliced = createDlg.slice(previewStart, previewEnd);
      expect(sliced).not.toMatch(/\btext-white\b/);
      // Tons cinza claros (gray-100/200/300) também não passam contraste
      // sobre branco para texto principal.
      expect(sliced).not.toMatch(/\btext-gray-[123]00\b/);
    });
  });

  describe("TextContentDetailDialog — reader view", () => {
    it("uses semantic foreground tokens for the article body", () => {
      // O leitor usa bg-card + text-foreground (suporta light/dark)
      expect(detailDlg).toMatch(/bg-card/);
      expect(detailDlg).toMatch(/text-(card-)?foreground/);
    });

    it("inverts prose in dark mode", () => {
      expect(detailDlg).toMatch(/dark:prose-invert/);
    });

    it("forces primary color on links inside prose", () => {
      expect(detailDlg).toMatch(/\[&_a\]:!text-primary/);
    });

    it("comment textarea uses solid background + foreground text", () => {
      expect(detailDlg).toMatch(/bg-background[^"]*text-foreground|text-foreground[^"]*bg-background/);
    });

    it("does not leak text-white onto white-ish surfaces", () => {
      // Permitido apenas em botões com bg explícito; aqui garantimos que
      // nenhum bloco de texto principal use text-white.
      const offenders = [
        /<p[^>]*\btext-white\b/g,
        /<article[^>]*\btext-white\b/g,
        /<h[1-6][^>]*\btext-white\b/g,
      ];
      for (const re of offenders) {
        expect(detailDlg).not.toMatch(re);
      }
    });
  });

  describe("checklist documentation", () => {
    it("ships the contrast checklist doc", () => {
      const doc = read("docs/CONTRAST_CHECKLIST.md");
      expect(doc).toMatch(/Contrast & Legibility Checklist/);
      expect(doc).toMatch(/Estados a validar/);
    });
  });
});

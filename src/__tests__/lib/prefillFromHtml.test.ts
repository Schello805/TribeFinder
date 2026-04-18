import { describe, expect, test } from "vitest";
import { extractPrefillFromHtml } from "@/lib/prefillFromHtml";

describe("extractPrefillFromHtml", () => {
  test("prefers brand-like name and extracts readable body text", () => {
    const html = `
      <!doctype html>
      <html lang="de">
        <head>
          <title>Ahmena Mara,Regensburg - Orientalischer Tanz Regensburg - AnimaDea</title>
          <meta property="og:site_name" content="AnimaDea" />
          <meta property="og:title" content="Ahmena Mara,Regensburg - Orientalischer Tanz Regensburg - AnimaDea" />
          <meta name="description" content="Kommen Sie mich doch mal in meine(m) Atelier besuchen!" />
        </head>
        <body>
          <nav>AKTUELLES ANIMADEA AHMENA MARA LINKS KONTAKT IMPRESSUM &amp; DATENSCHUTZ</nav>
          <main>
            <h1>ANIMADEA TRIBAL STYLE DANCE</h1>
            <p>Der Tribal Stamm AnimaDea ist ein Vorreiter für Tribal Style Dance in Regensburg.</p>
            <p>Der Ursprung von AnimaDea liegt in der Gründung einer Tribal Tanzgruppe von 2009.</p>
          </main>
          <footer>Impressum &amp; Datenschutz</footer>
        </body>
      </html>
    `;

    const result = extractPrefillFromHtml(html, new URL("https://www.animadea.de/animadea/"));
    expect(result.name).toBe("AnimaDea");
    expect(result.description).toContain("Vorreiter");
    expect(result.description).toContain("Regensburg");
    expect(result.description).not.toContain("AKTUELLES");
  });
});


import { readFile } from "fs/promises";
import path from "path";
import fs from "node:fs";
import Link from "next/link";
import type { ReactNode } from "react";

function resolveProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const hasPackageJson = fs.existsSync(path.join(dir, "package.json"));
    const hasChangelog = fs.existsSync(path.join(dir, "CHANGELOG.md"));
    if (hasPackageJson && hasChangelog) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function formatSectionTitle(rawTitle: string) {
  const title = rawTitle.replace(/\uFFFD/g, "").trim();

  const m = title.match(/^\[(.+?)\]\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/);
  if (m) {
    return `${m[2]} · ${m[1]}`;
  }

  return title;
}

function renderChangelogBody(body: string) {
  const lines = (body || "").split("\n");
  const elements: ReactNode[] = [];

  let inCode = false;
  let codeLang: string | null = null;
  let codeLines: string[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").trim();
    if (text.length > 0) {
      elements.push(
        <p key={`p-${elements.length}`} className="text-sm leading-6 text-[var(--foreground)]">
          {text}
        </p>
      );
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 text-sm leading-6 text-[var(--foreground)]">
          {listItems.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      );
    }
    listItems = [];
  };

  const flushCode = () => {
    const text = codeLines.join("\n").replace(/\s+$/g, "");
    if (text.length > 0) {
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs leading-5 text-[var(--foreground)]"
        >
          <code className={codeLang ? `language-${codeLang}` : undefined}>{text}</code>
        </pre>
      );
    }
    codeLines = [];
    codeLang = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\uFFFD/g, "");

    const fence = line.match(/^```\s*(\w+)?\s*$/);
    if (fence) {
      if (!inCode) {
        flushParagraph();
        flushList();
        inCode = true;
        codeLang = fence[1] ?? null;
        continue;
      }
      inCode = false;
      flushCode();
      continue;
    }

    if (inCode) {
      codeLines.push(raw);
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flushParagraph();
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="tf-display text-base font-semibold text-[var(--foreground)] mt-4">
          {h3[1].trim()}
        </h3>
      );
      continue;
    }

    const h4 = line.match(/^####\s+(.+)$/);
    if (h4) {
      flushParagraph();
      flushList();
      elements.push(
        <h4 key={`h4-${elements.length}`} className="text-sm font-semibold text-[var(--foreground)] mt-3">
          {h4[1].trim()}
        </h4>
      );
      continue;
    }

    const li = line.match(/^\s*-\s+(.+)$/);
    if (li) {
      flushParagraph();
      listItems.push(li[1].trim());
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    paragraphLines.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (inCode) flushCode();

  if (elements.length === 0) {
    return <div className="text-sm text-[var(--muted)]">–</div>;
  }

  return <div className="space-y-3">{elements}</div>;
}

export default async function ChangelogPage() {
  let changelog = "";
  try {
    changelog = await readFile(path.join(resolveProjectRoot(), "CHANGELOG.md"), "utf8");
  } catch {
    changelog = "Changelog konnte nicht geladen werden.";
  }

  const lines = changelog.split("\n");
  const sections: Array<{ title: string; body: string }> = [];
  let current: { title: string; bodyLines: string[] } | null = null;
  for (const line of lines) {
    const isH2 = line.startsWith("## ");
    if (isH2) {
      if (current) {
        sections.push({ title: current.title, body: current.bodyLines.join("\n").trim() });
      }
      current = { title: line.replace(/^##\s+/, "").trim(), bodyLines: [] };
      continue;
    }
    if (!current) {
      current = { title: "Allgemein", bodyLines: [] };
    }
    current.bodyLines.push(line);
  }
  if (current) {
    sections.push({ title: current.title, body: current.bodyLines.join("\n").trim() });
  }

  const stripInstallSection = (body: string) => {
    const bodyLines = body.split("\n");
    const out: string[] = [];
    let skipping = false;
    for (const line of bodyLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("###") && /(installation|setup)/i.test(trimmed)) {
        skipping = true;
        continue;
      }
      if (skipping) {
        if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
          skipping = false;
        } else {
          continue;
        }
      }
      out.push(line);
    }
    return out.join("\n").trim();
  };

  const cleanedSections = sections
    .map((s) => ({ ...s, body: stripInstallSection(s.body) }))
    .filter((s) => {
      const titleLower = s.title.toLowerCase();
      const isUnreleased = titleLower.includes("unreleased");
      if (!isUnreleased) return true;
      return (s.body || "").trim().length > 0;
    })
    .filter((s) => s.title.trim().toLowerCase() !== "installation");

  const sortedSections = cleanedSections.slice().reverse();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Changelog</h1>
          <div className="mt-1 text-sm text-[var(--muted)]">Änderungen & neue Features – neueste Einträge zuerst.</div>
        </div>
        <Link href="/" className="text-sm text-[var(--link)] hover:opacity-90">
          Zur Startseite
        </Link>
      </div>

      <div className="space-y-3">
        {sortedSections.map((s, idx) => (
          <details
            key={`${idx}-${s.title}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            open={idx === 0}
          >
            <summary className="cursor-pointer select-none px-6 py-4 text-[var(--foreground)] tf-display font-semibold">
              {formatSectionTitle(s.title)}
            </summary>
            <div className="px-6 pb-6">
              {renderChangelogBody(s.body)}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

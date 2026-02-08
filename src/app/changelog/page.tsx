import { readFile } from "fs/promises";
import path from "path";
import fs from "node:fs";
import Link from "next/link";

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
      if (line.trim().startsWith("###") && line.includes("Installation") && line.includes("Setup")) {
        skipping = true;
        continue;
      }
      if (skipping) {
        if (line.trim().startsWith("### ")) {
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
    });

  const sortedSections = cleanedSections.slice().reverse();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Changelog</h1>
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
              {s.title}
            </summary>
            <div className="px-6 pb-6">
              <pre className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">
                {s.body || "–"}
              </pre>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

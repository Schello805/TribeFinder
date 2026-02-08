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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Changelog</h1>
        <Link href="/" className="text-sm text-[var(--link)] hover:opacity-90">
          Zur Startseite
        </Link>
      </div>

      <pre className="whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--foreground)]">
        {changelog}
      </pre>
    </div>
  );
}

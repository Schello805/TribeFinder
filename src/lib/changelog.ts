export function formatChangelogSectionTitle(rawTitle: string) {
  const title = rawTitle.replace(/\uFFFD/g, "").trim();

  const m = title.match(/^\[(.+?)\]\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/);
  if (m) {
    const label = m[1].trim();
    if (label.toLowerCase() === "unreleased") {
      return m[2];
    }
    return `${m[2]} · ${label}`;
  }

  return title;
}

export function stripInstallSubsections(body: string) {
  const bodyLines = (body || "").split("\n");
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
}

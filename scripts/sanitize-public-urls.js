const fs = require("node:fs");

const envPath = process.argv[2] || ".env";

if (!fs.existsSync(envPath)) process.exit(0);

const normalizeOrigin = (rawValue, key) => {
  const unquoted = rawValue.trim().replace(/^["']+/, "").replace(/["']+$/, "").trim();
  if (!unquoted) return "";

  let parsed;
  try {
    parsed = new URL(unquoted);
  } catch {
    throw new Error(`${key} enthält keine gültige URL: ${unquoted}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${key} muss mit http:// oder https:// beginnen.`);
  }

  return parsed.origin;
};

const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
const indexes = new Map();

for (let index = 0; index < lines.length; index += 1) {
  const match = lines[index].match(/^(NEXTAUTH_URL|SITE_URL)=(.*)$/);
  if (match) indexes.set(match[1], { index, value: match[2] });
}

const nextAuthEntry = indexes.get("NEXTAUTH_URL");
if (!nextAuthEntry) process.exit(0);

try {
  const origin = normalizeOrigin(nextAuthEntry.value, "NEXTAUTH_URL");
  if (!origin) process.exit(0);

  let changed = false;
  const normalizedLine = `NEXTAUTH_URL="${origin}"`;
  if (lines[nextAuthEntry.index] !== normalizedLine) {
    lines[nextAuthEntry.index] = normalizedLine;
    changed = true;
  }

  const siteEntry = indexes.get("SITE_URL");
  const siteLine = `SITE_URL="${origin}"`;
  if (siteEntry) {
    if (lines[siteEntry.index] !== siteLine) {
      lines[siteEntry.index] = siteLine;
      changed = true;
    }
  } else {
    lines.push(siteLine);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(envPath, lines.join("\n"));
    console.log(`✓ Öffentliche Basis-URLs auf ${origin} normalisiert.`);
  }
} catch (error) {
  console.error(`Fehler in ${envPath}: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

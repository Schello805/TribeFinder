const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  for (const filename of [".env", ".env.local"]) {
    const envPath = path.join(process.cwd(), filename);
    if (!fs.existsSync(envPath)) continue;
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      while (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1).trim();
      }

      if (key === "DATABASE_URL") {
        process.env[key] = value;
      } else if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

if (!process.env.DATABASE_URL) {
  loadDotEnv();
}

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_DANCE_STYLES = [
  "Orientalischer Tanz",
  "Bauchtanz",
  "Oriental Fusion",
  "Tribal Fusion",
  "ATS / FCBD Style",
  "ITS",
  "Wüstenrosen ATS",
  "Tribal Style",
  "Fantasy",
  "Folklore (Orient)",
  "Drum Solo",
  "Fusion",
  "Baladi",
  "Saidi",
  "Shaabi",
  "Khaliji",
  "Dabke",
  "Modern Oriental",
  "Bollywood",
  "Flamenco Oriental",
  "Gothic Belly Dance",
  "Cabaret",
  "Raks Sharqi",
  "Turkish Oriental",
];

async function main() {
  console.log("🎭 Seeding dance styles...");

  let created = 0;
  let skipped = 0;

  for (const name of DEFAULT_DANCE_STYLES) {
    const existing = await prisma.danceStyle.findUnique({ where: { name }, select: { id: true } }).catch(() => null);
    if (existing?.id) {
      skipped++;
      continue;
    }

    await prisma.danceStyle.create({ data: { name } });
    console.log(`✓ ${name}`);
    created++;
  }

  const count = await prisma.danceStyle.count();
  console.log(`\n✅ ${created} neu erstellt, ${skipped} übersprungen`);
  console.log(`📊 Insgesamt ${count} Tanzstile in der Datenbank`);
}

main()
  .catch((e) => {
    console.error("❌ Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

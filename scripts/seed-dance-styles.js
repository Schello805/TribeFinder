const { PrismaClient } = require("../src/generated/client");

const prisma = new PrismaClient();

const DEFAULT_DANCE_STYLES = [
  "Orientalischer Tanz",
  "Bauchtanz",
  "Tribal Fusion",
  "ATS / FCBD Style",
  "Tribal Style",
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
    try {
      await prisma.danceStyle.create({ data: { name } });
      console.log(`✓ ${name}`);
      created++;
    } catch (error) {
      // Already exists
      skipped++;
    }
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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Try to query raw SQL to list tables in SQLite
    const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table';`;
    console.log('Tables in database:', result);
  } catch (e) {
    console.error('Error querying database:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

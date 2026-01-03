const { PrismaClient } = require('@prisma/client');
try {
  const prisma = new PrismaClient();
  console.log('Prisma Client successfully initialized');
} catch (e) {
  console.error('Error initializing Prisma Client:', e);
}

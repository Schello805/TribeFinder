#!/usr/bin/env node
/**
 * Safe DB Reset Script
 * 
 * This script will ONLY run if ALLOW_DB_RESET=true is set.
 * It prevents accidental database resets by AI tools or scripts.
 * 
 * Usage:
 *   ALLOW_DB_RESET=true npm run db:reset
 */

const { execSync } = require('child_process');
const path = require('path');

const ALLOW_RESET = process.env.ALLOW_DB_RESET === 'true';
const IS_PROD = process.env.NODE_ENV === 'production';

if (IS_PROD) {
  console.error('❌ ERROR: Database reset is NOT allowed in production!');
  console.error('   This is a safety measure to prevent data loss.');
  process.exit(1);
}

if (!ALLOW_RESET) {
  console.error('❌ ERROR: Database reset blocked.');
  console.error('');
  console.error('   To reset the database, you must explicitly opt-in:');
  console.error('');
  console.error('   ALLOW_DB_RESET=true npm run db:reset');
  console.error('');
  console.error('   ⚠️  WARNING: This will DELETE all data in your dev database!');
  console.error('');
  process.exit(1);
}

console.log('');
console.log('⚠️  DATABASE RESET');
console.log('==================');
console.log('You have opted in to reset the database.');
console.log('This will DELETE all data and re-apply migrations.');
console.log('');

try {
  const projectRoot = path.resolve(__dirname, '..');
  const dbPath = path.join(projectRoot, 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${dbPath}`;

  console.log('🔄 Running: prisma migrate reset --force');
  execSync('npx prisma migrate reset --force', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('');
  console.log('✅ Database reset complete.');
  console.log('   You will need to register a new user account.');
} catch (error) {
  console.error('❌ Database reset failed:', error.message);
  process.exit(1);
}

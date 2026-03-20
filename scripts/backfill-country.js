#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");

function isEmpty(v) {
  if (v == null) return true;
  const s = String(v).trim();
  return s.length === 0;
}

async function main() {
  const prisma = new PrismaClient();
  const DEFAULT_COUNTRY = "Deutschland";

  try {
    const result = {
      ok: true,
      updated: {
        events: 0,
        locations: 0,
        links: 0,
        linkSuggestions: 0,
      },
      skipped: {
        events: 0,
        locations: 0,
        links: 0,
        linkSuggestions: 0,
      },
    };

    // Events
    try {
      const events = await prisma.event.findMany({ select: { id: true, country: true }, take: 50000 });
      const toUpdate = events.filter((e) => isEmpty(e.country));
      result.skipped.events = events.length - toUpdate.length;

      for (const e of toUpdate) {
        await prisma.event.update({ where: { id: e.id }, data: { country: DEFAULT_COUNTRY }, select: { id: true } });
        result.updated.events += 1;
      }
    } catch {
      // ignore if model/field not present
    }

    // Group Locations
    try {
      const locations = await prisma.location.findMany({ select: { id: true, country: true }, take: 50000 });
      const toUpdate = locations.filter((l) => isEmpty(l.country));
      result.skipped.locations = locations.length - toUpdate.length;

      for (const l of toUpdate) {
        await prisma.location.update({ where: { id: l.id }, data: { country: DEFAULT_COUNTRY }, select: { id: true } });
        result.updated.locations += 1;
      }
    } catch {
      // ignore
    }

    // External Links
    try {
      const links = await prisma.externalLink.findMany({ select: { id: true, country: true }, take: 50000 });
      const toUpdate = links.filter((l) => isEmpty(l.country));
      result.skipped.links = links.length - toUpdate.length;

      for (const l of toUpdate) {
        await prisma.externalLink.update({ where: { id: l.id }, data: { country: DEFAULT_COUNTRY }, select: { id: true } });
        result.updated.links += 1;
      }
    } catch {
      // ignore
    }

    // External Link Suggestions
    try {
      const suggestions = await prisma.externalLinkSuggestion.findMany({ select: { id: true, country: true }, take: 50000 });
      const toUpdate = suggestions.filter((s) => isEmpty(s.country));
      result.skipped.linkSuggestions = suggestions.length - toUpdate.length;

      for (const s of toUpdate) {
        await prisma.externalLinkSuggestion.update({ where: { id: s.id }, data: { country: DEFAULT_COUNTRY }, select: { id: true } });
        result.updated.linkSuggestions += 1;
      }
    } catch {
      // ignore
    }

    process.stdout.write(JSON.stringify(result) + "\n");
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((e) => {
  process.stderr.write(String(e && e.stack ? e.stack : e) + "\n");
  process.exitCode = 1;
});

#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");

const DEFAULT_TIMEOUT_MS = 8000;

function normalizeUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, redirect: "follow" });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function checkUrl(url) {
  const timeoutMs = Number(process.env.LINK_CHECK_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const normalized = normalizeUrl(url);
  if (!normalized) return { ok: false, status: null, error: "empty_url" };

  try {
    // HEAD first (fast). Some hosts block HEAD => fallback GET.
    const head = await fetchWithTimeout(normalized, { method: "HEAD" }, timeoutMs).catch(() => null);
    if (head) {
      return { ok: head.status < 400, status: head.status, error: null };
    }
  } catch {
    // ignore, fallback GET below
  }

  try {
    const get = await fetchWithTimeout(normalized, { method: "GET" }, timeoutMs);
    return { ok: get.status < 400, status: get.status, error: null };
  } catch (e) {
    const msg = e && e.name === "AbortError" ? "timeout" : "fetch_error";
    return { ok: false, status: null, error: msg };
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();

    const links = await prisma.externalLink.findMany({
      where: { status: { in: ["APPROVED", "OFFLINE"] } },
      select: { id: true, url: true, status: true, consecutiveFailures: true },
      take: 2000,
    });

    let checked = 0;
    let okCount = 0;
    let offlineCount = 0;
    let archivedNow = 0;
    let revivedNow = 0;

    for (const l of links) {
      const r = await checkUrl(l.url);
      checked += 1;

      if (r.ok) {
        okCount += 1;
        if (l.status === "OFFLINE") revivedNow += 1;
        await prisma.externalLink.update({
          where: { id: l.id },
          data: {
            status: "APPROVED",
            archivedAt: null,
            consecutiveFailures: 0,
            lastCheckedAt: now,
            lastStatusCode: typeof r.status === "number" ? r.status : null,
          },
          select: { id: true },
        });
        continue;
      }

      offlineCount += 1;
      const nextFails = (l.consecutiveFailures || 0) + 1;
      const shouldArchive = nextFails >= 3;
      if (shouldArchive && l.status !== "OFFLINE") archivedNow += 1;

      await prisma.externalLink.update({
        where: { id: l.id },
        data: {
          status: shouldArchive ? "OFFLINE" : l.status,
          archivedAt: shouldArchive ? now : undefined,
          consecutiveFailures: nextFails,
          lastCheckedAt: now,
          lastStatusCode: typeof r.status === "number" ? r.status : null,
        },
        select: { id: true },
      });
    }

    process.stdout.write(
      JSON.stringify({ ok: true, checked, okCount, offlineCount, archivedNow, revivedNow }) + "\n"
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((e) => {
  process.stderr.write(String(e && e.stack ? e.stack : e) + "\n");
  process.exitCode = 1;
});

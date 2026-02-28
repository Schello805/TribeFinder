import { NextResponse } from "next/server";
import { mkdir, readFile, unlink, writeFile, realpath } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";

type CheckResult = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  message: string;
  details?: string;
  durationMs: number;
};

async function runCheck(
  id: string,
  label: string,
  fn: () => Promise<Omit<CheckResult, "id" | "label" | "durationMs">>
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return { id, label, durationMs: Date.now() - start, ...result };
  } catch (e) {
    return {
      id,
      label,
      durationMs: Date.now() - start,
      status: "fail",
      message: "Fehlgeschlagen",
      details: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const checks: CheckResult[] = [];
  let dbWritable = true;

  checks.push(
    await runCheck("env", "Konfiguration (ENV)", async () => {
      const missing: string[] = [];
      if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
      if (!process.env.NEXTAUTH_URL) missing.push("NEXTAUTH_URL");
      if (!process.env.NEXTAUTH_SECRET) missing.push("NEXTAUTH_SECRET");

      if (missing.length > 0) {
        return {
          status: "fail",
          message: `Fehlende Variablen: ${missing.join(", ")}`,
        };
      }

      const secret = (process.env.NEXTAUTH_SECRET || "").trim();
      if (secret === "generate-a-random-secret-here") {
        return {
          status: "fail",
          message: "NEXTAUTH_SECRET ist noch der Platzhalter",
          details: "Setze NEXTAUTH_SECRET in .env auf einen zufälligen Wert (mind. 32 Zeichen).",
        };
      }
      if (secret.length < 32) {
        return {
          status: "warn",
          message: "NEXTAUTH_SECRET ist sehr kurz",
          details: "Empfehlung: mind. 32 Zeichen (z.B. openssl rand -base64 32).",
        };
      }

      return { status: "ok", message: "ENV Variablen vorhanden" };
    })
  );

  checks.push(
    await runCheck("nextauth_url_https", "NEXTAUTH_URL: HTTPS", async () => {
      const url = (process.env.NEXTAUTH_URL || "").trim();
      if (!url) return { status: "warn", message: "NEXTAUTH_URL fehlt" };
      if (!url.startsWith("https://")) {
        return {
          status: "warn",
          message: `NEXTAUTH_URL ist nicht https:// (${url})`,
        };
      }
      return { status: "ok", message: "OK" };
    })
  );

  checks.push(
    await runCheck("db", "Datenbank erreichbar", async () => {
      const [users, groups, events] = await Promise.all([
        prisma.user.count(),
        prisma.group.count(),
        prisma.event.count(),
      ]);

      return {
        status: "ok",
        message: `OK (Users: ${users}, Gruppen: ${groups}, Events: ${events})`,
      };
    })
  );

  checks.push(
    await runCheck("schema", "Schema/Tables", async () => {
      const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('User','Group','Event','SystemSetting')"
      );

      const present = new Set((rows ?? []).map((r) => String(r.table_name)));
      const required = ["User", "Group", "Event", "SystemSetting"];
      const missing = required.filter((t) => !present.has(t));
      if (missing.length > 0) {
        throw new Error(`Fehlende Tabellen: ${missing.join(", ")}`);
      }

      return { status: "ok", message: "OK" };
    })
  );

  checks.push(
    await runCheck("prisma_event_dance_styles", "Prisma: Event.danceStyles Relation", async () => {
      const eventDelegate = (prisma as unknown as {
        event: { findMany: (args: unknown) => Promise<unknown> };
      }).event;

      await eventDelegate.findMany({
        take: 1,
        include: {
          danceStyles: {
            select: {
              styleId: true,
            },
            take: 1,
          },
        },
      });

      return { status: "ok", message: "OK" };
    })
  );

  const dbWriteCheck = await runCheck("db_write", "Datenbank schreibbar", async () => {
    const stamp = Date.now();
    await prisma.$executeRawUnsafe(`CREATE TEMP TABLE __diag_write_${stamp} (id INTEGER);`);
    await prisma.$executeRawUnsafe(`INSERT INTO __diag_write_${stamp} (id) VALUES (1);`);
    await prisma.$executeRawUnsafe(`DROP TABLE __diag_write_${stamp};`);
    return { status: "ok", message: "OK" };
  });
  checks.push(dbWriteCheck);
  if (dbWriteCheck.status !== "ok") {
    dbWritable = false;
  }

  checks.push(
    await runCheck("uploads", "Uploads-Verzeichnis schreibbar", async () => {
      const envDir = (process.env.UPLOADS_DIR || "").trim();
      const uploadDirRaw = envDir || path.join(process.cwd(), "public/uploads");
      const uploadDir = await realpath(uploadDirRaw).catch(() => uploadDirRaw);
      await mkdir(uploadDir, { recursive: true });
      const testFile = path.join(uploadDir, `.healthcheck-${Date.now()}.txt`);
      await writeFile(testFile, "ok", "utf8");
      const content = await readFile(testFile, "utf8");
      if (content !== "ok") {
        throw new Error("Upload-Testdatei konnte nicht korrekt gelesen werden");
      }
      await unlink(testFile);
      return { status: "ok", message: "OK" };
    })
  );

  checks.push(
    await runCheck("errors", "Aktive Fehler (Server)", async () => {
      try {
        const count = await prisma.errorLog.count({});
        if (count === 0) {
          return { status: "ok", message: "Keine Fehler" };
        }
        return { status: "warn", message: `${count} Fehler im Log (siehe Admin → Fehler)` };
      } catch (e) {
        const err = e as { code?: string; message?: string };
        if (err?.code === "P2021" || err?.code === "P2022") {
          return { status: "warn", message: "ErrorLog Tabelle fehlt (Migration noch nicht gelaufen?)" };
        }
        throw e;
      }
    })
  );

  if (!dbWritable) {
    checks.push({
      id: "crud_event",
      label: "CRUD Smoke-Test: Event",
      status: "warn",
      message: "Übersprungen (DB nicht schreibbar)",
      durationMs: 0,
    });
  } else {
    checks.push(
      await runCheck("crud_event", "CRUD Smoke-Test: Event", async () => {
        const stamp = Date.now();
        const title = `__diag_test_event_${stamp}`;
        let eventId: string | null = null;

        try {
          const created = await prisma.event.create({
            data: {
              title,
              description: "diagnostic test event",
              startDate: new Date(Date.now() + 60 * 60 * 1000),
              endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
              lat: 52.52,
              lng: 13.405,
              locationName: "Diagnostic",
              address: "Diagnostic",
            },
            select: { id: true },
          });

          eventId = created.id;

          const found = await prisma.event.findUnique({ where: { id: eventId } });
          if (!found) throw new Error("Event nach dem Erstellen nicht gefunden");

          await prisma.event.update({ where: { id: eventId }, data: { description: "diagnostic test event (updated)" } });
          await prisma.event.delete({ where: { id: eventId } });
          eventId = null;

          return { status: "ok", message: "OK (create/read/update/delete)" };
        } finally {
          if (eventId) {
            await prisma.event.delete({ where: { id: eventId } }).catch(() => undefined);
          }
        }
      })
    );
  }

  checks.push(
    await runCheck("dance_styles", "DanceStyles (Katalog)", async () => {
      const count = await prisma.danceStyle.count();
      if (count === 0) {
        return {
          status: "warn",
          message: "Keine DanceStyles vorhanden (Seed noch nicht gelaufen?)",
        };
      }
      return { status: "ok", message: `OK (${count} Einträge)` };
    })
  );

  checks.push(
    await runCheck("dance_style_integrity", "DanceStyles: Integrität (Migration)", async () => {
      const orphanGroupRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM "GroupDanceStyle" gds
         LEFT JOIN "DanceStyle" ds ON ds.id = gds."styleId"
         WHERE ds.id IS NULL;`
      );
      const orphanUserRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM "UserDanceStyle" uds
         LEFT JOIN "DanceStyle" ds ON ds.id = uds."styleId"
         WHERE ds.id IS NULL;`
      );

      const orphanGroup = Number(orphanGroupRows?.[0]?.count ?? 0);
      const orphanUser = Number(orphanUserRows?.[0]?.count ?? 0);

      const dupRows = await prisma.$queryRawUnsafe<Array<{ lname: string; count: bigint; names: string[] }>>(
        `SELECT lower(name) AS lname, COUNT(*)::bigint AS count, array_agg(name ORDER BY name) AS names
         FROM "DanceStyle"
         GROUP BY lower(name)
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC, lower(name) ASC;`
      );

      const legacyNames = [
        "Gypsy Caravan",
        "Improvisational Tribal Style (ITS)",
        "Improvisational Tribal Style",
        "BlackSheep",
        "BlackSheep Belly Dance",
        "BSBD",
        "Suhaila Salimpour Belly Dance Format",
        "Suhaila Salimpour Format",
      ];

      const legacyPresentRows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        `SELECT name
         FROM "DanceStyle"
         WHERE name = ANY($1::text[])
         ORDER BY name ASC;`,
        legacyNames
      );

      const legacyPresent = (legacyPresentRows ?? []).map((x) => x.name);

      const detailsObj = {
        orphanGroupDanceStyles: orphanGroup,
        orphanUserDanceStyles: orphanUser,
        duplicateNamesCaseInsensitive: (dupRows ?? []).map((r) => ({
          key: r.lname,
          count: Number(r.count),
          names: r.names,
        })),
        legacyStylesStillPresent: legacyPresent,
      };

      const problems: string[] = [];
      if (orphanGroup > 0) problems.push(`Orphans GroupDanceStyle: ${orphanGroup}`);
      if (orphanUser > 0) problems.push(`Orphans UserDanceStyle: ${orphanUser}`);
      if ((dupRows ?? []).length > 0) problems.push(`Duplikate (case-insensitive): ${(dupRows ?? []).length}`);
      if (legacyPresent.length > 0) problems.push(`Legacy-Styles noch als eigenständige Einträge: ${legacyPresent.length}`);

      if (orphanGroup > 0 || orphanUser > 0) {
        return {
          status: "fail",
          message: problems.join(" | "),
          details: JSON.stringify(detailsObj, null, 2),
        };
      }

      if ((dupRows ?? []).length > 0 || legacyPresent.length > 0) {
        return {
          status: "warn",
          message: problems.join(" | ") || "Hinweise vorhanden",
          details: JSON.stringify(detailsObj, null, 2),
        };
      }

      return {
        status: "ok",
        message: "OK (keine Orphans, keine Duplikate, keine Legacy-Einträge)",
        details: JSON.stringify(detailsObj, null, 2),
      };
    })
  );

  if (!dbWritable) {
    checks.push({
      id: "crud_group",
      label: "CRUD Smoke-Test: Gruppe + Tag",
      status: "warn",
      message: "Übersprungen (DB nicht schreibbar)",
      durationMs: 0,
    });
  } else {
    checks.push(
      await runCheck("crud_group", "CRUD Smoke-Test: Gruppe + Tag", async () => {
        const stamp = Date.now();
        const tagName = `__diag_test_tag_${stamp}`;
        const groupName = `__diag_test_group_${stamp}`;
        let tagId: string | null = null;
        let groupId: string | null = null;

        try {
          const tag = await prisma.tag.create({
            data: {
              name: tagName,
              isApproved: true,
            },
            select: { id: true },
          });
          tagId = tag.id;

          const group = await prisma.group.create({
            data: {
              name: groupName,
              description: "diagnostic test group",
              owner: { connect: { id: session.user.id } },
              members: {
                create: {
                  userId: session.user.id,
                  role: "ADMIN",
                  status: "APPROVED",
                },
              },
              tags: { connect: [{ id: tag.id }] },
            },
            select: { id: true },
          });
          groupId = group.id;

          await prisma.group.update({
            where: { id: group.id },
            data: { description: "diagnostic test group (updated)" },
          });

          const loaded = await prisma.group.findUnique({
            where: { id: group.id },
            include: { tags: true, members: true },
          });

          if (!loaded) throw new Error("Gruppe nach dem Erstellen nicht gefunden");
          if (!loaded.tags.some((t) => t.id === tag.id)) throw new Error("Tag-Relation fehlt");
          if (!loaded.members.some((m) => m.userId === session.user.id)) throw new Error("Member-Relation fehlt");

          return { status: "ok", message: "OK (create/read/update)" };
        } finally {
          if (groupId) {
            await prisma.group.delete({ where: { id: groupId } }).catch(() => undefined);
          }
          if (tagId) {
            await prisma.tag.delete({ where: { id: tagId } }).catch(() => undefined);
          }
        }
      })
    );
  }

  if (!dbWritable) {
    checks.push({
      id: "crud_dancestyle",
      label: "CRUD Smoke-Test: DanceStyle",
      status: "warn",
      message: "Übersprungen (DB nicht schreibbar)",
      durationMs: 0,
    });
  } else {
    checks.push(
      await runCheck("crud_dancestyle", "CRUD Smoke-Test: DanceStyle", async () => {
        const stamp = Date.now();
        const name = `__diag_test_style_${stamp}`;
        let id: string | null = null;
        try {
          const created = await prisma.danceStyle.create({
            data: { name, category: "Diagnostic" },
            select: { id: true },
          });
          id = created.id;

          const found = await prisma.danceStyle.findUnique({ where: { id } });
          if (!found) throw new Error("DanceStyle nach dem Erstellen nicht gefunden");

          await prisma.danceStyle.update({ where: { id }, data: { category: "Diagnostic (updated)" } });
          await prisma.danceStyle.delete({ where: { id } });
          id = null;

          return { status: "ok", message: "OK (create/read/update/delete)" };
        } finally {
          if (id) {
            await prisma.danceStyle.delete({ where: { id } }).catch(() => undefined);
          }
        }
      })
    );
  }

  checks.push(
    await runCheck("api_profile", "API: /api/user/profile (auth)", async () => {
      return { status: "warn", message: "Nicht automatisch testbar ohne User-Session" };
    })
  );

  return NextResponse.json({ checks });
}

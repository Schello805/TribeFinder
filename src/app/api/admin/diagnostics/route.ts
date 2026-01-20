import { NextResponse } from "next/server";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
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

      return { status: "ok", message: "ENV Variablen vorhanden" };
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
    await runCheck("migrations", "Migrationen/Tables", async () => {
      const migrations = await prisma.$queryRawUnsafe<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM _prisma_migrations"
      );
      const count = migrations?.[0]?.count ?? 0;
      return { status: "ok", message: `OK (${count} Migrationen)` };
    })
  );

  checks.push(
    await runCheck("uploads", "Uploads-Verzeichnis schreibbar", async () => {
      const uploadDir = path.join(process.cwd(), "public/uploads");
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

  checks.push(
    await runCheck("api_profile", "API: /api/user/profile (auth)", async () => {
      return { status: "warn", message: "Nicht automatisch testbar ohne User-Session" };
    })
  );

  return NextResponse.json({ checks });
}

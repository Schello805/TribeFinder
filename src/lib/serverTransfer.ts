import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "fs/promises";
import path from "path";
import fs from "node:fs";
import os from "os";
import { spawn } from "child_process";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function resolveProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    try {
      const hasPackageJson = fs.existsSync(path.join(dir, "package.json"));
      const hasPrismaSchema = fs.existsSync(path.join(dir, "prisma", "schema.prisma"));
      if (hasPackageJson && hasPrismaSchema) return dir;
    } catch {
      // ignore
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

async function resolveBackupDir(projectRoot: string) {
  const envDir = (process.env.BACKUP_DIR || "").trim();
  const candidates = [
    ...(envDir ? [envDir] : []),
    path.join(projectRoot, "backups"),
    "/var/www/tribefinder/backups",
  ];

  let lastError: unknown = null;
  for (const dir of candidates) {
    try {
      await mkdir(dir, { recursive: true });
      await access(dir, fs.constants.W_OK | fs.constants.X_OK);
      return dir;
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(
    `Konnte kein Backup-Verzeichnis anlegen. Kandidaten: ${candidates.join(", ")}. ` +
      (lastError instanceof Error ? lastError.message : String(lastError))
  );
}

async function resolveUploadsDir(projectRoot: string) {
  const envDir = (process.env.UPLOADS_DIR || "").trim();
  const candidates = [
    ...(envDir ? [envDir] : []),
    path.join(projectRoot, "public", "uploads"),
    "/var/www/tribefinder/uploads",
  ];

  for (const dir of candidates) {
    try {
      const resolved = await fs.promises.realpath(dir).catch(() => dir);
      await mkdir(resolved, { recursive: true });
      await access(resolved, fs.constants.W_OK | fs.constants.X_OK);
      return resolved;
    } catch {
      // try next
    }
  }

  return path.join(projectRoot, "public", "uploads");
}

function runTar(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("tar", args, { cwd });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `tar exited with code ${code}`));
    });
  });
}

function runTarList(archivePath: string, cwd: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn("tar", ["-tzf", archivePath], { cwd });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(
          stdout
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        );
      } else {
        reject(new Error(stderr || `tar exited with code ${code}`));
      }
    });
  });
}

function isUploadPublicUrl(url: string | null | undefined) {
  const s = (url || "").trim();
  return s.startsWith("/uploads/");
}

function uploadFilenameFromPublicUrl(url: string) {
  return url.replace(/^\/uploads\//, "");
}

function safeUploadFilename(filename: string) {
  if (!filename) return null;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) return null;
  return filename;
}

type TransferDanceMode = "IMPRO" | "CHOREO";

function normalizeDanceMode(v: string | null | undefined): TransferDanceMode | null {
  if (!v) return null;
  if (v === "IMPRO" || v === "CHOREO") return v;
  return null;
}

function isUnknownPrismaFieldError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Unknown field") || msg.includes("Unknown argument");
}

function stripWorkshopUserFields<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data };
  delete (out as { dancerGivesWorkshops?: unknown }).dancerGivesWorkshops;
  delete (out as { dancerBookableForShows?: unknown }).dancerBookableForShows;
  delete (out as { dancerWorkshopConditions?: unknown }).dancerWorkshopConditions;
  return out;
}

function coerceDanceLevel(input: unknown): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL" {
  const s = String(input);
  if (s === "BEGINNER" || s === "INTERMEDIATE" || s === "ADVANCED" || s === "PROFESSIONAL") return s;
  return "INTERMEDIATE";
}

async function prismaCall<T>(fn: unknown, args: unknown): Promise<T> {
  return (fn as (a: unknown) => Promise<T>)(args);
}

type TransferUser = {
  email: string;
  name: string | null;
  image: string | null;
  firstName: string | null;
  lastName: string | null;
  dancerName: string | null;
  bio: string | null;
  isDancerProfileEnabled: boolean;
  isDancerProfilePrivate: boolean;
  dancerTeaches: boolean;
  dancerTeachingWhere: string | null;
  dancerTeachingFocus: string | null;
  dancerEducation: string | null;
  dancerPerformances: string | null;
  dancerGivesWorkshops: boolean;
  dancerBookableForShows: boolean;
  dancerWorkshopConditions: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  website: string | null;
};

type TransferGroup = {
  sourceId: string;
  name: string;
  description: string;
  website: string | null;
  contactEmail: string | null;
  image: string | null;
  headerImage: string | null;
  headerImageFocusY: number | null;
  headerGradientFrom: string | null;
  headerGradientTo: string | null;
  videoUrl: string | null;
  size: string;
  trainingTime: string | null;
  performances: boolean;
  foundingYear: number | null;
  seekingMembers: boolean;
  ownerEmail: string;
  location: { address: string | null; lat: number; lng: number } | null;
  tags: { name: string; isApproved: boolean }[];
  danceStyles: { name: string; level: string; mode: string | null }[];
  galleryImages: { url: string; caption: string | null; order: number }[];
};

type TransferEvent = {
  sourceId: string;
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  endDate: string | null;
  locationName: string | null;
  address: string | null;
  lat: number;
  lng: number;
  flyer1: string | null;
  flyer2: string | null;
  website: string | null;
  ticketLink: string | null;
  ticketPrice: string | null;
  organizer: string | null;
  maxParticipants: number | null;
  requiresRegistration: boolean;
  groupSourceId: string | null;
  creatorEmail: string | null;
};

type TransferMembership = {
  groupSourceId: string;
  userEmail: string;
  role: string;
  status: string;
};

type TransferData = {
  version: 1;
  exportedAt: string;
  users: TransferUser[];
  groups: TransferGroup[];
  events: TransferEvent[];
  memberships: TransferMembership[];
  uploads: string[];
};

export type TransferInspectResult = {
  filename: string;
  hasDataJson: boolean;
  uploadsFileCount: number;
  counts: {
    users: number;
    groups: number;
    events: number;
    memberships: number;
  };
  items?: {
    users: { email: string; name: string | null }[];
    groups: { sourceId: string; name: string }[];
    events: { sourceId: string; title: string; startDate: string }[];
    memberships: { key: string; userEmail: string; groupSourceId: string; role: string; status: string }[];
  };
  missingUploads: string[];
};

function randomPassword(length = 16) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function createTransferArchive(groupIds: string[]) {
  const projectRoot = resolveProjectRoot();
  const backupDir = await resolveBackupDir(projectRoot);
  const uploadsDir = await resolveUploadsDir(projectRoot);

  const groups = await prisma.group.findMany({
    where: { id: { in: groupIds } },
    include: {
      location: true,
      tags: true,
      danceStyles: { include: { style: true } },
      galleryImages: { select: { url: true, caption: true, order: true } },
      members: { select: { user: { select: { email: true } }, role: true, status: true } },
      owner: { select: { email: true } },
      events: true,
    },
  });

  const userEmails = new Set<string>();
  const memberships: TransferMembership[] = [];
  const events: TransferEvent[] = [];

  for (const g of groups) {
    userEmails.add(g.owner.email);

    for (const m of g.members) {
      userEmails.add(m.user.email);
      memberships.push({
        groupSourceId: g.id,
        userEmail: m.user.email,
        role: m.role,
        status: m.status,
      });
    }

    for (const e of g.events) {
      events.push({
        sourceId: e.id,
        title: e.title,
        description: e.description,
        eventType: e.eventType,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate ? e.endDate.toISOString() : null,
        locationName: e.locationName,
        address: e.address,
        lat: e.lat,
        lng: e.lng,
        flyer1: e.flyer1,
        flyer2: e.flyer2,
        website: e.website,
        ticketLink: e.ticketLink,
        ticketPrice: e.ticketPrice,
        organizer: e.organizer,
        maxParticipants: e.maxParticipants,
        requiresRegistration: e.requiresRegistration,
        groupSourceId: g.id,
        creatorEmail: null,
      });

      if (e.creatorId) {
        // best-effort: creator can be null if deleted
        const creator = await prisma.user.findUnique({ where: { id: e.creatorId }, select: { email: true } });
        if (creator?.email) {
          userEmails.add(creator.email);
          events[events.length - 1]!.creatorEmail = creator.email;
        }
      }
    }
  }

  const usersFindManyArgs = {
    where: { email: { in: Array.from(userEmails) } },
    select: {
      email: true,
      name: true,
      image: true,
      firstName: true,
      lastName: true,
      dancerName: true,
      bio: true,
      isDancerProfileEnabled: true,
      isDancerProfilePrivate: true,
      dancerTeaches: true,
      dancerTeachingWhere: true,
      dancerTeachingFocus: true,
      dancerEducation: true,
      dancerPerformances: true,
      dancerGivesWorkshops: true,
      dancerBookableForShows: true,
      dancerWorkshopConditions: true,
      instagramUrl: true,
      facebookUrl: true,
      youtubeUrl: true,
      tiktokUrl: true,
      website: true,
    },
  };

  let usersRaw: unknown[] = [];
  try {
    usersRaw = await prismaCall<unknown[]>(prisma.user.findMany, usersFindManyArgs);
  } catch (e) {
    if (!isUnknownPrismaFieldError(e)) throw e;
    const fallbackArgs = {
      ...usersFindManyArgs,
      select: stripWorkshopUserFields(usersFindManyArgs.select as Record<string, unknown>),
    };
    usersRaw = await prismaCall<unknown[]>(prisma.user.findMany, fallbackArgs);
  }

  const users: TransferUser[] = usersRaw.map((u0) => {
    const u = u0 as Record<string, unknown>;
    return {
      email: String(u.email),
      name: (typeof u.name === "string" ? u.name : null) as string | null,
      image: (typeof u.image === "string" ? u.image : null) as string | null,
      firstName: (typeof u.firstName === "string" ? u.firstName : null) as string | null,
      lastName: (typeof u.lastName === "string" ? u.lastName : null) as string | null,
      dancerName: (typeof u.dancerName === "string" ? u.dancerName : null) as string | null,
      bio: (typeof u.bio === "string" ? u.bio : null) as string | null,
      isDancerProfileEnabled: Boolean(u.isDancerProfileEnabled),
      isDancerProfilePrivate: Boolean(u.isDancerProfilePrivate),
      dancerTeaches: Boolean(u.dancerTeaches),
      dancerTeachingWhere: (typeof u.dancerTeachingWhere === "string" ? u.dancerTeachingWhere : null) as string | null,
      dancerTeachingFocus: (typeof u.dancerTeachingFocus === "string" ? u.dancerTeachingFocus : null) as string | null,
      dancerEducation: (typeof u.dancerEducation === "string" ? u.dancerEducation : null) as string | null,
      dancerPerformances: (typeof u.dancerPerformances === "string" ? u.dancerPerformances : null) as string | null,
      dancerGivesWorkshops: Boolean(u.dancerGivesWorkshops),
      dancerBookableForShows: Boolean(u.dancerBookableForShows),
      dancerWorkshopConditions:
        typeof u.dancerWorkshopConditions === "string" ? u.dancerWorkshopConditions : null,
      instagramUrl: (typeof u.instagramUrl === "string" ? u.instagramUrl : null) as string | null,
      facebookUrl: (typeof u.facebookUrl === "string" ? u.facebookUrl : null) as string | null,
      youtubeUrl: (typeof u.youtubeUrl === "string" ? u.youtubeUrl : null) as string | null,
      tiktokUrl: (typeof u.tiktokUrl === "string" ? u.tiktokUrl : null) as string | null,
      website: (typeof u.website === "string" ? u.website : null) as string | null,
    };
  });

  const groupsOut: TransferGroup[] = groups.map((g) => ({
    sourceId: g.id,
    name: g.name,
    description: g.description,
    website: g.website,
    contactEmail: g.contactEmail,
    image: g.image,
    headerImage: g.headerImage,
    headerImageFocusY: g.headerImageFocusY,
    headerGradientFrom: g.headerGradientFrom,
    headerGradientTo: g.headerGradientTo,
    videoUrl: g.videoUrl,
    size: g.size,
    trainingTime: g.trainingTime,
    performances: g.performances,
    foundingYear: g.foundingYear,
    seekingMembers: g.seekingMembers,
    ownerEmail: g.owner.email,
    location: g.location
      ? {
          address: g.location.address,
          lat: g.location.lat,
          lng: g.location.lng,
        }
      : null,
    tags: g.tags.map((t) => ({ name: t.name, isApproved: t.isApproved })),
    danceStyles: g.danceStyles.map((ds) => ({
      name: ds.style.name,
      level: ds.level,
      mode: ds.mode,
    })),
    galleryImages: (g.galleryImages || []).map((gi) => ({ url: gi.url, caption: gi.caption ?? null, order: gi.order })),
  }));

  const uploadSet = new Set<string>();
  const collectUpload = (url: string | null | undefined) => {
    if (!url) return;
    if (!isUploadPublicUrl(url)) return;
    const fn = safeUploadFilename(uploadFilenameFromPublicUrl(url));
    if (!fn) return;
    uploadSet.add(fn);
  };

  for (const u of users) {
    collectUpload(u.image);
  }
  for (const g of groupsOut) {
    collectUpload(g.image);
    collectUpload(g.headerImage);
    for (const gi of g.galleryImages) collectUpload(gi.url);
  }
  for (const e of events) {
    collectUpload(e.flyer1);
    collectUpload(e.flyer2);
  }

  const data: TransferData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    users,
    groups: groupsOut,
    events,
    memberships,
    uploads: Array.from(uploadSet).sort(),
  };

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-transfer-"));
  try {
    await writeFile(path.join(tmpRoot, "data.json"), JSON.stringify(data, null, 2), "utf8");

    const tmpUploadsDir = path.join(tmpRoot, "uploads");
    await mkdir(tmpUploadsDir, { recursive: true });

    for (const fn of data.uploads) {
      const src = path.join(uploadsDir, fn);
      const dest = path.join(tmpUploadsDir, fn);
      const exists = await stat(src).then(() => true).catch(() => false);
      if (!exists) continue;
      await cp(src, dest);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `tribefinder-transfer-${timestamp}.tar.gz`;
    const outPath = path.join(backupDir, filename);

    await runTar(["-czf", outPath, "data.json", "uploads"], tmpRoot);

    const s = await stat(outPath);
    return { filename, size: s.size, createdAt: s.mtimeMs };
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

function isSafeTransferFilename(filename: string) {
  if (!filename.endsWith(".tar.gz")) return false;
  if (filename.includes("/") || filename.includes("..")) return false;
  if (filename.startsWith("tribefinder-transfer-") || filename.startsWith("transfer-upload-")) return true;
  return false;
}

async function readTransferDataFromArchive(projectRoot: string, backupDir: string, filename: string): Promise<TransferData> {
  if (!isSafeTransferFilename(filename)) throw new Error("Ungültiger Transfer-Dateiname");
  const archivePath = path.join(backupDir, filename);
  await stat(archivePath).catch(() => {
    throw new Error("Transfer nicht gefunden");
  });

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-transfer-inspect-"));
  try {
    await runTar(["-xzf", archivePath, "-C", tmpRoot, "data.json"], projectRoot);
    const p = path.join(tmpRoot, "data.json");
    const raw = await readFile(p, "utf8");
    const json = JSON.parse(raw) as TransferData;
    if (!json || json.version !== 1) throw new Error("Ungültiges data.json (version)");
    if (!Array.isArray(json.groups) || !Array.isArray(json.users) || !Array.isArray(json.events) || !Array.isArray(json.memberships)) {
      throw new Error("Ungültiges data.json (structure)");
    }
    return json;
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

export async function inspectTransfer(filename: string): Promise<TransferInspectResult> {
  const projectRoot = resolveProjectRoot();
  const backupDir = await resolveBackupDir(projectRoot);
  const uploadsDir = await resolveUploadsDir(projectRoot);

  if (!isSafeTransferFilename(filename)) {
    throw new Error("Ungültiger Transfer-Dateiname");
  }

  const archivePath = path.join(backupDir, filename);
  await stat(archivePath).catch(() => {
    throw new Error("Transfer nicht gefunden");
  });

  const entries = await runTarList(archivePath, projectRoot);
  const hasDataJson = entries.includes("data.json");

  const uploads = entries
    .filter((p) => p.startsWith("uploads/") && !p.endsWith("/"))
    .map((p) => p.replace(/^uploads\//, ""))
    .filter((p) => p !== ".gitkeep");

  const missingUploads: string[] = [];
  for (const fn of uploads) {
    const safe = safeUploadFilename(fn);
    if (!safe) continue;
    const dest = path.join(uploadsDir, safe);
    const exists = await stat(dest).then(() => true).catch(() => false);
    if (!exists) missingUploads.push(safe);
  }

  let counts = { users: 0, groups: 0, events: 0, memberships: 0 };
  let items:
    | {
        users: { email: string; name: string | null }[];
        groups: { sourceId: string; name: string }[];
        events: { sourceId: string; title: string; startDate: string }[];
        memberships: { key: string; userEmail: string; groupSourceId: string; role: string; status: string }[];
      }
    | undefined;
  if (hasDataJson) {
    const data = await readTransferDataFromArchive(projectRoot, backupDir, filename);
    counts = {
      users: data.users.length,
      groups: data.groups.length,
      events: data.events.length,
      memberships: data.memberships.length,
    };

    const memberships = data.memberships.map((m) => ({
      key: `${m.groupSourceId}::${m.userEmail}`,
      userEmail: m.userEmail,
      groupSourceId: m.groupSourceId,
      role: m.role,
      status: m.status,
    }));

    items = {
      users: data.users.map((u) => ({ email: u.email, name: u.name })),
      groups: data.groups.map((g) => ({ sourceId: g.sourceId, name: g.name })),
      events: data.events.map((e) => ({ sourceId: e.sourceId, title: e.title, startDate: e.startDate })),
      memberships,
    };
  }

  return {
    filename,
    hasDataJson,
    uploadsFileCount: uploads.length,
    counts,
    items,
    missingUploads: missingUploads.slice(0, 200),
  };
}

type Action = "skip" | "overwrite" | "copy";

export type TransferApplyRequest = {
  filename: string;
  actions: {
    users: Record<string, Action>;
    groups: Record<string, Action>;
    events: Record<string, Action>;
    memberships: Record<string, Action>;
  };
};

export type TransferApplyResult = {
  ok: true;
  created: { users: number; groups: number; events: number; memberships: number };
  updated: { users: number; groups: number; events: number; memberships: number };
  skipped: { users: number; groups: number; events: number; memberships: number };
  notes: string[];
};

function keyMembership(m: TransferMembership) {
  return `${m.groupSourceId}::${m.userEmail}`;
}

export async function applyTransfer(req: TransferApplyRequest): Promise<TransferApplyResult> {
  const projectRoot = resolveProjectRoot();
  const backupDir = await resolveBackupDir(projectRoot);
  const uploadsDir = await resolveUploadsDir(projectRoot);

  const data = await readTransferDataFromArchive(projectRoot, backupDir, req.filename);

  const archivePath = path.join(backupDir, req.filename);

  const created = { users: 0, groups: 0, events: 0, memberships: 0 };
  const updated = { users: 0, groups: 0, events: 0, memberships: 0 };
  const skipped = { users: 0, groups: 0, events: 0, memberships: 0 };
  const notes: string[] = [];

  const userEmailToId = new Map<string, string>();
  const groupSourceIdToId = new Map<string, string>();

  // 1) Users (match by email)
  for (const u of data.users) {
    const action = req.actions.users[u.email] ?? "skip";
    const existing = await prisma.user.findUnique({ where: { email: u.email }, select: { id: true, email: true } });

    if (existing) {
      userEmailToId.set(u.email, existing.id);
      if (action === "skip") {
        skipped.users++;
        continue;
      }
      if (action === "overwrite") {
        const updateArgs = {
          where: { email: u.email },
          data: {
            name: u.name,
            image: u.image,
            firstName: u.firstName,
            lastName: u.lastName,
            dancerName: u.dancerName,
            bio: u.bio,
            isDancerProfileEnabled: u.isDancerProfileEnabled,
            isDancerProfilePrivate: u.isDancerProfilePrivate,
            dancerTeaches: u.dancerTeaches,
            dancerTeachingWhere: u.dancerTeachingWhere,
            dancerTeachingFocus: u.dancerTeachingFocus,
            dancerEducation: u.dancerEducation,
            dancerPerformances: u.dancerPerformances,
            dancerGivesWorkshops: u.dancerGivesWorkshops,
            dancerBookableForShows: u.dancerBookableForShows,
            dancerWorkshopConditions: u.dancerWorkshopConditions,
            instagramUrl: u.instagramUrl,
            facebookUrl: u.facebookUrl,
            youtubeUrl: u.youtubeUrl,
            tiktokUrl: u.tiktokUrl,
            website: u.website,
          },
        };

        try {
          await prismaCall<unknown>(prisma.user.update, updateArgs);
        } catch (e) {
          if (!isUnknownPrismaFieldError(e)) throw e;
          await prismaCall<unknown>(prisma.user.update, {
            ...updateArgs,
            data: stripWorkshopUserFields(updateArgs.data as Record<string, unknown>),
          });
          notes.push(`User updated without workshop fields (older schema): ${u.email}`);
        }
        updated.users++;
        continue;
      }

      // copy
      const [local, domain] = u.email.split("@");
      const copyEmail = `${local}+copy-${Date.now()}@${domain || "example.com"}`;
      const pw = randomPassword();
      const hashed = await bcrypt.hash(pw, 10);
      const createCopyArgs = {
        data: {
          email: copyEmail,
          password: hashed,
          name: u.name,
          image: u.image,
          firstName: u.firstName,
          lastName: u.lastName,
          dancerName: u.dancerName,
          bio: u.bio,
          isDancerProfileEnabled: u.isDancerProfileEnabled,
          isDancerProfilePrivate: u.isDancerProfilePrivate,
          dancerTeaches: u.dancerTeaches,
          dancerTeachingWhere: u.dancerTeachingWhere,
          dancerTeachingFocus: u.dancerTeachingFocus,
          dancerEducation: u.dancerEducation,
          dancerPerformances: u.dancerPerformances,
          dancerGivesWorkshops: u.dancerGivesWorkshops,
          dancerBookableForShows: u.dancerBookableForShows,
          dancerWorkshopConditions: u.dancerWorkshopConditions,
          instagramUrl: u.instagramUrl,
          facebookUrl: u.facebookUrl,
          youtubeUrl: u.youtubeUrl,
          tiktokUrl: u.tiktokUrl,
          website: u.website,
        },
        select: { id: true },
      };

      let createdUser: { id: string };
      try {
        createdUser = (await prismaCall<{ id: string }>(prisma.user.create, createCopyArgs)) as { id: string };
      } catch (e) {
        if (!isUnknownPrismaFieldError(e)) throw e;
        createdUser = (await prismaCall<{ id: string }>(prisma.user.create, {
          ...createCopyArgs,
          data: stripWorkshopUserFields(createCopyArgs.data as Record<string, unknown>),
        })) as { id: string };
        notes.push(`User copy created without workshop fields (older schema): ${copyEmail}`);
      }
      notes.push(`User copy created: ${u.email} -> ${copyEmail}`);
      userEmailToId.set(u.email, createdUser.id);
      created.users++;
      continue;
    }

    if (action === "skip") {
      skipped.users++;
      continue;
    }

    const pw = randomPassword();
    const hashed = await bcrypt.hash(pw, 10);
    const createArgs = {
      data: {
        email: u.email,
        password: hashed,
        name: u.name,
        image: u.image,
        firstName: u.firstName,
        lastName: u.lastName,
        dancerName: u.dancerName,
        bio: u.bio,
        isDancerProfileEnabled: u.isDancerProfileEnabled,
        isDancerProfilePrivate: u.isDancerProfilePrivate,
        dancerTeaches: u.dancerTeaches,
        dancerTeachingWhere: u.dancerTeachingWhere,
        dancerTeachingFocus: u.dancerTeachingFocus,
        dancerEducation: u.dancerEducation,
        dancerPerformances: u.dancerPerformances,
        dancerGivesWorkshops: u.dancerGivesWorkshops,
        dancerBookableForShows: u.dancerBookableForShows,
        dancerWorkshopConditions: u.dancerWorkshopConditions,
        instagramUrl: u.instagramUrl,
        facebookUrl: u.facebookUrl,
        youtubeUrl: u.youtubeUrl,
        tiktokUrl: u.tiktokUrl,
        website: u.website,
      },
      select: { id: true },
    };

    let createdUser: { id: string };
    try {
      createdUser = (await prismaCall<{ id: string }>(prisma.user.create, createArgs)) as { id: string };
    } catch (e) {
      if (!isUnknownPrismaFieldError(e)) throw e;
      createdUser = (await prismaCall<{ id: string }>(prisma.user.create, {
        ...createArgs,
        data: stripWorkshopUserFields(createArgs.data as Record<string, unknown>),
      })) as { id: string };
      notes.push(`User created without workshop fields (older schema): ${u.email}`);
    }
    notes.push(`User created with random password: ${u.email}`);
    userEmailToId.set(u.email, createdUser.id);
    created.users++;
  }

  // 2) Groups (match by exact name)
  for (const g of data.groups) {
    const action = req.actions.groups[g.sourceId] ?? "skip";
    const ownerId = userEmailToId.get(g.ownerEmail);
    if (!ownerId) {
      skipped.groups++;
      notes.push(`Skipped group '${g.name}': owner not mapped (${g.ownerEmail})`);
      continue;
    }

    const existing = await prisma.group.findFirst({ where: { name: g.name }, select: { id: true } });

    if (existing) {
      if (action === "skip") {
        groupSourceIdToId.set(g.sourceId, existing.id);
        skipped.groups++;
        continue;
      }
      if (action === "overwrite") {
        const groupUpdateArgs = {
          where: { id: existing.id },
          data: {
            name: g.name,
            description: g.description,
            website: g.website,
            contactEmail: g.contactEmail,
            image: g.image,
            headerImage: g.headerImage,
            headerImageFocusY: g.headerImageFocusY,
            headerGradientFrom: g.headerGradientFrom,
            headerGradientTo: g.headerGradientTo,
            videoUrl: g.videoUrl,
            size: g.size,
            trainingTime: g.trainingTime,
            performances: g.performances,
            foundingYear: g.foundingYear,
            seekingMembers: g.seekingMembers,
            owner: { connect: { id: ownerId } },
            location: g.location
              ? {
                  upsert: {
                    create: { address: g.location.address, lat: g.location.lat, lng: g.location.lng },
                    update: { address: g.location.address, lat: g.location.lat, lng: g.location.lng },
                  },
                }
              : { delete: true },
            tags: {
              set: [],
              connectOrCreate: g.tags.map((t) => ({ where: { name: t.name }, create: { name: t.name, isApproved: t.isApproved } })),
            },
            danceStyles: {
              deleteMany: {},
              create: await Promise.all(
                g.danceStyles.map(async (ds) => {
                  const style = await prisma.danceStyle.upsert({ where: { name: ds.name }, update: {}, create: { name: ds.name }, select: { id: true } });
                  return {
                    level: coerceDanceLevel(ds.level),
                    mode: normalizeDanceMode(ds.mode),
                    style: { connect: { id: style.id } },
                  };
                })
              ),
            },
            galleryImages: {
              deleteMany: {},
              create: g.galleryImages.map((gi) => ({ url: gi.url, caption: gi.caption, order: gi.order })),
            },
          },
          select: { id: true },
        };

        await prismaCall<unknown>(prisma.group.update, groupUpdateArgs);
        groupSourceIdToId.set(g.sourceId, existing.id);
        updated.groups++;
        continue;
      }

      // copy
      const copyName = `${g.name} (Import ${new Date().toLocaleDateString()})`;
      const createdGroup = await prisma.group.create({
        data: {
          name: copyName,
          description: g.description,
          website: g.website,
          contactEmail: g.contactEmail,
          image: g.image,
          headerImage: g.headerImage,
          headerImageFocusY: g.headerImageFocusY,
          headerGradientFrom: g.headerGradientFrom,
          headerGradientTo: g.headerGradientTo,
          videoUrl: g.videoUrl,
          size: g.size,
          trainingTime: g.trainingTime,
          performances: g.performances,
          foundingYear: g.foundingYear,
          seekingMembers: g.seekingMembers,
          owner: { connect: { id: ownerId } },
          location: g.location ? { create: { address: g.location.address, lat: g.location.lat, lng: g.location.lng } } : undefined,
          tags: {
            connectOrCreate: g.tags.map((t) => ({ where: { name: t.name }, create: { name: t.name, isApproved: t.isApproved } })),
          },
          danceStyles: {
            create: await Promise.all(
              g.danceStyles.map(async (ds) => {
                const style = await prisma.danceStyle.upsert({ where: { name: ds.name }, update: {}, create: { name: ds.name }, select: { id: true } });
                return {
                  level: coerceDanceLevel(ds.level),
                  mode: normalizeDanceMode(ds.mode),
                  style: { connect: { id: style.id } },
                };
              })
            ),
          },
          galleryImages: { create: g.galleryImages.map((gi) => ({ url: gi.url, caption: gi.caption, order: gi.order })) },
        },
        select: { id: true },
      });
      groupSourceIdToId.set(g.sourceId, createdGroup.id);
      created.groups++;
      continue;
    }

    if (action === "skip") {
      skipped.groups++;
      continue;
    }

    const createdGroup = await prisma.group.create({
      data: {
        name: g.name,
        description: g.description,
        website: g.website,
        contactEmail: g.contactEmail,
        image: g.image,
        headerImage: g.headerImage,
        headerImageFocusY: g.headerImageFocusY,
        headerGradientFrom: g.headerGradientFrom,
        headerGradientTo: g.headerGradientTo,
        videoUrl: g.videoUrl,
        size: g.size,
        trainingTime: g.trainingTime,
        performances: g.performances,
        foundingYear: g.foundingYear,
        seekingMembers: g.seekingMembers,
        owner: { connect: { id: ownerId } },
        location: g.location ? { create: { address: g.location.address, lat: g.location.lat, lng: g.location.lng } } : undefined,
        tags: {
          connectOrCreate: g.tags.map((t) => ({ where: { name: t.name }, create: { name: t.name, isApproved: t.isApproved } })),
        },
        danceStyles: {
          create: await Promise.all(
            g.danceStyles.map(async (ds) => {
              const style = await prisma.danceStyle.upsert({ where: { name: ds.name }, update: {}, create: { name: ds.name }, select: { id: true } });
              return {
                level: coerceDanceLevel(ds.level),
                mode: normalizeDanceMode(ds.mode),
                style: { connect: { id: style.id } },
              };
            })
          ),
        },
        galleryImages: { create: g.galleryImages.map((gi) => ({ url: gi.url, caption: gi.caption, order: gi.order })) },
      },
      select: { id: true },
    });
    groupSourceIdToId.set(g.sourceId, createdGroup.id);
    created.groups++;
  }

  // 3) Events
  for (const e of data.events) {
    const action = req.actions.events[e.sourceId] ?? "skip";
    const groupId = e.groupSourceId ? groupSourceIdToId.get(e.groupSourceId) : null;
    const creatorId = e.creatorEmail ? userEmailToId.get(e.creatorEmail) : null;

    const matchWhere: Record<string, unknown> = {
      title: e.title,
      startDate: new Date(e.startDate),
      ...(groupId ? { groupId } : {}),
    };

    const existing = await prisma.event.findFirst({ where: matchWhere, select: { id: true } });

    if (existing) {
      if (action === "skip") {
        skipped.events++;
        continue;
      }
      if (action === "overwrite") {
        await prisma.event.update({
          where: { id: existing.id },
          data: {
            title: e.title,
            description: e.description,
            eventType: e.eventType,
            startDate: new Date(e.startDate),
            endDate: e.endDate ? new Date(e.endDate) : null,
            locationName: e.locationName,
            address: e.address,
            lat: e.lat,
            lng: e.lng,
            flyer1: e.flyer1,
            flyer2: e.flyer2,
            website: e.website,
            ticketLink: e.ticketLink,
            ticketPrice: e.ticketPrice,
            organizer: e.organizer,
            maxParticipants: e.maxParticipants,
            requiresRegistration: e.requiresRegistration,
            groupId,
            creatorId,
          },
        });
        updated.events++;
        continue;
      }

      // copy
      await prisma.event.create({
        data: {
          title: e.title,
          description: e.description,
          eventType: e.eventType,
          startDate: new Date(e.startDate),
          endDate: e.endDate ? new Date(e.endDate) : null,
          locationName: e.locationName,
          address: e.address,
          lat: e.lat,
          lng: e.lng,
          flyer1: e.flyer1,
          flyer2: e.flyer2,
          website: e.website,
          ticketLink: e.ticketLink,
          ticketPrice: e.ticketPrice,
          organizer: e.organizer,
          maxParticipants: e.maxParticipants,
          requiresRegistration: e.requiresRegistration,
          ...(groupId ? { group: { connect: { id: groupId } } } : {}),
          ...(creatorId ? { creator: { connect: { id: creatorId } } } : {}),
        },
      });
      created.events++;
      continue;
    }

    if (action === "skip") {
      skipped.events++;
      continue;
    }

    await prisma.event.create({
      data: {
        title: e.title,
        description: e.description,
        eventType: e.eventType,
        startDate: new Date(e.startDate),
        endDate: e.endDate ? new Date(e.endDate) : null,
        locationName: e.locationName,
        address: e.address,
        lat: e.lat,
        lng: e.lng,
        flyer1: e.flyer1,
        flyer2: e.flyer2,
        website: e.website,
        ticketLink: e.ticketLink,
        ticketPrice: e.ticketPrice,
        organizer: e.organizer,
        maxParticipants: e.maxParticipants,
        requiresRegistration: e.requiresRegistration,
        ...(groupId ? { group: { connect: { id: groupId } } } : {}),
        ...(creatorId ? { creator: { connect: { id: creatorId } } } : {}),
      },
    });
    created.events++;
  }

  // 4) Memberships
  for (const m of data.memberships) {
    const key = keyMembership(m);
    const action = req.actions.memberships[key] ?? "skip";
    const userId = userEmailToId.get(m.userEmail);
    const groupId = groupSourceIdToId.get(m.groupSourceId);

    if (!userId || !groupId) {
      skipped.memberships++;
      continue;
    }

    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
      select: { id: true },
    });

    if (existing) {
      if (action === "skip") {
        skipped.memberships++;
        continue;
      }
      if (action === "overwrite") {
        await prisma.groupMember.update({
          where: { userId_groupId: { userId, groupId } },
          data: { role: m.role, status: m.status },
        });
        updated.memberships++;
        continue;
      }

      // copy makes no sense for unique constraint; treat as overwrite
      await prisma.groupMember.update({
        where: { userId_groupId: { userId, groupId } },
        data: { role: m.role, status: m.status },
      });
      updated.memberships++;
      notes.push(`Membership copy treated as overwrite: ${m.userEmail} -> group ${m.groupSourceId}`);
      continue;
    }

    if (action === "skip") {
      skipped.memberships++;
      continue;
    }

    await prisma.groupMember.create({
      data: { userId, groupId, role: m.role, status: m.status },
    });
    created.memberships++;
  }

  // 5) Uploads: extract only missing files
  const entries = await runTarList(archivePath, projectRoot);
  const uploadEntries = entries.filter((p) => p.startsWith("uploads/") && !p.endsWith("/"));
  const missing: string[] = [];
  for (const p of uploadEntries) {
    const fn = p.replace(/^uploads\//, "");
    const safe = safeUploadFilename(fn);
    if (!safe) continue;
    const dest = path.join(uploadsDir, safe);
    const exists = await stat(dest).then(() => true).catch(() => false);
    if (!exists) missing.push(safe);
  }

  if (missing.length > 0) {
    const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-transfer-uploads-"));
    try {
      const args = ["-xzf", archivePath, "-C", tmpRoot, ...missing.map((m) => `uploads/${m}`)];
      await runTar(args, projectRoot);
      const extractedUploads = path.join(tmpRoot, "uploads");
      await mkdir(uploadsDir, { recursive: true });
      const files = await readdir(extractedUploads).catch(() => []);
      for (const f of files) {
        const safe = safeUploadFilename(f);
        if (!safe) continue;
        const src = path.join(extractedUploads, safe);
        const dest = path.join(uploadsDir, safe);
        const exists = await stat(dest).then(() => true).catch(() => false);
        if (exists) continue;
        await cp(src, dest);
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  }

  return { ok: true, created, updated, skipped, notes };
}

export async function storeUploadedTransferArchive(originalName: string, buf: Buffer) {
  const projectRoot = resolveProjectRoot();
  const backupDir = await resolveBackupDir(projectRoot);

  const safeOriginal = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeName = `transfer-upload-${Date.now()}-${safeOriginal}`;
  const outPath = path.join(backupDir, safeName);

  await writeFile(outPath, buf, { mode: 0o600 });
  const s = await stat(outPath);
  return { filename: safeName, size: s.size, createdAt: s.mtimeMs };
}

export async function getTransferArchiveBuffer(filename: string) {
  const projectRoot = resolveProjectRoot();
  const backupDir = await resolveBackupDir(projectRoot);
  if (!isSafeTransferFilename(filename)) throw new Error("Ungültiger Transfer-Dateiname");
  const fullPath = path.join(backupDir, filename);
  const data = await readFile(fullPath).catch(() => null);
  if (!data) throw new Error("Nicht gefunden");
  return data;
}

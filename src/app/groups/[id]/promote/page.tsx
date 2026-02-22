import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import PrintButton from "@/components/ui/PrintButton";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import { Prisma } from "@prisma/client";

async function getPublicOrigin() {
  const envSiteUrl = (process.env.SITE_URL || "").trim().replace(/\/$/, "");
  const envBase = (process.env.NEXTAUTH_URL || "").trim().replace(/\/$/, "");
  if (envSiteUrl) return envSiteUrl;
  if (envBase) return envBase;

  const h = await headers();
  const proto = (h.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

function formatEventDate(dt: Date) {
  return dt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}

function formatEventTime(dt: Date) {
  return dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
}

export default async function GroupPromotePage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;

  const baseSelect = {
    id: true,
    name: true,
    description: true,
    website: true,
    videoUrl: true,
    contactEmail: true,
    image: true,
    seekingMembers: true,
    performances: true,
    trainingTime: true,
    foundingYear: true,
    size: true,
    location: { select: { address: true } },
    tags: { select: { id: true, name: true } },
    events: {
      where: { startDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 5,
      select: { id: true, title: true, startDate: true, locationName: true },
    },
    danceStyles: {
      select: {
        id: true,
        level: true,
        mode: true,
        style: { select: { id: true, name: true } },
      },
      orderBy: { style: { name: "asc" } },
    },
  } as const;

  const baseSelectWithoutMode = {
    ...baseSelect,
    danceStyles: {
      select: {
        id: true,
        level: true,
        style: { select: { id: true, name: true } },
      },
      orderBy: { style: { name: "asc" } },
    },
  } as const;

  type GroupPromotePayloadWithMode = Prisma.GroupGetPayload<{ select: typeof baseSelect }>;
  type GroupPromotePayloadWithoutMode = Prisma.GroupGetPayload<{ select: typeof baseSelectWithoutMode }>;

  let group: GroupPromotePayloadWithMode | GroupPromotePayloadWithoutMode | null = null;

  try {
    group = (await prisma.group.findUnique({
      where: { id },
      select: baseSelect as unknown as Prisma.GroupSelect,
    })) as unknown as GroupPromotePayloadWithMode;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unknown field `mode`") || msg.includes("Unknown field 'mode'")) {
      group = (await prisma.group.findUnique({
        where: { id },
        select: baseSelectWithoutMode as unknown as Prisma.GroupSelect,
      })) as unknown as GroupPromotePayloadWithoutMode;
    } else {
      throw err;
    }
  }

  if (!group) {
    notFound();
  }

  const origin = await getPublicOrigin();
  const groupUrl = origin ? `${origin}/groups/${group.id}` : `/groups/${group.id}`;
  const qrDataUrl = await QRCode.toDataURL(groupUrl, {
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M",
    color: { dark: "#111827", light: "#FFFFFF" },
  });

  const videoUrl = (group.videoUrl || "").toString().trim();
  const videoQrDataUrl = videoUrl
    ? await QRCode.toDataURL(videoUrl, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
        color: { dark: "#111827", light: "#FFFFFF" },
      })
    : "";

  const normalizedLogo = group.image ? (normalizeUploadedImageUrl(String(group.image)) ?? String(group.image)) : "";
  const logoUrl = normalizedLogo ? (normalizedLogo.startsWith("/") && origin ? `${origin}${normalizedLogo}` : normalizedLogo) : "";

  const displayWebsite = (group.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const getLevelLabel = (level: string) => {
    const v = (level || "").toLowerCase();
    if (v === "beginner") return "Anfänger";
    if (v === "intermediate") return "Fortgeschritten";
    if (v === "advanced") return "Sehr fortgeschritten";
    if (v === "professional") return "Profi";
    return "";
  };

  const getModeLabel = (mode: string) => {
    const v = (mode || "").toLowerCase();
    if (v === "impro") return "Impro";
    if (v === "choreo") return "Choreo";
    if (v === "both") return "Impro + Choreo";
    return "";
  };

  const danceStyleBadges: Array<{ key: string; label: string }> = (group.danceStyles as unknown as Array<{ id: string; level: string; mode?: string | null; style: { name: string } }>).length
    ? (group.danceStyles as unknown as Array<{ id: string; level: string; mode?: string | null; style: { name: string } }>).map((ds) => {
        const parts = [getLevelLabel(ds.level), getModeLabel(ds.mode || "")].filter(Boolean);
        return { key: ds.id, label: parts.length ? `${ds.style.name} (${parts.join(" · ")})` : ds.style.name };
      })
    : (group.tags as Array<{ id: string; name: string }>).map((t) => ({ key: `tag-${t.id}`, label: t.name }));

  return (
    <div id="tf-promote-root" className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
#tf-promote-root {
  color-scheme: light;
  --background: #ffffff;
  --foreground: #111827;
  --surface: #ffffff;
  --surface-2: #f9fafb;
  --border: #e5e7eb;
  --muted: #6b7280;
  --link: #2563eb;
  --primary: #4f46e5;
  --primary-foreground: #ffffff;
  --primary-hover: #4338ca;
}

@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: #fff !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* Safari-safe: hide everything, then show only the promote root */
  body * { visibility: hidden !important; }
  #tf-promote-root, #tf-promote-root * { visibility: visible !important; }
  #tf-promote-root { position: absolute; left: 0; top: 0; width: 100%; }

  /* Remove app layout padding that can push content off-page */
  main, .container { padding: 0 !important; margin: 0 !important; max-width: none !important; }
  .no-print { display: none !important; }
  .sheet { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
  a { color: inherit !important; text-decoration: none !important; }

  /* Stronger print contrast */
  * { color: #111827 !important; }
}
`,
        }}
      />

      <div className="no-print max-w-3xl mx-auto mb-4 flex items-center justify-between gap-3">
        <Link href={`/groups/${group.id}`} className="text-sm text-[var(--link)] hover:opacity-90">
          ← Zur Gruppe
        </Link>
        <PrintButton className="tf-gothic-btn px-4 py-2 rounded-md shadow-sm text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]">
          Drucken
        </PrintButton>
      </div>

      <div className="sheet max-w-3xl mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-7 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-14 h-14 rounded-xl object-cover border border-[var(--border)] bg-white flex-shrink-0"
                  />
                ) : null}
                <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Steckbrief</div>
              <h1 className="tf-display text-3xl font-bold text-[var(--foreground)] mt-1 break-words">{group.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.seekingMembers ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] text-[var(--foreground)] font-medium border border-[var(--border)] text-sm">
                    👋 Sucht Mitglieder
                  </span>
                ) : null}
                {group.performances ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] text-[var(--foreground)] font-medium border border-[var(--border)] text-sm">
                    🎭 Auftritte möglich
                  </span>
                ) : null}
              </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <div className="flex items-start gap-3">
                <div className="text-center">
                  <img src={qrDataUrl} alt="QR Code" className="w-[120px] h-[120px] bg-white rounded-xl border border-[var(--border)] p-2" />
                  <div className="mt-2 text-xs text-[var(--muted)]">Gruppe</div>
                </div>
                {videoQrDataUrl ? (
                  <div className="text-center">
                    <img src={videoQrDataUrl} alt="QR Code Video" className="w-[120px] h-[120px] bg-white rounded-xl border border-[var(--border)] p-2" />
                    <div className="mt-2 text-xs text-[var(--muted)]">Video</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-7 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <section>
              <h2 className="tf-display text-base font-bold text-[var(--foreground)]">Über uns</h2>
              <div className="mt-2 text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{group.description || ""}</div>
            </section>

            <section>
              <h2 className="tf-display text-base font-bold text-[var(--foreground)]">Tanzstile</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {danceStyleBadges.length ? (
                  danceStyleBadges.map((item) => (
                    <span
                      key={item.key}
                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] text-sm"
                    >
                      {item.label}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--muted)]">Keine Tanzstile hinterlegt</span>
                )}
              </div>
            </section>

            <section>
              <h2 className="tf-display text-base font-bold text-[var(--foreground)]">Kommende Events</h2>
              <div className="mt-2">
                {(group.events as Array<{ id: string; title: string; startDate: Date; locationName: string | null }>).length ? (
                  <div className="space-y-2">
                    {(group.events as Array<{ id: string; title: string; startDate: Date; locationName: string | null }>).map((e) => (
                      <div key={e.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="font-semibold text-sm text-[var(--foreground)]">{e.title}</div>
                          <div className="text-xs text-[var(--muted)]">
                            {formatEventDate(new Date(e.startDate))} · {formatEventTime(new Date(e.startDate))}
                          </div>
                        </div>
                        {e.locationName ? <div className="mt-1 text-xs text-[var(--muted)]">📍 {e.locationName}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--muted)]">Aktuell keine Events geplant</div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <h2 className="tf-display text-base font-bold text-[var(--foreground)]">Details</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {group.location?.address ? (
                  <div className="flex gap-2">
                    <dt className="text-[var(--muted)] w-24">Standort</dt>
                    <dd className="text-[var(--foreground)] flex-1">{group.location.address}</dd>
                  </div>
                ) : null}
                {group.trainingTime ? (
                  <div className="flex gap-2">
                    <dt className="text-[var(--muted)] w-24">Training</dt>
                    <dd className="text-[var(--foreground)] flex-1">{group.trainingTime}</dd>
                  </div>
                ) : null}
                {group.foundingYear ? (
                  <div className="flex gap-2">
                    <dt className="text-[var(--muted)] w-24">Gegründet</dt>
                    <dd className="text-[var(--foreground)] flex-1">{group.foundingYear}</dd>
                  </div>
                ) : null}
                {group.size ? (
                  <div className="flex gap-2">
                    <dt className="text-[var(--muted)] w-24">Größe</dt>
                    <dd className="text-[var(--foreground)] flex-1">{group.size}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <h2 className="tf-display text-base font-bold text-[var(--foreground)]">Kontakt</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2">
                  <div className="text-[var(--muted)] w-24">E-Mail</div>
                  <div className="text-[var(--foreground)] flex-1 break-words">{group.contactEmail || "(nicht hinterlegt)"}</div>
                </div>
                <div className="flex gap-2">
                  <div className="text-[var(--muted)] w-24">Web</div>
                  <div className="text-[var(--foreground)] flex-1 break-words">{displayWebsite || "(nicht hinterlegt)"}</div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="px-8 py-4 border-t border-[var(--border)] text-xs text-[var(--muted)] flex items-center justify-between gap-4">
          <div>Erstellt mit TribeFinder.de</div>
          <div>{new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}</div>
        </div>
      </div>
    </div>
  );
}

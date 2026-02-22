import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";

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

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      location: true,
      tags: true,
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
          style: { select: { id: true, name: true } },
        },
        orderBy: { style: { name: "asc" } },
      },
    },
  });

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

  const displayWebsite = (group.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const danceStyleNames = group.danceStyles.length
    ? group.danceStyles.map((ds) => ds.style.name)
    : group.tags.map((t) => t.name);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: #fff !important; }
  .no-print { display: none !important; }
  .sheet { box-shadow: none !important; border: none !important; }
  a { color: inherit !important; text-decoration: none !important; }
}
`,
        }}
      />

      <div className="no-print max-w-3xl mx-auto mb-4 flex items-center justify-between gap-3">
        <Link href={`/groups/${group.id}`} className="text-sm text-[var(--link)] hover:opacity-90">
          ← Zur Gruppe
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="tf-gothic-btn px-4 py-2 rounded-md shadow-sm text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
        >
          Drucken
        </button>
      </div>

      <div className="sheet max-w-3xl mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-7 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-start justify-between gap-6">
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

            <div className="flex-shrink-0 text-center">
              <img src={qrDataUrl} alt="QR Code" className="w-[120px] h-[120px] bg-white rounded-xl border border-[var(--border)] p-2" />
              <div className="mt-2 text-xs text-[var(--muted)]">Zur Gruppe</div>
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
                {danceStyleNames.length ? (
                  danceStyleNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] text-sm"
                    >
                      {name}
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
                {group.events.length ? (
                  <div className="space-y-2">
                    {group.events.map((e) => (
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
                <div className="pt-2 text-xs text-[var(--muted)] break-words">Link: {groupUrl}</div>
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

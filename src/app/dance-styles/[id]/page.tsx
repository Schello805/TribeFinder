import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DanceStyleEditSuggestionForm from "@/components/dance-styles/DanceStyleEditSuggestionForm";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

function toYoutubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`;
      const parts = u.pathname.split("/").filter(Boolean);
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parts[shortsIdx + 1])}`;
      }
      const idx = parts.indexOf("embed");
      if (idx >= 0 && parts[idx + 1]) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parts[idx + 1])}`;
    }

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    }

    return null;
  } catch {
    return null;
  }
}

async function isYoutubeVideoAvailable(url: string): Promise<boolean> {
  try {
    const oembed = new URL("https://www.youtube.com/oembed");
    oembed.searchParams.set("url", url);
    oembed.searchParams.set("format", "json");

    const res = await fetch(oembed.toString(), { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function DanceStyleDetailPage({ params }: RouteParams) {
  const { id } = await params;

  const session = await getServerSession(authOptions).catch(() => null);

  let decodedKey = id;
  try {
    decodedKey = decodeURIComponent(id);
  } catch {
    decodedKey = id;
  }

  const danceStyleDelegate = (prisma as unknown as { danceStyle?: unknown }).danceStyle as
    | undefined
    | {
        findUnique: (args: unknown) => Promise<
          | {
              id: string;
              name: string;
              category: string | null;
              formerName: string | null;
              websiteUrl: string | null;
              videoUrl: string | null;
              description: string | null;
            }
          | null
        >;
        findFirst: (args: unknown) => Promise<
          | {
              id: string;
              name: string;
              category: string | null;
              formerName: string | null;
              websiteUrl: string | null;
              videoUrl: string | null;
              description: string | null;
            }
          | null
        >;
      };

  if (!danceStyleDelegate) notFound();

  const select = {
    id: true,
    name: true,
    category: true,
    formerName: true,
    websiteUrl: true,
    videoUrl: true,
    description: true,
  };

  const styleById = await danceStyleDelegate
    .findUnique({
      where: { id },
      select,
    })
    .catch((e) => {
      throw e;
    });

  const styleByDecodedId =
    !styleById && decodedKey !== id
      ? await danceStyleDelegate
          .findUnique({
            where: { id: decodedKey },
            select,
          })
          .catch((e) => {
            throw e;
          })
      : null;

  let style:
    | {
        id: string;
        name: string;
        category: string | null;
        formerName: string | null;
        websiteUrl: string | null;
        videoUrl: string | null;
        description: string | null;
      }
    | null = null;

  try {
    style =
      styleById ||
      styleByDecodedId ||
      (await danceStyleDelegate.findFirst({
        where: { name: decodedKey },
        select,
      }));
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return (
        <div className="max-w-3xl mx-auto px-4 sm:px-0 pb-12">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-2">
            <div className="tf-display text-lg font-bold text-[var(--foreground)]">Tanzstil konnte nicht geladen werden</div>
            <div className="text-sm text-[var(--muted)]">
              Deine Datenbank ist vermutlich nicht mit dem aktuellen Schema synchron. Bitte Migration/Generate ausführen und den Server neu starten.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-0 pb-12">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-2">
          <div className="tf-display text-lg font-bold text-[var(--foreground)]">Tanzstil konnte nicht geladen werden</div>
          <div className="text-sm text-[var(--muted)]">Unbekannter Fehler beim Laden.</div>
        </div>
      </div>
    );
  }

  if (!style) {
    if (process.env.NODE_ENV !== "production") {
      return (
        <div className="max-w-3xl mx-auto px-4 sm:px-0 pb-12">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
            <div className="tf-display text-lg font-bold text-[var(--foreground)]">Tanzstil nicht gefunden</div>
            <div className="text-sm text-[var(--muted)]">
              Der Tanzstil konnte mit diesem Parameter nicht geladen werden. Debug-Infos (nur in Development):
            </div>
            <div className="text-sm text-[var(--foreground)] space-y-1">
              <div>
                <span className="font-medium">Param:</span> <span className="break-all">{id}</span>
              </div>
              <div>
                <span className="font-medium">decodedKey:</span> <span className="break-all">{decodedKey}</span>
              </div>
              <div>
                <span className="font-medium">Tried unique id:</span> <span>{styleById ? "FOUND" : "NOT FOUND"}</span>
              </div>
              <div>
                <span className="font-medium">Tried unique decoded id:</span> <span>{styleByDecodedId ? "FOUND" : "NOT FOUND"}</span>
              </div>
              <div>
                <span className="font-medium">Tried name:</span> <span>{decodedKey}</span>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/dance-styles" className="text-sm text-[var(--link)] hover:underline">
                Zurück zur Tanzstile-Liste
              </Link>
            </div>
          </div>
        </div>
      );
    }

    notFound();
  }

  const [groupsCount, dancersCount] = await Promise.all([
    prisma.groupDanceStyle.count({ where: { styleId: style.id } }).catch(() => 0),
    prisma.userDanceStyle
      .count({
        where: {
          styleId: style.id,
          user: {
            isDancerProfileEnabled: true,
          },
        },
      })
      .catch(() => 0),
  ]);

  const youtubeEmbed = style.videoUrl ? toYoutubeEmbed(style.videoUrl) : null;
  const shouldShowVideo =
    !!style.videoUrl &&
    !!youtubeEmbed &&
    (await isYoutubeVideoAvailable(style.videoUrl).catch(() => false));

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0 pb-12">
      <div className="space-y-2">
        <div className="text-sm text-[var(--muted)]">
          <Link href="/dance-styles" className="text-[var(--link)] hover:underline">
            Tanzstile
          </Link>
          <span className="mx-2">/</span>
          <span>{style.name}</span>
        </div>
        <h1 className="tf-display text-3xl font-extrabold text-[var(--foreground)]">{style.name}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-2)] border border-[var(--border)] ${
              style.category ? "text-[var(--foreground)]" : "text-[var(--muted)]"
            }`}
            title="Kategorie"
          >
            {style.category || "Keine Kategorie"}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)]">
            Gruppen: {groupsCount}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)]">
            Tänzerinnen: {dancersCount}
          </span>
        </div>

        <div className="text-sm text-[var(--muted)]">
          <span className="font-medium">Voriger Name:</span> {style.formerName || "—"}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">

        <div>
          <div className="text-sm font-medium text-[var(--foreground)]">Website</div>
          {style.websiteUrl ? (
            <a href={style.websiteUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--link)] hover:underline break-all">
              {style.websiteUrl}
            </a>
          ) : (
            <div className="text-sm text-[var(--muted)]">—</div>
          )}
        </div>

        <div>
          <div className="text-sm font-medium text-[var(--foreground)]">Beschreibung</div>
          {style.description ? (
            <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{style.description}</div>
          ) : (
            <div className="text-sm text-[var(--muted)]">Noch keine Angaben.</div>
          )}
        </div>

        {shouldShowVideo ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Video</div>
            <a href={style.videoUrl!} target="_blank" rel="noreferrer" className="text-sm text-[var(--link)] hover:underline break-all">
              {style.videoUrl}
            </a>
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-[var(--border)] bg-black">
              <iframe
                src={youtubeEmbed!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${style.name} Video`}
              />
            </div>
          </div>
        ) : null}

        <div className="pt-2">
          <Link
            href={`/groups?tag=${encodeURIComponent(style.name)}`}
            className="text-sm text-[var(--link)] hover:underline"
          >
            Gruppen mit diesem Tanzstil ansehen
          </Link>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
        <h2 className="tf-display text-lg font-bold text-[var(--foreground)]">Änderung vorschlagen</h2>
        {session?.user?.id ? (
          <DanceStyleEditSuggestionForm
            styleId={style.id}
            styleName={style.name}
            initialCategory={style.category}
            initialFormerName={style.formerName}
            initialWebsiteUrl={style.websiteUrl}
            initialVideoUrl={style.videoUrl}
            initialDescription={style.description}
          />
        ) : (
          <div className="text-sm text-[var(--muted)]">
            Bitte <Link href="/auth/signin" className="text-[var(--link)] hover:underline">einloggen</Link>, um Änderungen vorzuschlagen.
          </div>
        )}
      </div>
    </div>
  );
}

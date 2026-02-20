import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import UserPresenceStatus from "@/components/presence/UserPresenceStatus";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function UserPublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;

  const session = await getServerSession(authOptions);

  type UserPublicProfile = {
    id: string;
    name: string | null;
    image: string | null;
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
    memberships: Array<{
      role: string;
      createdAt: Date;
      group: { id: string; name: string; image: string | null };
    }>;
  };

  const user = (await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
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
      memberships: {
        where: { status: "APPROVED" },
        select: {
          role: true,
          createdAt: true,
          group: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  } as unknown as Parameters<typeof prisma.user.findUnique>[0])) as unknown as UserPublicProfile | null;

  if (!user) notFound();

  if (!user.isDancerProfileEnabled) notFound();
  if (user.isDancerProfilePrivate && !session?.user?.id) notFound();

  const displayName = user.dancerName || user.name || "Unbekannt";
  const avatar = normalizeUploadedImageUrl(user.image) ?? "";
  const memberships = user.memberships;
  type Membership = UserPublicProfile["memberships"][number];
  const hasPhase2 =
    user.dancerTeaches ||
    Boolean(user.dancerTeachingWhere?.trim()) ||
    Boolean(user.dancerTeachingFocus?.trim()) ||
    Boolean(user.dancerEducation?.trim()) ||
    Boolean(user.dancerPerformances?.trim()) ||
    user.dancerGivesWorkshops ||
    user.dancerBookableForShows ||
    Boolean(user.dancerWorkshopConditions?.trim());

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0">
      <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="h-24 sm:h-32 bg-[var(--primary)] relative">
          <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        <div className="px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-10 sm:-mt-12 gap-4 sm:gap-6 relative z-10">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={displayName}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border-4 border-[var(--surface)] shadow-lg"
              />
            ) : (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] font-bold text-3xl border-4 border-[var(--surface)] shadow-lg">
                {displayName.charAt(0)}
              </div>
            )}

            <div className="flex-1 text-center sm:text-left min-w-0">
              <h1 className="tf-display text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight break-words">
                {displayName}
              </h1>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex justify-center sm:justify-start">
                  <UserPresenceStatus userId={user.id} />
                </div>
                {memberships.length > 0 ? (
                  <div className="flex justify-center sm:justify-start">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)]">
                      In {memberships.length} Gruppe{memberships.length === 1 ? "" : "n"}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {user.bio ? (
            <div className="mt-5">
              <div className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Über mich</div>
              <p className="text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{user.bio}</p>
            </div>
          ) : null}
        </div>
      </div>

      {hasPhase2 ? (
        <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
          <h2 className="tf-display text-lg font-bold text-[var(--foreground)]">Unterricht & Erfahrung</h2>
          <div className="mt-4 space-y-4">
            {user.dancerTeaches ? (
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Unterricht</div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  {user.dancerTeachingWhere ? user.dancerTeachingWhere : "Ja"}
                </div>
              </div>
            ) : null}

            {user.dancerTeachingFocus ? (
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Schwerpunkte</div>
                <div className="mt-1 text-sm text-[var(--muted)] whitespace-pre-wrap">{user.dancerTeachingFocus}</div>
              </div>
            ) : null}

            {user.dancerEducation ? (
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Ausbildung / Training</div>
                <div className="mt-1 text-sm text-[var(--muted)] whitespace-pre-wrap">{user.dancerEducation}</div>
              </div>
            ) : null}

            {user.dancerPerformances ? (
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Auftritte / Referenzen</div>
                <div className="mt-1 text-sm text-[var(--muted)] whitespace-pre-wrap">{user.dancerPerformances}</div>
              </div>
            ) : null}

            {user.dancerGivesWorkshops ? (
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Workshops</div>
                <div className="mt-1 text-sm text-[var(--muted)]">Ja</div>
              </div>
            ) : null}

            {user.dancerBookableForShows ? (
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Für Auftritte buchbar</div>
                <div className="mt-1 text-sm text-[var(--muted)]">Ja</div>
              </div>
            ) : null}

            {user.dancerWorkshopConditions ? (
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Konditionen</div>
                <div className="mt-1 text-sm text-[var(--muted)] whitespace-pre-wrap">{user.dancerWorkshopConditions}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
        <h2 className="tf-display text-lg font-bold text-[var(--foreground)]">Gruppen</h2>
        {memberships.length > 0 ? (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {memberships.map((m: Membership) => (
              <li key={`${m.group.id}-${m.createdAt.toISOString?.() ?? String(m.createdAt)}`} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {m.group.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={normalizeUploadedImageUrl(m.group.image) ?? ""} alt={m.group.name} className="h-10 w-10 rounded-lg object-cover border border-[var(--border)]" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] font-bold">
                      {m.group.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="tf-display font-medium text-[var(--foreground)] truncate">{m.group.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
                        {m.role === "ADMIN" ? "Gruppenleitung" : "Mitglied"}
                      </span>
                      <span>
                        Seit {new Date(m.createdAt).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/groups/${m.group.id}`}
                  className="text-[var(--link)] hover:underline text-sm font-medium"
                >
                  Zur Gruppe
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[var(--muted)]">Noch keine Gruppen hinterlegt.</p>
        )}
      </div>

      <div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/taenzerinnen" className="text-[var(--muted)] hover:text-[var(--link)] font-medium">
            Zurück zu Tänzerinnen
          </Link>
          <Link href="/groups" className="text-[var(--muted)] hover:text-[var(--link)] font-medium">
            Zurück zu Gruppen
          </Link>
        </div>
      </div>
    </div>
  );
}

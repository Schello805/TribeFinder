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
    Boolean(user.dancerPerformances?.trim());

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
        <div className="flex items-center gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={displayName} className="h-16 w-16 rounded-full object-cover border border-[var(--border)]" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] font-bold text-2xl border border-[var(--border)]">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="tf-display text-2xl font-bold text-[var(--foreground)] truncate">{displayName}</h1>
            {user.bio ? (
              <p className="mt-1 text-[var(--muted)] whitespace-pre-wrap">{user.bio}</p>
            ) : null}
            <UserPresenceStatus userId={user.id} />
          </div>
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

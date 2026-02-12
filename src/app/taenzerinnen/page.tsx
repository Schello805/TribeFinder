import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

export default async function DancersPage() {
  const session = await getServerSession(authOptions);
  const showPrivate = Boolean(session?.user?.id);

  type Membership = { role: string; group: { id: string; name: string } };
  type Dancer = {
    id: string;
    name: string | null;
    dancerName: string | null;
    image: string | null;
    bio: string | null;
    memberships: Membership[];
  };

  const dancers = (await prisma.user.findMany({
    where: {
      isDancerProfileEnabled: true,
      ...(showPrivate ? {} : { isDancerProfilePrivate: false }),
    },
    select: {
      id: true,
      name: true,
      dancerName: true,
      image: true,
      bio: true,
      memberships: {
        where: { status: "APPROVED" },
        select: {
          role: true,
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  })) as unknown as Dancer[];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
        <h1 className="tf-display text-2xl font-bold text-[var(--foreground)]">Tänzerinnen</h1>
        <p className="mt-2 text-[var(--muted)]">
          Hier findest du Tänzerinnen, die ein Profil angelegt haben.
        </p>
        {session?.user?.id ? (
          <div className="mt-4">
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition"
            >
              Tänzerinnenprofil erstellen
            </Link>
            <div className="mt-2 text-sm text-[var(--muted)]">
              Dort kannst du „Als Tänzerin eintragen“ aktivieren und optional dein Profil privat lassen.
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Anmelden, um ein Tänzerinnenprofil zu erstellen
            </Link>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Hinweis: Private Profile werden nur eingeloggten Besuchern angezeigt.
            </p>
          </div>
        )}
      </div>

      {dancers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dancers.map((d: Dancer) => {
            const displayName = d.dancerName || d.name || "Unbekannt";
            const avatar = normalizeUploadedImageUrl(d.image) ?? "";
            const groups = d.memberships.map((m: Membership) => ({
              id: m.group.id,
              name: m.group.name,
              role: m.role,
            }));

            return (
              <Link
                key={d.id}
                href={`/users/${d.id}`}
                className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl border border-[var(--border)] p-5 shadow-sm hover:bg-[var(--surface-hover)] transition"
              >
                <div className="flex items-center gap-4">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={displayName} className="h-14 w-14 rounded-full object-cover border border-[var(--border)]" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] font-bold text-xl border border-[var(--border)]">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="tf-display text-lg font-bold truncate">{displayName}</div>
                    {d.bio ? (
                      <div className="mt-1 text-sm text-[var(--muted)] line-clamp-2 whitespace-pre-wrap">
                        {d.bio}
                      </div>
                    ) : null}
                    {groups.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {groups.slice(0, 3).map((g: { id: string; name: string; role: string }) => (
                          <span
                            key={g.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--muted)]"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl border border-[var(--border)] p-6">
          <p className="text-[var(--muted)]">Noch keine Tänzerinnen-Profile vorhanden.</p>
        </div>
      )}
    </div>
  );
}

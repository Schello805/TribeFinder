import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DanceStyleSuggestionForm from "@/components/dance-styles/DanceStyleSuggestionForm";
import DanceStylesDirectory from "@/components/dance-styles/DanceStylesDirectory";

export const dynamic = "force-dynamic";

export default async function DanceStylesDirectoryPage() {
  const session = await getServerSession(authOptions).catch(() => null);

  const styles = await prisma.danceStyle.findMany({
    select: { id: true, name: true, category: true },
    orderBy: { name: "asc" },
  });

  const [groupCountsRaw, dancerCountsRaw] = await Promise.all([
    prisma.groupDanceStyle.groupBy({
      by: ["styleId"],
      _count: { _all: true },
    }),
    prisma.userDanceStyle.groupBy({
      by: ["styleId"],
      where: {
        user: {
          isDancerProfileEnabled: true,
        },
      },
      _count: { _all: true },
    }),
  ]);

  const groupCounts = new Map<string, number>(
    (groupCountsRaw as unknown as Array<{ styleId: string; _count: { _all: number } }>).map((x) => [x.styleId, x._count._all])
  );
  const dancerCounts = new Map<string, number>(
    (dancerCountsRaw as unknown as Array<{ styleId: string; _count: { _all: number } }>).map((x) => [x.styleId, x._count._all])
  );

  const stylesWithCounts = styles.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    groups: groupCounts.get(s.id) ?? 0,
    dancers: dancerCounts.get(s.id) ?? 0,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0 pb-12">
      <div className="space-y-2">
        <h1 className="tf-display text-3xl font-extrabold text-[var(--foreground)]">Tanzstile</h1>
        <p className="text-[var(--muted)]">
          Übersicht aller Tanzstile auf TribeFinder – inkl. wie viele Gruppen und Tänzerinnen diese Stile nutzen.
        </p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
        <h2 className="tf-display text-lg font-bold text-[var(--foreground)]">Neuen Tanzstil vorschlagen</h2>
        {session?.user?.id ? (
          <DanceStyleSuggestionForm />
        ) : (
          <div className="text-sm text-[var(--muted)]">
            Bitte <Link href="/auth/signin" className="text-[var(--link)] hover:underline">einloggen</Link>, um einen neuen Tanzstil vorzuschlagen.
          </div>
        )}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="tf-display text-lg font-bold text-[var(--foreground)]">Stile ({styles.length})</h2>
          <Link href="/groups" className="text-sm text-[var(--link)] hover:underline">
            Zu den Gruppen
          </Link>
        </div>

        <DanceStylesDirectory styles={stylesWithCounts} />
      </div>
    </div>
  );
}

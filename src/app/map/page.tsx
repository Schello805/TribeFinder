import prisma from "@/lib/prisma";
import DynamicMap from "@/components/map/DynamicMap";

export const revalidate = 60; // Revalidate every minute

type ExternalLinkMapRow = {
  id: string;
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

function getExternalLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        findMany: (args: unknown) => Promise<ExternalLinkMapRow[]>;
      };
}

export default async function MapPage() {
  const delegate = getExternalLinkDelegate(prisma);

  const [groups, events, tags, links] = await Promise.all([
    prisma.group.findMany({
      include: {
        location: true,
        tags: true
      }
    }),
    prisma.event.findMany({
      where: {
        startDate: {
          gte: new Date(),
        },
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
        creator: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.tag.findMany({
      where: {
        isApproved: true,
        groups: { some: {} },
      },
      orderBy: { name: 'asc' }
    }),
    delegate
      ? delegate.findMany({
          where: {
            status: "APPROVED",
            archivedAt: null,
            lat: { not: null },
            lng: { not: null },
          },
          select: {
            id: true,
            url: true,
            title: true,
            category: true,
            postalCode: true,
            city: true,
            lat: true,
            lng: true,
          },
          orderBy: { title: "asc" },
          take: 500,
        })
      : Promise.resolve([] as ExternalLinkMapRow[]),
  ]);

  const availableTags = tags.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }));

  return (
    <div className="h-full w-full">
       <DynamicMap groups={groups} events={events} availableTags={availableTags} links={links} />
    </div>
  );
}

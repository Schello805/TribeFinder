import prisma from "@/lib/prisma";
import DynamicMap from "@/components/map/DynamicMap";

export const revalidate = 60; // Revalidate every minute

export default async function MapPage() {
  const [groups, events, tags] = await Promise.all([
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
      },
    }),
    prisma.tag.findMany({
      where: { isApproved: true },
      orderBy: { name: 'asc' }
    })
  ]);

  return (
    <div className="h-full w-full">
       <DynamicMap groups={groups} events={events} availableTags={tags} />
    </div>
  );
}

import GroupFilter from "@/components/groups/GroupFilter";
import GroupListAnimated from "@/components/groups/GroupListAnimated";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const revalidate = 0; // Dynamic page

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  const query = typeof resolvedSearchParams.query === 'string' ? resolvedSearchParams.query : undefined;
  const tagParam = typeof resolvedSearchParams.tag === 'string' ? resolvedSearchParams.tag : undefined;
  const latParam = typeof resolvedSearchParams.lat === 'string' ? resolvedSearchParams.lat : undefined;
  const lngParam = typeof resolvedSearchParams.lng === 'string' ? resolvedSearchParams.lng : undefined;
  const radiusParam = typeof resolvedSearchParams.radius === 'string' ? resolvedSearchParams.radius : '50';

  const whereClause: {
    AND: Array<{
      OR?: Array<{ name?: { contains: string }; description?: { contains: string }; tags?: { some: { name: { contains: string } } } }>;
      tags?: { some: { name: string } };
    }>;
  } = {
    AND: []
  };
  
  if (query) {
    whereClause.AND.push({
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
        { tags: { some: { name: { contains: query } } } }
      ]
    });
  }

  if (tagParam) {
    whereClause.AND.push({
      tags: { some: { name: tagParam } }
    });
  }

  let groups = await prisma.group.findMany({
    where: whereClause,
    include: {
      location: true,
      tags: true,
      owner: {
        select: {
          name: true,
          image: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Geo-Filtering
  if (latParam && lngParam) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    const radius = parseFloat(radiusParam);

    if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
      groups = groups.filter((group) => {
        if (!group.location) return false;
        
        const R = 6371; // Erdradius in km
        const dLat = (group.location.lat - lat) * Math.PI / 180;
        const dLng = (group.location.lng - lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(group.location.lat * Math.PI / 180) * 
          Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const distance = R * c;

        return distance <= radius;
      });

      // Sortieren nach Distanz
      groups.sort((a, b) => {
        if (!a.location || !b.location) return 0;
        const distA = Math.sqrt(Math.pow(a.location.lat - lat, 2) + Math.pow(a.location.lng - lng, 2));
        const distB = Math.sqrt(Math.pow(b.location.lat - lat, 2) + Math.pow(b.location.lng - lng, 2));
        return distA - distB;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tanzgruppen finden</h1>
        <Link
          href="/groups/create"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          + Neue Gruppe erstellen
        </Link>
      </div>

      <GroupFilter />

      <GroupListAnimated groups={groups as unknown} />
    </div>
  );
}

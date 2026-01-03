"use client";

import Link from "next/link";

interface Participation {
  id: string;
  status: string;
  group: {
    id: string;
    name: string;
    image?: string | null;
    size?: string | null;
  };
}

interface EventParticipantsListProps {
  participations: Participation[];
}

export default function EventParticipantsList({ participations }: EventParticipantsListProps) {
  // Only show APPROVED participations in the public list
  const approved = participations.filter((p) => p.status === "APPROVED");

  if (approved.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Bestätigte Acts & Gruppen</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {approved.map((p) => (
          <Link 
            key={p.id} 
            href={`/groups/${p.group.id}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition bg-white group"
          >
            {p.group.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.group.image}
                alt={p.group.name}
                className="w-12 h-12 rounded-full object-cover border border-gray-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold border border-indigo-100">
                {p.group.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition">{p.group.name}</div>
              <div className="text-xs text-gray-500">
                 {p.group.size === 'SOLO' ? 'Solo' : (p.group.size === 'SMALL' ? 'Kleine Gruppe' : 'Große Gruppe')}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

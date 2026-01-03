'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface GroupListAnimatedProps {
  groups: GroupListAnimatedItem[];
}

interface GroupTag {
  id: string;
  name: string;
}

interface GroupListAnimatedItem {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  createdAt: string | Date;
  size?: 'SOLO' | 'SMALL' | 'LARGE' | null;
  location?: {
    address?: string | null;
  } | null;
  tags: GroupTag[];
}

export default function GroupListAnimated({ groups }: GroupListAnimatedProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (groups.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-12 text-center text-gray-500">
          <p>Keine Gruppen gefunden.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.ul 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {groups.map((group) => (
        <motion.li 
          key={group.id} 
          variants={item}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100"
        >
          <Link href={`/groups/${group.id}`} className="block p-4 sm:p-6 group">
            <div className="flex items-start sm:items-center justify-between gap-6">
              {/* Logo with slight animation on hover */}
              <div className="flex-shrink-0 h-20 w-20 sm:h-24 sm:w-24 rounded-lg overflow-hidden bg-white border border-gray-100 relative group-hover:scale-105 transition-transform duration-300 shadow-sm flex items-center justify-center">
                {group.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={group.image} alt={group.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-indigo-200 font-bold text-3xl bg-gradient-to-br from-indigo-50 to-white">
                    {group.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {group.name}
                    </h3>
                    {group.location && (
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <span className="mr-1">📍</span> {group.location.address || "Standort auf Karte"}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full whitespace-nowrap">
                    {new Date(group.createdAt).toLocaleDateString('de-DE')}
                  </span>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                  {group.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {group.size && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {group.size === 'SOLO' && '👤 Solo'}
                      {group.size === 'SMALL' && '👥 < 10'}
                      {group.size === 'LARGE' && '👨‍👩‍👧‍👦 > 10'}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags.map((tag) => (
                      <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="hidden sm:flex self-center text-gray-300">
                <svg className="h-6 w-6 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}

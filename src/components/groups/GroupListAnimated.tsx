'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { normalizeUploadedImageUrl } from '@/lib/normalizeUploadedImageUrl';
import LikeButton from '@/components/groups/LikeButton';

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
  likeCount?: number;
  likedByMe?: boolean;
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
      <div className="bg-[var(--surface)] text-[var(--foreground)] shadow overflow-hidden sm:rounded-lg border border-[var(--border)]">
        <div className="px-4 py-12 text-center text-[var(--muted)]">
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
          className="bg-[var(--surface)] text-[var(--foreground)] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-[var(--border)]"
        >
          <Link href={`/groups/${group.id}`} className="block p-4 sm:p-6 group">
            <div className="flex items-start sm:items-center justify-between gap-6">
              {/* Logo with slight animation on hover */}
              <div className="flex-shrink-0 h-20 w-20 sm:h-24 sm:w-24 rounded-lg overflow-hidden bg-[var(--surface)] border border-[var(--border)] relative group-hover:scale-105 transition-transform duration-300 shadow-sm flex items-center justify-center">
                {group.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={normalizeUploadedImageUrl(group.image) ?? ""} alt={group.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[var(--link)] font-bold text-3xl bg-[var(--surface-2)]">
                    {group.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="tf-display text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--link)] transition-colors">
                      {group.name}
                    </h3>
                    {group.location && (
                      <p className="text-sm text-[var(--muted)] flex items-center mt-1">
                        <span className="mr-1">📍</span> {group.location.address || "Standort auf Karte"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <LikeButton
                      groupId={group.id}
                      initialCount={typeof group.likeCount === "number" ? group.likeCount : 0}
                      initialLikedByMe={Boolean(group.likedByMe)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition disabled:opacity-50"
                    />
                    <span className="text-xs font-medium text-[var(--muted)] bg-[var(--surface-2)] px-2 py-1 rounded-full whitespace-nowrap border border-[var(--border)]">
                      {new Date(group.createdAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">
                  {group.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {group.size && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]">
                      {group.size === 'SOLO' && '👤 Solo'}
                      {group.size === 'SMALL' && '👥 < 10'}
                      {group.size === 'LARGE' && '👨‍👩‍👧‍👦 > 10'}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags.map((tag) => (
                      <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="hidden sm:flex self-center text-[var(--muted)]">
                <svg className="h-6 w-6 group-hover:text-[var(--link)] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

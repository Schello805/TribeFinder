'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { normalizeUploadedImageUrl } from '@/lib/normalizeUploadedImageUrl';

interface DancerListAnimatedProps {
  dancers: DancerListAnimatedItem[];
}

interface Membership {
  group: { id: string; name: string };
}

interface DancerListAnimatedItem {
  id: string;
  name: string | null;
  dancerName: string | null;
  image: string | null;
  bio: string | null;
  updatedAt?: string | Date;
  memberships: Membership[];
}

export default function DancerListAnimated({ dancers }: DancerListAnimatedProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (dancers.length === 0) {
    return (
      <div className="bg-[var(--surface)] text-[var(--foreground)] shadow overflow-hidden sm:rounded-lg border border-[var(--border)]">
        <div className="px-4 py-12 text-center text-[var(--muted)]">
          <p>Keine Tänzerinnen gefunden.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.ul variants={container} initial="hidden" animate="show" className="space-y-4">
      {dancers.map((d) => {
        const displayName = d.dancerName || d.name || 'Unbekannt';
        const avatar = normalizeUploadedImageUrl(d.image) ?? '';
        const dateStr = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('de-DE') : '';

        return (
          <motion.li
            key={d.id}
            variants={item}
            className="bg-[var(--surface)] text-[var(--foreground)] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-[var(--border)]"
          >
            <Link href={`/users/${d.id}`} className="block p-4 sm:p-6 group">
              <div className="flex items-start sm:items-center justify-between gap-6">
                <div className="flex-shrink-0 h-20 w-20 sm:h-24 sm:w-24 rounded-lg overflow-hidden bg-[var(--surface)] border border-[var(--border)] relative group-hover:scale-105 transition-transform duration-300 shadow-sm flex items-center justify-center">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={displayName}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[var(--link)] font-bold text-3xl bg-[var(--surface-2)]">
                      {displayName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h3 className="tf-display text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--link)] transition-colors truncate">
                        {displayName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {dateStr ? (
                        <span className="text-xs font-medium text-[var(--muted)] bg-[var(--surface-2)] px-2 py-1 rounded-full whitespace-nowrap border border-[var(--border)]">
                          {dateStr}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {d.bio ? (
                    <p className="text-sm text-[var(--muted)] line-clamp-2 leading-relaxed whitespace-pre-wrap">{d.bio}</p>
                  ) : null}

                  {d.memberships?.length ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {d.memberships.slice(0, 5).map((m) => (
                        <span
                          key={m.group.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]"
                        >
                          {m.group.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="hidden sm:flex self-center text-[var(--muted)]">
                  <svg
                    className="h-6 w-6 group-hover:text-[var(--link)] group-hover:translate-x-1 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

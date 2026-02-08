import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import JoinButton from "@/components/groups/JoinButton";
import GroupDetailAnimations from "@/components/groups/GroupDetailAnimations";
import RevealGroupContactEmail from "@/components/ui/RevealGroupContactEmail";
import MemberManagement from "@/components/groups/MemberManagement";
import GalleryManager from "@/components/groups/GalleryManager";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import LikeButton from "@/components/groups/LikeButton";
import DeleteGroupButton from "@/components/groups/DeleteGroupButton";

function getGroupLikeDelegate() {
  return (prisma as unknown as { groupLike?: typeof prisma.favoriteGroup }).groupLike;
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const session = await getServerSession(authOptions);

  const groupSelect = {
    id: true,
    name: true,
    description: true,
    website: true,
    videoUrl: true,
    image: true,
    createdAt: true,
    ownerId: true,
    foundingYear: true,
    size: true,
    seekingMembers: true,
    performances: true,
    trainingTime: true,
    headerImage: true,
    headerImageFocusY: true,
    headerGradientFrom: true,
    headerGradientTo: true,
    location: true,
    tags: true,
    danceStyles: {
      select: {
        id: true,
        level: true,
        style: { select: { id: true, name: true } },
      },
      orderBy: { style: { name: "asc" } },
    },
    owner: {
      select: {
        id: true,
        name: true,
        image: true,
      },
    },
    members: {
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    },
    events: {
      where: {
        startDate: {
          gte: new Date(),
        },
      },
      orderBy: {
        startDate: "asc",
      },
    },
  } as const;

  const groupSelectWithMode = {
    ...groupSelect,
    danceStyles: {
      ...groupSelect.danceStyles,
      select: {
        ...groupSelect.danceStyles.select,
        mode: true,
      },
    },
  } as const;

  type GroupDetailPayload = Prisma.GroupGetPayload<{ select: typeof groupSelect }>;

  let group: GroupDetailPayload | null = null;
  let contactEmail: string | null = null;
  let membersForManagement: Array<{
    id: string;
    role: string;
    status: string;
    user: { id: string; name: string | null; image: string | null; email: string };
  }> = [];
  try {
    group = (await prisma.group.findUnique({
      where: { id },
      select: groupSelectWithMode as unknown as Prisma.GroupSelect,
    })) as unknown as GroupDetailPayload;

    if (group) {
      const isOwner = session?.user?.id === group.ownerId;
      const currentUserMembership = group.members.find((m) => m.user.id === session?.user?.id);
      const isGlobalAdmin = session?.user?.role === "ADMIN";
      const isGroupAdmin =
        isOwner ||
        (currentUserMembership?.role === "ADMIN" && currentUserMembership?.status === "APPROVED");
      const canManage = isGlobalAdmin || isGroupAdmin;

      if (canManage) {
        const extra = await prisma.group.findUnique({
          where: { id },
          select: { contactEmail: true },
        });
        contactEmail = extra?.contactEmail ?? null;

        membersForManagement = await prisma.groupMember.findMany({
          where: { groupId: id },
          select: {
            id: true,
            role: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });
      }
    }
  } catch (e) {
    if (e && typeof e === "object" && "name" in e && (e as { name?: string }).name === "PrismaClientRustPanicError") {
      return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
          <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
            <h1 className="tf-display text-2xl font-bold text-[var(--foreground)]">Gruppe konnte nicht geladen werden</h1>
            <p className="mt-2 text-[var(--muted)]">
              Die Datenbank ist aktuell nicht erreichbar.
            </p>
            <div className="mt-4">
              <Link href="/groups" className="text-[var(--link)] hover:opacity-90">
                Zurück zur Gruppenübersicht
              </Link>
            </div>
          </div>
        </div>
      );
    }
    throw e;
  }

  if (!group) {
    notFound();
  }

  const isOwner = session?.user?.id === group.ownerId;
  const currentUserMembership = group.members.find((m) => m.user.id === session?.user?.id);
  
  const isMember = currentUserMembership?.status === 'APPROVED';
  const isPending = currentUserMembership?.status === 'PENDING';
  const isGlobalAdmin = session?.user?.role === "ADMIN";
  const isGroupAdmin =
    isOwner ||
    (currentUserMembership?.role === "ADMIN" && currentUserMembership?.status === "APPROVED");
  const isAdmin = isGlobalAdmin || isGroupAdmin;
  
  const membershipStatus = isMember ? 'APPROVED' : (isPending ? 'PENDING' : 'NONE');

  // Helper for YouTube embed
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  const videoEmbedUrl = group.videoUrl ? getYoutubeEmbedUrl(group.videoUrl) : null;

  // Helper to display clean domain
  const displayUrl = group.website ? group.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';

  const headerImageUrl = normalizeUploadedImageUrl(group.headerImage) ?? null;
  const groupAny = group as unknown as Record<string, unknown>;
  const headerFrom = (typeof groupAny.headerGradientFrom === "string" ? groupAny.headerGradientFrom : "").trim();
  const headerTo = (typeof groupAny.headerGradientTo === "string" ? groupAny.headerGradientTo : "").trim();
  const headerFocusYRaw = group.headerImageFocusY;
  const headerFocusY = typeof headerFocusYRaw === "number" && Number.isFinite(headerFocusYRaw) ? Math.min(100, Math.max(0, headerFocusYRaw)) : 50;
  const headerStyle = !headerImageUrl && headerFrom && headerTo ? { backgroundImage: `linear-gradient(to right, ${headerFrom}, ${headerTo})` } : undefined;

  const danceStylesForDisplay: Array<{
    key: string;
    name: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL";
    mode: "IMPRO" | "CHOREO" | null;
  }> = (group.danceStyles as unknown as Array<{ id: string; level: string; mode?: string | null; style: { name: string } }>).length
    ? (group.danceStyles as unknown as Array<{ id: string; level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL"; mode?: "IMPRO" | "CHOREO" | null; style: { name: string } }>).map((ds) => ({
        key: ds.id,
        name: ds.style.name,
        level: ds.level,
        mode: ds.mode ?? null,
      }))
    : group.tags.map((t) => ({
        key: `tag-${t.id}`,
        name: t.name,
        level: "INTERMEDIATE",
        mode: null,
      }));

  const approvedMemberships = group.members.filter((m) => m.status === "APPROVED");
  const adminMemberships = approvedMemberships.filter((m) => m.role === "ADMIN" && m.user.id !== group.owner.id);
  const regularMemberships = approvedMemberships.filter((m) => m.role !== "ADMIN" && m.user.id !== group.owner.id);
  const regularFirst12 = regularMemberships.slice(0, 12);

  const groupLike = getGroupLikeDelegate();
  const [likeCount, likedByMe] = groupLike
    ? await Promise.all([
        groupLike.count({ where: { groupId: id } }),
        session?.user?.id
          ? groupLike
              .findUnique({
                where: {
                  userId_groupId: {
                    userId: session.user.id,
                    groupId: id,
                  },
                },
                select: { id: true },
              })
              .then((x: { id: string } | null) => Boolean(x))
          : Promise.resolve(false),
      ])
    : [0, false];

  return (
    <GroupDetailAnimations>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        
        {/* Profile Header Card */}
        <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden transition-colors">
          {/* ... existing header content ... */}
          {/* Banner Area */}
          <div className="h-48 w-full relative" style={headerStyle}>
            {headerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headerImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: `50% ${headerFocusY}%` }}
              />
            ) : null}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            {!headerImageUrl && !headerStyle ? (
              <div className="absolute inset-0 bg-[var(--primary)]" />
            ) : null}
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 mb-6 gap-6 relative z-10">
              {/* Logo / Avatar */}
              <div className="flex-shrink-0 h-32 w-32 rounded-2xl border-4 border-[var(--surface)] bg-[var(--surface)] shadow-lg overflow-hidden flex items-center justify-center">
                {group.image ? (
                  <>
                    <ImageWithFallback 
                      src={group.image} 
                      alt={group.name} 
                      className="w-full h-full object-contain p-1"
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--muted)] font-bold text-5xl">
                     {group.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Title & Basic Info */}
              <div className="flex-1 text-center sm:text-left pt-2 sm:pt-0 min-w-0">
                <div className="inline-block max-w-full bg-[var(--surface)] backdrop-blur-md rounded-2xl px-4 py-3 shadow-sm border border-[var(--border)]">
                  <h1 className="tf-display text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] tracking-tight mb-2 truncate">{group.name}</h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-sm text-[var(--foreground)]">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Seit {group.foundingYear || new Date(group.createdAt).getFullYear()}
                    </span>
                    {group.size && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-medium border border-[var(--border)]">
                        {group.size === 'SOLO' && '👤 Solo'}
                        {group.size === 'DUO' && '👥 Duo'}
                        {group.size === 'TRIO' && '👥 Trio'}
                        {group.size === 'SMALL' && '👥 Kleine Gruppe (4-10)'}
                        {group.size === 'LARGE' && '👨‍👩‍👧‍👦 Große Gruppe (>10)'}
                      </span>
                    )}
                    {group.seekingMembers && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-medium border border-[var(--border)]">
                        👋 Sucht Mitglieder
                      </span>
                    )}
                    {group.performances && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--foreground)] font-medium border border-[var(--border)]">
                        🎭 Auftritte möglich
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex justify-center sm:justify-start">
                    <LikeButton
                      groupId={group.id}
                      initialCount={likeCount}
                      initialLikedByMe={likedByMe}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
                {isAdmin ? (
                  <Link
                    href={`/groups/${group.id}/edit`}
                    className="tf-gothic-btn px-4 py-2 rounded-md shadow-sm text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-[var(--border)]"
                  >
                    Bearbeiten
                  </Link>
                ) : null}
                {isAdmin ? (
                  <DeleteGroupButton groupId={group.id} />
                ) : null}
                {session && !isMember && !isPending && !isAdmin && (
                  <JoinButton groupId={group.id} initialStatus="NONE" />
                )}
                {session && (isMember || isPending) && !isOwner && (
                   <div className="flex flex-col items-center sm:items-start">
                     <JoinButton groupId={group.id} initialStatus={membershipStatus} />
                     <div className="mt-1 text-xs text-[var(--muted)]">
                       {isMember ? "Tipp: Über diesen Button kannst du die Gruppe verlassen." : "Tipp: Über diesen Button kannst du deine Anfrage zurückziehen."}
                     </div>
                   </div>
                )}
              </div>
            </div>

            {/* Description & Details Grid */}
            <div className="border-t border-[var(--border)] pt-6 mt-6">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
                {/* Left Column: Description (Wider) */}
                <div className="sm:col-span-2 space-y-6">
                  <div>
                    <dt className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Über uns</dt>
                    <dd className="text-base text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                      {group.description}
                    </dd>
                  </div>

                  {group.trainingTime && (
                    <div>
                      <dt className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Trainingszeiten</dt>
                      <dd className="text-base text-[var(--foreground)] bg-[var(--surface-2)] p-3 rounded-lg border border-[var(--border)] flex items-start gap-3">
                        <span className="text-xl">🕒</span>
                        <span>{group.trainingTime}</span>
                      </dd>
                      {group.location && (
                        <dd className="mt-2 text-base text-[var(--foreground)] bg-[var(--surface-2)] p-3 rounded-lg border border-[var(--border)] flex items-start gap-3">
                          <span className="text-xl">📍</span>
                          <span>{group.location.address || "Auf der Karte markiert"}</span>
                        </dd>
                      )}
                    </div>
                  )}

                  {videoEmbedUrl && (
                    <div>
                      <dt className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Vorstellungsvideo</dt>
                      <div className="aspect-w-16 aspect-h-9 rounded-xl overflow-hidden shadow-sm border border-[var(--border)] bg-black">
                        <iframe 
                          src={videoEmbedUrl} 
                          title="YouTube video player" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                          className="w-full h-full min-h-[400px]"
                        ></iframe>
                      </div>
                    </div>
                  )}

                  {/* Gallery Section */}
                  <div>
                    <dt className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Galerie</dt>
                    <GalleryManager groupId={group.id} canEdit={isAdmin} />
                  </div>
                </div>

                {/* Right Column: Meta Info (Narrower) */}
                <div className="space-y-6">
                  {group.website && (
                    <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)]">
                      <dt className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Webseite</dt>
                      <dd>
                        <a href={group.website} target="_blank" rel="noopener noreferrer" className="text-[var(--link)] hover:opacity-90 font-medium break-all flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                          {displayUrl}
                        </a>
                      </dd>
                    </div>
                  )}

                  <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)]">
                    <dt className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">Kontakt</dt>
                    <dd className="flex items-center gap-2 text-[var(--foreground)] font-medium">
                      <svg className="w-4 h-4 text-[var(--muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      {contactEmail ? (
                        <span className="break-all">{contactEmail}</span>
                      ) : (
                        <RevealGroupContactEmail groupId={group.id} className="hover:text-[var(--link)] transition-colors" />
                      )}
                    </dd>
                  </div>

                  {/* Message Button */}
                  {session && group.owner.id !== session.user?.id && (isMember || isAdmin) && (
                    <Link
                      href={`/messages/new?groupId=${group.id}`}
                      className="tf-gothic-btn w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] text-[var(--primary-foreground)] font-medium rounded-xl transition shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Nachricht senden
                    </Link>
                  )}

                  {group.location && (
                    <div>
                      <dt className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Standort</dt>
                      <dd className="text-sm text-[var(--foreground)] flex items-start gap-2">
                        <svg className="w-5 h-5 text-[var(--muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {group.location.address || "Auf der Karte markiert"}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Tanzstile</dt>
                    <dd className="flex flex-wrap gap-2">
                      {danceStylesForDisplay.map((ds) => (
                        <span
                          key={ds.key}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] shadow-sm"
                        >
                          {ds.name}
                          <span className="ml-2 text-[10px] text-[var(--muted)]">
                            {ds.level === "BEGINNER" && "Anfänger"}
                            {ds.level === "INTERMEDIATE" && "Fortgeschritten"}
                            {ds.level === "ADVANCED" && "Sehr fortgeschritten"}
                            {ds.level === "PROFESSIONAL" && "Profi"}
                          </span>
                          {ds.mode ? (
                            <span className="ml-2 text-[10px] text-[var(--muted)]">
                              {ds.mode === "IMPRO" ? "Impro" : "Choreo"}
                            </span>
                          ) : null}
                        </span>
                      ))}
                    </dd>
                  </div>

                  <div className="pt-4 border-t border-[var(--border)]">
                    <dt className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Gruppenleitung</dt>
                    <dd className="space-y-2">
                      <Link
                        href={`/users/${group.owner.id}`}
                        className="flex items-center space-x-3 bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] shadow-sm hover:bg-[var(--surface-hover)] transition"
                      >
                        {group.owner.image ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              className="h-10 w-10 rounded-full object-cover border border-[var(--border)]"
                              src={normalizeUploadedImageUrl(group.owner.image) ?? ""}
                              alt={group.owner.name || "Owner"}
                            />
                          </>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] font-bold border border-[var(--border)]">
                            {group.owner.name?.charAt(0) || "?"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--foreground)] truncate">{group.owner.name || "Unbekannt"}</div>
                        </div>
                      </Link>

                      {adminMemberships.length > 0 ? (
                        <div className="space-y-2">
                          {adminMemberships.map((m) => (
                            <Link
                              key={m.id}
                              href={`/users/${m.user.id}`}
                              className="flex items-center justify-between gap-3 bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] shadow-sm hover:bg-[var(--surface-hover)] transition"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {m.user.image ? (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      className="h-10 w-10 rounded-full object-cover border border-[var(--border)]"
                                      src={normalizeUploadedImageUrl(m.user.image) ?? ""}
                                      alt={m.user.name || "Admin"}
                                    />
                                  </>
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] font-bold border border-[var(--border)]">
                                    {m.user.name?.charAt(0) || "?"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-[var(--foreground)] truncate">{m.user.name || "Unbekannt"}</div>
                                </div>
                              </div>
                              <span className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
                                Gruppenleitung
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </dd>
                  </div>

                  <div className="pt-4 border-t border-[var(--border)]">
                    <dt className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Mitglieder</dt>
                    <dd className="space-y-2">
                      {regularMemberships.length > 0 ? (
                        <>
                          {regularFirst12.map((m) => (
                            <Link
                              key={m.id}
                              href={`/users/${m.user.id}`}
                              className="flex items-center space-x-3 bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] shadow-sm hover:bg-[var(--surface-hover)] transition"
                            >
                              {m.user.image ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    className="h-9 w-9 rounded-full object-cover border border-[var(--border)]"
                                    src={normalizeUploadedImageUrl(m.user.image) ?? ""}
                                    alt={m.user.name || "Mitglied"}
                                  />
                                </>
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] font-bold border border-[var(--border)]">
                                  {m.user.name?.charAt(0) || "?"}
                                </div>
                              )}
                              <div className="text-sm font-medium text-[var(--foreground)] truncate">{m.user.name || "Unbekannt"}</div>
                            </Link>
                          ))}

                          {regularMemberships.length > 12 ? (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-sm font-medium text-[var(--link)] hover:underline select-none">
                                Mehr ({regularMemberships.length - 12})
                              </summary>
                              <div className="mt-2 space-y-2">
                                {regularMemberships.map((m) => (
                                  <Link
                                    key={`all-${m.id}`}
                                    href={`/users/${m.user.id}`}
                                    className="flex items-center space-x-3 bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] shadow-sm hover:bg-[var(--surface-hover)] transition"
                                  >
                                    {m.user.image ? (
                                      <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          className="h-9 w-9 rounded-full object-cover border border-[var(--border)]"
                                          src={normalizeUploadedImageUrl(m.user.image) ?? ""}
                                          alt={m.user.name || "Mitglied"}
                                        />
                                      </>
                                    ) : (
                                      <div className="h-9 w-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] font-bold border border-[var(--border)]">
                                        {m.user.name?.charAt(0) || "?"}
                                      </div>
                                    )}
                                    <div className="text-sm font-medium text-[var(--foreground)] truncate">{m.user.name || "Unbekannt"}</div>
                                  </Link>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </>
                      ) : (
                        <div className="text-sm text-[var(--muted)]">Noch keine Mitglieder hinterlegt.</div>
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Member Management Section (Approved Members) */}
        {isAdmin && session?.user?.id && (
          <div className="mb-8">
            <h2 className="tf-display text-2xl font-bold text-[var(--foreground)] mb-6">Mitgliederverwaltung</h2>
            <MemberManagement 
              groupId={group.id} 
              members={membersForManagement} 
              currentUserId={session.user.id} 
            />
          </div>
        )}

        {/* Events Section */}
        <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--surface-2)]">
            <div className="flex items-center justify-between">
              <h2 className="tf-display text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <span>📅</span> Kommende Events
              </h2>
              {group.events.length > 0 && (
                <span className="bg-[var(--surface)] text-[var(--foreground)] text-xs font-bold px-2 py-1 rounded-full border border-[var(--border)]">
                  {group.events.length}
                </span>
              )}
            </div>
          </div>
          
          {group.events.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {group.events.map((event) => (
                <li key={event.id} className="hover:bg-[var(--surface-hover)] transition group">
                  <Link href={`/events/${event.id}`} className="block px-6 py-5">
                    <div className="flex flex-col sm:flex-row gap-4">
                       {/* Date Box */}
                       <div className="flex-shrink-0 w-16 h-16 bg-[var(--surface-2)] rounded-xl flex flex-col items-center justify-center text-[var(--foreground)] border border-[var(--border)] transition-colors">
                          <span className="text-xs font-bold uppercase">{new Date(event.startDate).toLocaleDateString("de-DE", { month: 'short', timeZone: 'Europe/Berlin' })}</span>
                          <span className="text-xl font-extrabold">{new Date(event.startDate).toLocaleDateString("de-DE", { day: '2-digit', timeZone: 'Europe/Berlin' })}</span>
                       </div>
                       
                       <div className="flex-1">
                          <h3 className="tf-display text-base font-bold text-[var(--foreground)] group-hover:text-[var(--link)] transition-colors">{event.title}</h3>
                          <div className="mt-1 text-sm text-[var(--muted)] space-y-1">
                            <p className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {new Date(event.startDate).toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })} Uhr
                            </p>
                            {event.locationName && (
                              <p className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {event.locationName}
                              </p>
                            )}
                          </div>
                          <p className="mt-3 text-sm text-[var(--foreground)] line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                       </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-2)] mb-4 border border-[var(--border)]">
                <span className="text-2xl opacity-50">📆</span>
              </div>
              <p className="text-[var(--muted)] font-medium">Aktuell keine Events geplant</p>
              <p className="text-sm text-[var(--muted)] mt-1">Schau später nochmal vorbei!</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-center pb-8">
           <Link href="/groups" className="text-[var(--muted)] hover:text-[var(--link)] font-medium flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Zurück zur Übersicht
           </Link>
        </div>
      </div>
    </GroupDetailAnimations>
  );
}

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
import FlyerGenerator from "@/components/groups/FlyerGenerator";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

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
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
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
    group = await prisma.group.findUnique({
      where: { id },
      select: groupSelect,
    });

    if (group) {
      const isOwner = session?.user?.id === group.ownerId;
      const currentUserMembership = group.members.find((m) => m.user.id === session?.user?.id);
      const canManage = isOwner || currentUserMembership?.status === "APPROVED";

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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gruppe konnte nicht geladen werden</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Die Datenbank ist aktuell nicht erreichbar.
            </p>
            <div className="mt-4">
              <Link href="/groups" className="text-indigo-600 dark:text-indigo-300 hover:underline">
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
  const isAdmin = isOwner || currentUserMembership?.status === 'APPROVED';
  
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

  return (
    <GroupDetailAnimations>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
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
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500" />
            ) : null}
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 mb-6 gap-6 relative z-10">
              {/* Logo / Avatar */}
              <div className="flex-shrink-0 h-32 w-32 rounded-2xl border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800 shadow-lg overflow-hidden flex items-center justify-center">
                {group.image ? (
                  <>
                    <ImageWithFallback 
                      src={group.image} 
                      alt={group.name} 
                      className="w-full h-full object-contain p-1"
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-indigo-300 dark:text-indigo-400 font-bold text-5xl">
                     {group.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Title & Basic Info */}
              <div className="flex-1 text-center sm:text-left pt-2 sm:pt-0 min-w-0">
                <div className="inline-block max-w-full bg-white/85 dark:bg-gray-950/60 backdrop-blur-md rounded-2xl px-4 py-3 shadow-sm border border-white/60 dark:border-white/10">
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2 truncate">{group.name}</h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-sm text-gray-700 dark:text-gray-200">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Seit {group.foundingYear || new Date(group.createdAt).getFullYear()}
                    </span>
                    {group.size && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50/90 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-medium border border-indigo-100/70 dark:border-indigo-800/60">
                        {group.size === 'SOLO' && '👤 Solo'}
                        {group.size === 'DUO' && '👥 Duo'}
                        {group.size === 'TRIO' && '👥 Trio'}
                        {group.size === 'SMALL' && '👥 Kleine Gruppe (4-10)'}
                        {group.size === 'LARGE' && '👨‍👩‍👧‍👦 Große Gruppe (>10)'}
                      </span>
                    )}
                    {group.seekingMembers && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-50/90 dark:bg-green-900/40 text-green-800 dark:text-green-200 font-medium border border-green-100/70 dark:border-green-800/60">
                        👋 Sucht Mitglieder
                      </span>
                    )}
                    {group.performances && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50/90 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 font-medium border border-purple-100/70 dark:border-purple-800/60">
                        🎭 Auftritte möglich
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
                {session && !isMember && !isPending && !isAdmin && (
                  <JoinButton groupId={group.id} initialStatus="NONE" />
                )}
                {session && (isMember || isPending) && !isOwner && (
                   <div className="flex flex-col items-center sm:items-start">
                     <JoinButton groupId={group.id} initialStatus={membershipStatus} />
                     <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                       {isMember ? "Tipp: Über diesen Button kannst du die Gruppe verlassen." : "Tipp: Über diesen Button kannst du deine Anfrage zurückziehen."}
                     </div>
                   </div>
                )}
                {isAdmin && (
                  <div className="flex flex-wrap gap-2">
                    <FlyerGenerator group={group} />
                    <Link
                      href={`/groups/${group.id}/events`}
                      className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-sm text-sm font-medium flex items-center gap-2"
                    >
                      <span>📅</span> Events
                    </Link>
                    <Link
                      href={`/groups/${group.id}/edit`}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm text-sm font-medium flex items-center gap-2"
                    >
                      <span>✏️</span> Bearbeiten
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Description & Details Grid */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
                {/* Left Column: Description (Wider) */}
                <div className="sm:col-span-2 space-y-6">
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Über uns</dt>
                    <dd className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {group.description}
                    </dd>
                  </div>

                  {group.trainingTime && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Trainingszeiten</dt>
                      <dd className="text-base text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 flex items-start gap-3">
                        <span className="text-xl">🕒</span>
                        <span>{group.trainingTime}</span>
                      </dd>
                      {group.location && (
                        <dd className="mt-2 text-base text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 flex items-start gap-3">
                          <span className="text-xl">📍</span>
                          <span>{group.location.address || "Auf der Karte markiert"}</span>
                        </dd>
                      )}
                    </div>
                  )}

                  {videoEmbedUrl && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Vorstellungsvideo</dt>
                      <div className="aspect-w-16 aspect-h-9 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 bg-black">
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
                    <dt className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Galerie</dt>
                    <GalleryManager groupId={group.id} canEdit={isAdmin} />
                  </div>
                </div>

                {/* Right Column: Meta Info (Narrower) */}
                <div className="space-y-6">
                  {group.website && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Webseite</dt>
                      <dd>
                        <a href={group.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium break-all flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                          {displayUrl}
                        </a>
                      </dd>
                    </div>
                  )}

                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                    <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Kontakt</dt>
                    <dd className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      {contactEmail ? (
                        <span className="break-all">{contactEmail}</span>
                      ) : (
                        <RevealGroupContactEmail groupId={group.id} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" />
                      )}
                    </dd>
                  </div>

                  {/* Message Button */}
                  {session && group.owner.id !== session.user?.id && (
                    <Link
                      href={`/messages/new?groupId=${group.id}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Nachricht senden
                    </Link>
                  )}

                  {group.location && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Standort</dt>
                      <dd className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {group.location.address || "Auf der Karte markiert"}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tanzstile</dt>
                    <dd className="flex flex-wrap gap-2">
                      {group.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium 
                            ${tag.isApproved ? 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 shadow-sm' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-800'}`}
                          title={!tag.isApproved ? "Wartet auf Freigabe" : ""}
                        >
                          {tag.name}
                          {!tag.isApproved && <span className="ml-1 text-[10px] text-yellow-500">⏳</span>}
                        </span>
                      ))}
                    </dd>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Gruppenleitung</dt>
                    <dd className="flex items-center space-x-3 bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm">
                      {group.owner.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-500"
                            src={normalizeUploadedImageUrl(group.owner.image) ?? ""}
                            alt={group.owner.name || "Owner"}
                          />
                        </>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-400 dark:text-indigo-300 font-bold border border-indigo-100 dark:border-indigo-800">
                          {group.owner.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {group.owner.name || "Unbekannt"}
                      </div>
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Mitgliederverwaltung</h2>
            <MemberManagement 
              groupId={group.id} 
              members={membersForManagement} 
              currentUserId={session.user.id} 
            />
          </div>
        )}

        {/* Events Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📅</span> Kommende Events
              </h2>
              {group.events.length > 0 && (
                <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2 py-1 rounded-full">
                  {group.events.length}
                </span>
              )}
            </div>
          </div>
          
          {group.events.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {group.events.map((event) => (
                <li key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group">
                  <Link href={`/events/${event.id}`} className="block px-6 py-5">
                    <div className="flex flex-col sm:flex-row gap-4">
                       {/* Date Box */}
                       <div className="flex-shrink-0 w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex flex-col items-center justify-center text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                          <span className="text-xs font-bold uppercase">{new Date(event.startDate).toLocaleDateString("de-DE", { month: 'short', timeZone: 'Europe/Berlin' })}</span>
                          <span className="text-xl font-extrabold">{new Date(event.startDate).toLocaleDateString("de-DE", { day: '2-digit', timeZone: 'Europe/Berlin' })}</span>
                       </div>
                       
                       <div className="flex-1">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{event.title}</h3>
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                            <p className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {new Date(event.startDate).toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })} Uhr
                            </p>
                            {event.locationName && (
                              <p className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {event.locationName}
                              </p>
                            )}
                          </div>
                          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <span className="text-2xl opacity-50">📆</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Aktuell keine Events geplant</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Schau später nochmal vorbei!</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-center pb-8">
           <Link href="/groups" className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Zurück zur Übersicht
           </Link>
        </div>
      </div>
    </GroupDetailAnimations>
  );
}

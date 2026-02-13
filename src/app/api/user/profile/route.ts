import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { normalizeUploadedImageUrl } from '@/lib/normalizeUploadedImageUrl';

const profileSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  dancerName: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  isDancerProfileEnabled: z.boolean().optional(),
  isDancerProfilePrivate: z.boolean().optional(),
  dancerTeaches: z.boolean().optional(),
  dancerTeachingWhere: z.string().optional().nullable(),
  dancerTeachingFocus: z.string().optional().nullable(),
  dancerEducation: z.string().optional().nullable(),
  dancerPerformances: z.string().optional().nullable(),
  youtubeUrl: z.string().url().optional().or(z.literal("")).nullable(),
  instagramUrl: z.string().url().optional().or(z.literal("")).nullable(),
  facebookUrl: z.string().url().optional().or(z.literal("")).nullable(),
  tiktokUrl: z.string().url().optional().or(z.literal("")).nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique(
      {
        where: { id: session.user.id },
        select: {
          firstName: true,
          lastName: true,
          dancerName: true,
          bio: true,
          image: true,
          isDancerProfileEnabled: true,
          isDancerProfilePrivate: true,
          dancerTeaches: true,
          dancerTeachingWhere: true,
          dancerTeachingFocus: true,
          dancerEducation: true,
          dancerPerformances: true,
          youtubeUrl: true,
          instagramUrl: true,
          facebookUrl: true,
          tiktokUrl: true,
          email: true, // Read-only
          name: true, // Legacy/Display name
        },
      } as unknown as Parameters<typeof prisma.user.findUnique>[0]
    );

    if (!user) {
      return NextResponse.json({ message: "Benutzer nicht gefunden" }, { status: 404 });
    }

    const derivedFirstName = user.firstName || (user.name ? user.name.trim().split(/\s+/)[0] : null);
    const derivedLastName =
      user.lastName ||
      (user.name && user.name.trim().split(/\s+/).length > 1
        ? user.name.trim().split(/\s+/).slice(1).join(" ")
        : null);
    const derivedDancerName = user.dancerName || user.name || null;

    return NextResponse.json({
      ...user,
      firstName: derivedFirstName,
      lastName: derivedLastName,
      dancerName: derivedDancerName,
      image: normalizeUploadedImageUrl(user.image),
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };

    // Wenn die DB noch nicht migriert ist (fehlende Spalten/Tabelle), soll das Profil-UI nicht komplett kaputt gehen.
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json({
        firstName: null,
        lastName: null,
        dancerName: session.user.name || null,
        bio: null,
        image: normalizeUploadedImageUrl((session.user as { image?: string | null }).image ?? null),
        isDancerProfileEnabled: false,
        isDancerProfilePrivate: false,
        dancerTeaches: false,
        dancerTeachingWhere: null,
        dancerTeachingFocus: null,
        dancerEducation: null,
        dancerPerformances: null,
        youtubeUrl: null,
        instagramUrl: null,
        facebookUrl: null,
        tiktokUrl: null,
        email: (session.user as { email?: string | null }).email ?? "",
        name: session.user.name || null,
        message: "Profil-Daten sind auf dem Server noch nicht vollständig verfügbar (Migration fehlt).",
      });
    }

    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Profils' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const result = profileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        message: "Validierungsfehler", 
        errors: result.error.flatten() 
      }, { status: 400 });
    }

    const data = result.data;

    const updateArgs = {
      where: { id: session.user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dancerName: data.dancerName,
        bio: data.bio,
        image: normalizeUploadedImageUrl(data.image),
        isDancerProfileEnabled:
          typeof data.isDancerProfileEnabled === "boolean" ? data.isDancerProfileEnabled : undefined,
        isDancerProfilePrivate:
          typeof data.isDancerProfilePrivate === "boolean" ? data.isDancerProfilePrivate : undefined,
        dancerTeaches: typeof data.dancerTeaches === "boolean" ? data.dancerTeaches : undefined,
        dancerTeachingWhere: data.dancerTeachingWhere,
        dancerTeachingFocus: data.dancerTeachingFocus,
        dancerEducation: data.dancerEducation,
        dancerPerformances: data.dancerPerformances,
        youtubeUrl: data.youtubeUrl,
        instagramUrl: data.instagramUrl,
        facebookUrl: data.facebookUrl,
        tiktokUrl: data.tiktokUrl,
        // Update generic name as well if dancerName is provided, otherwise combine first/last
        name:
          data.dancerName ||
          (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : session.user.name),
      },
    } as unknown as Parameters<typeof prisma.user.update>[0];

    const updatedUser = await prisma.user.update(updateArgs);

    return NextResponse.json({
      ...updatedUser,
      image: normalizeUploadedImageUrl(updatedUser.image),
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json(
        {
          error:
            "Server-Datenbank ist noch nicht auf dem neuesten Stand (Migration fehlt). Bitte Migrationen ausführen und erneut versuchen.",
        },
        { status: 503 }
      );
    }
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern des Profils' }, { status: 500 });
  }
}

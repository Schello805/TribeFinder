import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

function normalizeUploadedImageUrl(image?: string | null): string | null {
  if (!image) return null;
  const trimmed = image.trim();
  if (!trimmed) return null;

  // Keep absolute URLs (e.g. external avatars)
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Ensure local uploads always start with /uploads/
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;

  // Bare filename from older installs / buggy saves
  if (!trimmed.startsWith('/')) return `/uploads/${trimmed}`;

  return trimmed;
}

const profileSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  dancerName: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
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
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        dancerName: true,
        bio: true,
        image: true,
        youtubeUrl: true,
        instagramUrl: true,
        facebookUrl: true,
        tiktokUrl: true,
        email: true, // Read-only
        name: true, // Legacy/Display name
      }
    });

    if (!user) {
      return NextResponse.json({ message: "Benutzer nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      image: normalizeUploadedImageUrl(user.image),
    });
  } catch (error) {
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

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dancerName: data.dancerName,
        bio: data.bio,
        image: normalizeUploadedImageUrl(data.image),
        youtubeUrl: data.youtubeUrl,
        instagramUrl: data.instagramUrl,
        facebookUrl: data.facebookUrl,
        tiktokUrl: data.tiktokUrl,
        // Update generic name as well if dancerName is provided, otherwise combine first/last
        name: data.dancerName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : session.user.name),
      },
    });

    return NextResponse.json({
      ...updatedUser,
      image: normalizeUploadedImageUrl(updatedUser.image),
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern des Profils' }, { status: 500 });
  }
}

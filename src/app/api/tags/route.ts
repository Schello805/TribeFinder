import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const approvedOnly = searchParams.get('approvedOnly') === 'true';

    const where: { name?: { contains: string }; isApproved?: boolean } = {};
    if (search) {
      where.name = { contains: search };
    }
    if (approvedOnly) {
      where.isApproved = true;
    }

    const tags = await prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 20
    });

    return NextResponse.json(tags);
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "PrismaClientRustPanicError") {
      return NextResponse.json([]);
    }
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Tags' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const { name, isApproved } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    const tag = await prisma.tag.upsert({
      where: { name },
      update: { isApproved: isApproved ?? true },
      create: { name, isApproved: isApproved ?? true },
    });

    return NextResponse.json(tag);
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "PrismaClientRustPanicError") {
      return NextResponse.json({ error: "Datenbankfehler (Prisma Engine)" }, { status: 503 });
    }
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Tags' }, { status: 500 });
  }
}

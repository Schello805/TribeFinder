import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { groups: true }
        }
      },
      orderBy: [
        { isApproved: 'asc' }, // Pending first
        { name: 'asc' }
      ]
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching admin tags:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Tags' }, { status: 500 });
  }
}

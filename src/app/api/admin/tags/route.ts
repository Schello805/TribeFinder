import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/requireAdmin';

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
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

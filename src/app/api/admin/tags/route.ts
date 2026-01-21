import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/requireAdmin';
import { jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
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
    return jsonServerError('Fehler beim Laden der Tags', error);
  }
}

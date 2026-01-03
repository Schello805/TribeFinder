import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const patchSchema = z.object({
  isApproved: z.boolean().optional(),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Tag gelöscht' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Tags' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Ungültige Daten', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data: { isApproved?: boolean; name?: string } = {};
    if (typeof parsed.data.isApproved === 'boolean') data.isApproved = parsed.data.isApproved;
    if (typeof parsed.data.name === 'string') data.name = parsed.data.name;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: 'Keine Änderungen' }, { status: 400 });
    }

    const tag = await prisma.tag.update({
      where: { id },
      data,
    });

    return NextResponse.json(tag);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Tag-Name existiert bereits' }, { status: 409 });
    }
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Tags' }, { status: 500 });
  }
}

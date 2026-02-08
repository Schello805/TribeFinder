import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getGroupLikeDelegate() {
  return (prisma as unknown as { groupLike?: typeof prisma.favoriteGroup }).groupLike;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const session = await getServerSession(authOptions).catch(() => null);

  const groupLike = getGroupLikeDelegate();
  if (!groupLike) {
    return NextResponse.json(
      {
        groupId: id,
        count: 0,
        likedByMe: false,
        message: "GroupLike ist noch nicht im Prisma Client verfügbar. Bitte 'npx prisma generate' ausführen.",
      },
      { status: 503 }
    );
  }

  try {
    const [count, likedByMe] = await Promise.all([
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
    ]);

    return NextResponse.json({ groupId: id, count, likedByMe });
  } catch {
    return NextResponse.json({ message: "Fehler beim Laden der Likes" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const session = await getServerSession(authOptions);

  const groupLike = getGroupLikeDelegate();
  if (!groupLike) {
    return NextResponse.json(
      { message: "GroupLike ist noch nicht im Prisma Client verfügbar. Bitte 'npx prisma generate' ausführen." },
      { status: 503 }
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    await groupLike.create({
      data: { userId: session.user.id, groupId: id },
      select: { id: true },
    });

    const count = await groupLike.count({ where: { groupId: id } });
    return NextResponse.json({ groupId: id, count, likedByMe: true }, { status: 201 });
  } catch (e) {
    const msg = e && typeof e === "object" && "code" in e ? String((e as { code?: unknown }).code) : "";
    if (msg === "P2002") {
      const count = await groupLike.count({ where: { groupId: id } });
      return NextResponse.json({ groupId: id, count, likedByMe: true }, { status: 200 });
    }
    return NextResponse.json({ message: "Fehler beim Liken" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const session = await getServerSession(authOptions);

  const groupLike = getGroupLikeDelegate();
  if (!groupLike) {
    return NextResponse.json(
      { message: "GroupLike ist noch nicht im Prisma Client verfügbar. Bitte 'npx prisma generate' ausführen." },
      { status: 503 }
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    await groupLike.delete({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    const count = await groupLike.count({ where: { groupId: id } });
    return NextResponse.json({ groupId: id, count, likedByMe: false });
  } catch {
    const count = await groupLike.count({ where: { groupId: id } });
    return NextResponse.json({ groupId: id, count, likedByMe: false }, { status: 200 });
  }
}

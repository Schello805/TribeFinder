import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getLikeDelegates() {
  const p = prisma as unknown as {
    groupLike?: {
      count: (args: unknown) => Promise<number>;
      findUnique: (args: unknown) => Promise<unknown>;
      create: (args: unknown) => Promise<unknown>;
      delete: (args: unknown) => Promise<unknown>;
      groupBy: (args: unknown) => Promise<unknown>;
    };
    favoriteGroup?: {
      findUnique: (args: unknown) => Promise<unknown>;
      delete: (args: unknown) => Promise<unknown>;
      groupBy: (args: unknown) => Promise<unknown>;
    };
  };

  return {
    groupLike: p.groupLike ?? null,
    favoriteGroup: p.favoriteGroup ?? null,
  };
}

async function getLikeSnapshot(groupId: string, userId: string | null) {
  const { groupLike, favoriteGroup } = getLikeDelegates();

  if (!groupLike && !favoriteGroup) {
    return { count: 0, likedByMe: false, hasModel: false };
  }

  const [groupLikePairsRaw, favoritePairsRaw] = await Promise.all([
    groupLike
      ? groupLike.groupBy({
          by: ["userId"],
          where: { groupId },
        })
      : Promise.resolve([]),
    favoriteGroup
      ? favoriteGroup.groupBy({
          by: ["userId"],
          where: { groupId },
        })
      : Promise.resolve([]),
  ]);

  const groupLikePairs = Array.isArray(groupLikePairsRaw) ? (groupLikePairsRaw as Array<{ userId: string }>) : [];
  const favoritePairs = Array.isArray(favoritePairsRaw) ? (favoritePairsRaw as Array<{ userId: string }>) : [];

  const users = new Set<string>();
  for (const x of groupLikePairs) users.add(x.userId);
  for (const x of favoritePairs) users.add(x.userId);

  return {
    count: users.size,
    likedByMe: userId ? users.has(userId) : false,
    hasModel: true,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const session = await getServerSession(authOptions).catch(() => null);

  try {
    const snap = await getLikeSnapshot(id, session?.user?.id ?? null);

    if (!snap.hasModel) {
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

    return NextResponse.json({ groupId: id, count: snap.count, likedByMe: snap.likedByMe });
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

  const { groupLike } = getLikeDelegates();
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

    const snap = await getLikeSnapshot(id, session.user.id);
    return NextResponse.json({ groupId: id, count: snap.count, likedByMe: true }, { status: 201 });
  } catch (e) {
    const msg = e && typeof e === "object" && "code" in e ? String((e as { code?: unknown }).code) : "";
    if (msg === "P2002") {
      const snap = await getLikeSnapshot(id, session.user.id);
      return NextResponse.json({ groupId: id, count: snap.count, likedByMe: true }, { status: 200 });
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

  const { groupLike, favoriteGroup } = getLikeDelegates();
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
    await Promise.all([
      groupLike.delete({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId: id,
          },
        },
      }),
      favoriteGroup
        ? favoriteGroup.delete({
            where: {
              userId_groupId: {
                userId: session.user.id,
                groupId: id,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const snap = await getLikeSnapshot(id, session.user.id);
    return NextResponse.json({ groupId: id, count: snap.count, likedByMe: false });
  } catch {
    const snap = await getLikeSnapshot(id, session.user.id);
    return NextResponse.json({ groupId: id, count: snap.count, likedByMe: false }, { status: 200 });
  }
}

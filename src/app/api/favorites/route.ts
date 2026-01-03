import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const favorites = await prisma.favoriteGroup.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          include: {
            location: true,
            tags: true,
            owner: {
              select: {
                name: true,
                dancerName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    // Check if already favorited
    const existing = await prisma.favoriteGroup.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already favorited" }, { status: 400 });
    }

    const favorite = await prisma.favoriteGroup.create({
      data: {
        userId: session.user.id,
        groupId,
      },
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    await prisma.favoriteGroup.delete({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}

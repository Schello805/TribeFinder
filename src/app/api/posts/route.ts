import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import logger from "@/lib/logger";

const postSchema = z.object({
  content: z.string().min(1, "Nachricht darf nicht leer sein").max(500, "Nachricht zu lang (max. 500 Zeichen)"),
  image: z.string().optional(),
});

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // Limit to recent 20 posts for now
    });

    return NextResponse.json(posts);
  } catch (error) {
    logger.error({ error }, "Error fetching posts");
    return NextResponse.json({ message: "Fehler beim Laden der Beiträge" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = postSchema.parse(body);

    const post = await prisma.post.create({
      data: {
        content: validatedData.content,
        image: validatedData.image,
        author: {
          connect: { id: session.user.id },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Ungültige Eingabe", errors: error.issues }, { status: 400 });
    }
    logger.error({ error }, "Error creating post");
    return NextResponse.json({ message: "Fehler beim Erstellen des Beitrags" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ message: "ID fehlt" }, { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!post) {
      return NextResponse.json({ message: "Beitrag nicht gefunden" }, { status: 404 });
    }

    if (post.authorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Keine Berechtigung" }, { status: 403 });
    }

    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Beitrag gelöscht" });
  } catch (error) {
    logger.error({ error }, "Error deleting post");
    return NextResponse.json({ message: "Fehler beim Löschen" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteUploadByPublicUrl } from "@/lib/uploadFiles";

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const urlsToDelete: string[] = [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        image: true,
        marketplaceListings: {
          select: {
            images: {
              select: {
                url: true,
              },
            },
          },
        },
        createdEvents: {
          select: {
            flyer1: true,
            flyer2: true,
          },
        },
        posts: {
          select: {
            image: true,
          },
        },
        ownedGroups: {
          select: {
            image: true,
            headerImage: true,
            galleryImages: {
              select: {
                url: true,
              },
            },
          },
        },
      },
    });

    if (user?.image) urlsToDelete.push(user.image);

    for (const ev of user?.createdEvents ?? []) {
      if (ev.flyer1) urlsToDelete.push(ev.flyer1);
      if (ev.flyer2) urlsToDelete.push(ev.flyer2);
    }

    for (const post of user?.posts ?? []) {
      if (post.image) urlsToDelete.push(post.image);
    }

    for (const listing of user?.marketplaceListings ?? []) {
      for (const img of listing.images ?? []) {
        if (img.url) urlsToDelete.push(img.url);
      }
    }

    for (const group of user?.ownedGroups ?? []) {
      if (group.image) urlsToDelete.push(group.image);
      if (group.headerImage) urlsToDelete.push(group.headerImage);
      for (const img of group.galleryImages ?? []) {
        if (img.url) urlsToDelete.push(img.url);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.externalLink.updateMany({
        where: { approvedById: userId },
        data: { approvedById: null },
      });

      await tx.group.deleteMany({
        where: { ownerId: userId },
      });

      await tx.user.delete({
        where: { id: userId },
      });
    });

    await Promise.all(
      urlsToDelete
        .filter((u) => typeof u === "string" && u.trim().startsWith("/uploads/"))
        .map((u) => deleteUploadByPublicUrl(u))
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

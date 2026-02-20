import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { groupUpdateSchema } from "@/lib/validations/group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { notifyAdminsAboutNewTags } from "@/lib/notifications";
import logger from "@/lib/logger";
import { revalidatePath } from "next/cache";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  const session = await getServerSession(authOptions);

  try {
    const base = await prisma.group.findUnique({
      where: { id },
      include: {
        location: true,
        tags: true,
        danceStyles: { include: { style: true } },
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        members: {
          select: {
            id: true,
            role: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!base) {
      return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
    }

    const isOwner = !!session?.user?.id && session.user.id === base.ownerId;
    const isGlobalAdmin = session?.user?.role === "ADMIN";
    const isAdminMember =
      !!session?.user?.id &&
      base.members.some((m) => m.user.id === session.user.id && m.role === "ADMIN" && m.status === "APPROVED");
    const canSeeEmails = isGlobalAdmin || isOwner || isAdminMember;

    if (!canSeeEmails) {
      return NextResponse.json({
        ...base,
        contactEmail: null,
        owner: { ...base.owner, email: null },
        members: base.members.map((m) => ({ ...m, user: { ...m.user, email: null } })),
      });
    }

    const full = await prisma.group.findUnique({
      where: { id },
      include: {
        location: true,
        tags: true,
        danceStyles: { include: { style: true } },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        members: {
          select: {
            id: true,
            role: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!full) {
      return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(full);
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "PrismaClientRustPanicError") {
      return NextResponse.json({ message: "Datenbankfehler (Prisma Engine)" }, { status: 503 });
    }
    logger.error({ error, groupId: id }, "Error fetching group");
    return NextResponse.json({ message: "Fehler beim Laden der Gruppe" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existingGroup = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true }
    });

    if (!existingGroup) {
      return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
    }

    if (existingGroup.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId: id,
          },
        },
        select: { role: true, status: true },
      });

      const isAdminMember = membership?.role === "ADMIN" && membership?.status === "APPROVED";
      if (!isAdminMember) {
        return NextResponse.json(
          { message: "Nur Administratoren können diese Gruppe bearbeiten" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    logger.debug({ body, groupId: id }, "PUT /api/groups - Received body");

    const validatedData = groupUpdateSchema.parse(body);
    logger.debug({ validatedData, groupId: id }, "PUT /api/groups - Validated data");

    const danceStylesInput =
      validatedData.danceStyles && validatedData.danceStyles.length > 0
        ? validatedData.danceStyles
        : validatedData.tags && validatedData.tags.length > 0
          ? validatedData.tags.map((name) => ({ name, level: "INTERMEDIATE" as const }))
          : [];

    const danceStylesCreate = danceStylesInput.length
      ? {
          deleteMany: {},
          create: await Promise.all(
            danceStylesInput.map(async (ds) => {
              if ("styleId" in ds) {
                return { level: ds.level, mode: (ds.mode ?? null) as unknown, style: { connect: { id: ds.styleId } } };
              }
              const style = await prisma.danceStyle.upsert({
                where: { name: ds.name },
                update: {},
                create: { name: ds.name },
                select: { id: true },
              });
              return { level: ds.level, mode: null, style: { connect: { id: style.id } } };
            })
          ),
        }
      : undefined;

    // Prüfen auf neue Tags für Benachrichtigung
    let newTagsToNotify: string[] = [];
    if (validatedData.tags && validatedData.tags.length > 0) {
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: validatedData.tags } },
        select: { name: true }
      });
      const existingTagNames = existingTags.map((t: { name: string }) => t.name);
      newTagsToNotify = validatedData.tags.filter(tag => !existingTagNames.includes(tag));
    }

    // Delete existing tags relationship (to replace with new ones)
    // Note: detailed tag handling might be more complex in real app, simply replacing for now
    
    logger.debug({ groupId: id }, "PUT /api/groups - Updating group in DB...");
    const group = await prisma.group.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        website: validatedData.website,
        contactEmail: validatedData.contactEmail,
        videoUrl: validatedData.videoUrl,
        size: validatedData.size,
        image: validatedData.image,
        headerImage: validatedData.headerImage,
        headerImageFocusY: validatedData.headerImageFocusY,
        headerGradientFrom: validatedData.headerGradientFrom,
        headerGradientTo: validatedData.headerGradientTo,
        
        trainingTime: validatedData.trainingTime,
        accessories: (validatedData as unknown as { accessories?: string }).accessories,
        performances: validatedData.performances ?? false,
        foundingYear: validatedData.foundingYear,
        seekingMembers: validatedData.seekingMembers ?? false,

        location: validatedData.location ? {
          upsert: {
            create: {
              lat: validatedData.location.lat,
              lng: validatedData.location.lng,
              address: validatedData.location.address
            },
            update: {
              lat: validatedData.location.lat,
              lng: validatedData.location.lng,
              address: validatedData.location.address
            }
          }
        } : undefined,
        tags: validatedData.tags ? {
          set: [], // Disconnect all existing tags
          connectOrCreate: validatedData.tags.map(tag => ({
            where: { name: tag },
            create: { name: tag }
          }))
        } : undefined,
        danceStyles: danceStylesCreate,
      }
    } as unknown as Parameters<typeof prisma.group.update>[0]);
    logger.info({ groupId: id }, "PUT /api/groups - Group updated");

    // Benachrichtigung senden
    if (newTagsToNotify.length > 0) {
      notifyAdminsAboutNewTags(newTagsToNotify, session.user.name || session.user.email || "Unbekannt").catch(err => console.error("Notification error:", err));
    }

    revalidatePath("/map");

    return NextResponse.json(group);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ errors: error.issues, groupId: id }, "PUT /api/groups - Validation error");
      return NextResponse.json({ message: "Ungültige Daten", errors: error.issues }, { status: 400 });
    }

    const err = error as Error & { code?: string; meta?: unknown };
    logger.error(
      {
        groupId: id,
        name: err?.name,
        message: err?.message,
        code: err?.code,
        meta: err?.meta,
        stack: err?.stack,
      },
      "PUT /api/groups - Error updating group"
    );

    return NextResponse.json(
      {
        message: "Fehler beim Aktualisieren der Gruppe",
        details: err?.message || (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const existingGroup = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true }
    });

    if (!existingGroup) {
      return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
    }

    if (existingGroup.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId: id,
          },
        },
        select: { role: true, status: true },
      });

      const isAdmin = membership?.role === "ADMIN" && membership?.status === "APPROVED";
      if (!isAdmin) {
        return NextResponse.json(
          { message: "Nur der Besitzer oder Gruppen-Admins können diese Gruppe löschen" },
          { status: 403 }
        );
      }
    }

    await prisma.group.delete({
      where: { id }
    });

    revalidatePath("/map");

    return NextResponse.json({ message: "Gruppe erfolgreich gelöscht" });
  } catch (error) {
    logger.error({ error, groupId: id }, "Error deleting group");
    return NextResponse.json({ message: "Fehler beim Löschen der Gruppe" }, { status: 500 });
  }
}

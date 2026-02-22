import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsPDF } from "jspdf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, "binary").toString("base64");
};

const tryFetchImageAsDataUrl = async (url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";

    const arrayBuffer = await res.arrayBuffer();
    const base64 = bufferToBase64(arrayBuffer);

    if (contentType.includes("png")) {
      return { dataUrl: `data:image/png;base64,${base64}`, format: "PNG" };
    }
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      return { dataUrl: `data:image/jpeg;base64,${base64}`, format: "JPEG" };
    }
    return null;
  } catch {
    return null;
  }
};

const tryGenerateQrDataUrl = async (text: string): Promise<string | null> => {
  try {
    const mod = (await import("qrcode")) as unknown as {
      toDataURL: (t: string, opts?: Record<string, unknown>) => Promise<string>;
    };
    return await mod.toDataURL(text, { margin: 0, width: 300 });
  } catch {
    return null;
  }
};

const getSizeLabel = (size: string | null) => {
  switch (size) {
    case "SOLO": return "Solo";
    case "DUO": return "Duo";
    case "TRIO": return "Trio";
    case "SMALL": return "Kleine Gruppe (4-10)";
    case "LARGE": return "Große Gruppe (>10)";
    default: return "Nicht angegeben";
  }
};

export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const requestUrl = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto") || "";
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const envBase = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const origin = forwardedProto && forwardedHost ? `${forwardedProto}://${forwardedHost}` : (envBase || requestUrl.origin);

  const envSiteUrl = (process.env.SITE_URL || "").trim().replace(/\/$/, "");
  const publicOrigin = envSiteUrl || envBase || origin;

  const drawGradientHeader = (doc: jsPDF, pageWidth: number, startHex?: string | null, endHex?: string | null) => {
    const topH = 52;
    const steps = 26;
    const start = hexToRgb(startHex || "") || { r: 79, g: 70, b: 229 }; // Indigo-600
    const end = hexToRgb(endHex || "") || { r: 168, g: 85, b: 247 }; // Fuchsia-ish
    const stepH = topH / steps;

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.round(start.r + (end.r - start.r) * t);
      const g = Math.round(start.g + (end.g - start.g) * t);
      const b = Math.round(start.b + (end.b - start.b) * t);
      doc.setFillColor(r, g, b);
      doc.rect(0, i * stepH, pageWidth, stepH + 0.2, "F");
    }

    // subtle highlight band
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0);
    doc.setFillColor(255, 255, 255);
    doc.setTextColor(255, 255, 255);
  };

  const sectionHeader = (doc: jsPDF, title: string, x: number, y: number, w: number, color: { r: number; g: number; b: number }) => {
    const h = 9;
    doc.setFillColor(color.r, color.g, color.b);
    doc.roundedRect(x, y, w, h, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, x + 3, y + 6.2);
    return y + h + 6;
  };

  const clampLines = (lines: string[], maxLines: number) => {
    if (lines.length <= maxLines) return lines;
    const out = lines.slice(0, maxLines);
    const last = out[out.length - 1];
    out[out.length - 1] = last.length > 3 ? `${last.slice(0, Math.max(0, last.length - 3))}...` : "...";
    return out;
  };

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Nicht angemeldet" }, { status: 401 });
    }

    const baseInclude = {
      location: true,
      tags: true,
      events: {
        where: {
          startDate: {
            gte: new Date(),
          },
        },
        orderBy: {
          startDate: "asc",
        },
        take: 3,
        select: {
          id: true,
          title: true,
          startDate: true,
          locationName: true,
        },
      },
    } as const;

    let group = await prisma.group
      .findUnique({
        where: { id },
        include: {
          ...baseInclude,
          danceStyles: {
            select: {
              level: true,
              mode: true,
              style: { select: { name: true } },
            },
            orderBy: { style: { name: "asc" } },
          },
        },
      })
      .catch(async (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Unknown field `mode`") || msg.includes("Unknown field 'mode'")) {
          return await prisma.group.findUnique({
            where: { id },
            include: {
              ...baseInclude,
              danceStyles: {
                select: {
                  level: true,
                  style: { select: { name: true } },
                },
                orderBy: { style: { name: "asc" } },
              },
            },
          });
        }
        throw err;
      });

    if (!group) {
      return NextResponse.json({ error: "Gruppe nicht gefunden" }, { status: 404 });
    }

    const isGlobalAdmin = session.user.role === "ADMIN";
    const isOwner = session.user.id === group.ownerId;
    let isGroupAdmin = false;

    if (!isOwner && !isGlobalAdmin) {
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId: id,
          },
        },
        select: { role: true, status: true },
      });
      isGroupAdmin = membership?.role === "ADMIN" && membership?.status === "APPROVED";
    }

    if (!isOwner && !isGlobalAdmin && !isGroupAdmin) {
      return NextResponse.json({ message: "Nicht autorisiert" }, { status: 403 });
    }

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let y = margin;

    // Header (group banner or gradient)
    const headerTopH = 52;
    if ((group as unknown as { headerImage?: string | null }).headerImage) {
      const raw = String((group as unknown as { headerImage?: string | null }).headerImage || "");
      const imageUrl = raw.startsWith("/") ? `${origin}${raw}` : raw;
      const banner = await tryFetchImageAsDataUrl(imageUrl);
      if (banner) {
        const focusYRaw = (group as unknown as { headerImageFocusY?: number | null }).headerImageFocusY;
        const focusY = typeof focusYRaw === "number" && Number.isFinite(focusYRaw) ? Math.min(100, Math.max(0, focusYRaw)) : 50;

        const props = doc.getImageProperties(banner.dataUrl);
        const scale = Math.max(pageWidth / props.width, headerTopH / props.height);
        const w = props.width * scale;
        const h = props.height * scale;
        const x = (pageWidth - w) / 2;
        const extraY = Math.max(0, h - headerTopH);
        const top = (extraY * focusY) / 100;

        // Clip to the header area so the image does not overlap content below
        (doc as unknown as { saveGraphicsState?: () => void }).saveGraphicsState?.();
        doc.rect(0, 0, pageWidth, headerTopH);
        (doc as unknown as { clip?: () => void }).clip?.();

        doc.addImage(banner.dataUrl, banner.format, x, -top, w, h);

        (doc as unknown as { restoreGraphicsState?: () => void }).restoreGraphicsState?.();
      } else {
        drawGradientHeader(doc, pageWidth,
          (group as unknown as { headerGradientFrom?: string | null }).headerGradientFrom,
          (group as unknown as { headerGradientTo?: string | null }).headerGradientTo
        );
      }
    } else {
      drawGradientHeader(doc, pageWidth,
        (group as unknown as { headerGradientFrom?: string | null }).headerGradientFrom,
        (group as unknown as { headerGradientTo?: string | null }).headerGradientTo
      );
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");

    // Optional Logo (top-right)
    const logoSize = 28;
    const logoPadding = 10;
    const logoX = pageWidth - margin - logoSize;
    const logoY = logoPadding;
    if (group.image) {
      const imageUrl = group.image.startsWith("/") ? `${origin}${group.image}` : group.image;
      const logo = await tryFetchImageAsDataUrl(imageUrl);
      if (logo) {
        // logo backdrop for transparent images
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4, 4, 4, "F");

        const props = doc.getImageProperties(logo.dataUrl);
        const maxW = logoSize;
        const maxH = logoSize;
        const scale = Math.min(maxW / props.width, maxH / props.height);
        const w = props.width * scale;
        const h = props.height * scale;
        const x = logoX + (maxW - w) / 2;
        const yy = logoY + (maxH - h) / 2;
        doc.addImage(logo.dataUrl, logo.format, x, yy, w, h);
      }
    }

    const titleMaxWidth = (group.image ? (logoX - margin - 10) : contentWidth);
    const titleLines = doc.splitTextToSize(group.name, titleMaxWidth);
    doc.text(titleLines, margin, 30);

    const footerY = pageHeight - 15;
    const contentMaxY = footerY - 18;

    y = 62;

    // Seeking Members Badge
    if (group.seekingMembers) {
      const badgeW = Math.min(contentWidth, 160);
      const badgeX = (pageWidth - badgeW) / 2;
      doc.setFillColor(254, 243, 199); // Yellow
      doc.roundedRect(badgeX, y, badgeW, 12, 6, 6, "F");
      doc.setTextColor(146, 64, 14);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Wir suchen neue Mitglieder", pageWidth / 2, y + 8, { align: "center" });
      y += 18;
    }

    // Performances / Requests Badge
    if (group.performances) {
      const badgeW = Math.min(contentWidth, 160);
      const badgeX = (pageWidth - badgeW) / 2;
      doc.setFillColor(237, 233, 254); // Purple
      doc.roundedRect(badgeX, y, badgeW, 12, 6, 6, "F");
      doc.setTextColor(88, 28, 135);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Auftrittsanfragen erwünscht", pageWidth / 2, y + 8, { align: "center" });
      y += 18;
    }

    const innerX = margin;
    const innerW = contentWidth;

    // Reserve a fixed bottom area for the contact box (prevents overlap)
    const contactBoxHeight = 45;
    const contactBoxY = contentMaxY - contactBoxHeight - 4;
    const contentBottomY = contactBoxY - 10;

    // Description Section
    y = sectionHeader(doc, "Über uns", innerX, y, 64, { r: 79, g: 70, b: 229 });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    
    // Word wrap description
    const descLines = doc.splitTextToSize(group.description, innerW);
    const descMaxLines = Math.max(0, Math.floor((contentBottomY - y) / 5) - 18);
    const descOut = clampLines(descLines, Math.max(3, descMaxLines));
    doc.text(descOut, innerX, y);
    y += descOut.length * 5 + 10;

    // Details Section
    if (y < contentBottomY - 40) {
      y = sectionHeader(doc, "Details", innerX, y, 54, { r: 30, g: 64, b: 175 });
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Fixed label width for alignment
    const labelWidth = 45;
    const valueMaxWidth = Math.max(10, innerW - labelWidth);

    // Size
    doc.setTextColor(107, 114, 128);
    doc.text("Gruppengröße:", innerX, y);
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    {
      const lines = doc.splitTextToSize(getSizeLabel(group.size), valueMaxWidth);
      doc.text(lines, innerX + labelWidth, y);
      y += lines.length * 5 + 2;
    }

    // Founding Year
    if (group.foundingYear) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Gegründet:", innerX, y);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      {
        const lines = doc.splitTextToSize(String(group.foundingYear), valueMaxWidth);
        doc.text(lines, innerX + labelWidth, y);
        y += lines.length * 5 + 2;
      }
    }

    // Location
    if (group.location?.address) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Standort:", innerX, y);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      {
        const lines = clampLines(doc.splitTextToSize(group.location.address, valueMaxWidth), 3);
        doc.text(lines, innerX + labelWidth, y);
        y += lines.length * 5 + 2;
      }
    }

    // Training Time
    if (group.trainingTime) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Training:", innerX, y);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      {
        const lines = clampLines(doc.splitTextToSize(group.trainingTime, valueMaxWidth), 3);
        doc.text(lines, innerX + labelWidth, y);
        y += lines.length * 5 + 2;
      }
    }

    // Performances
    if (group.performances) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Auftritte:", innerX, y);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      {
        const lines = doc.splitTextToSize("Ja, wir treten auf!", valueMaxWidth);
        doc.text(lines, innerX + labelWidth, y);
        y += lines.length * 5 + 2;
      }
    }

    y += 8;

    // Dance Styles (prefer structured danceStyles; fallback to tags)
    const danceStylesAny = (group as unknown as { danceStyles?: Array<{ level: string; mode?: string | null; style: { name: string } }> }).danceStyles;
    const danceStyles = Array.isArray(danceStylesAny) ? danceStylesAny : [];
    const danceStyleItems = danceStyles.length
      ? danceStyles.map((ds) => {
          const level = String(ds.level || "").toLowerCase();
          const levelLabel = level === "beginner" ? "Anfänger" : level === "intermediate" ? "Fortgeschritten" : level === "advanced" ? "Sehr fortgeschritten" : level === "professional" ? "Profi" : "";
          const mode = String(ds.mode || "").toLowerCase();
          const modeLabel = mode === "impro" ? "Impro" : mode === "choreo" ? "Choreo" : mode === "both" ? "Beides" : "";
          const suffix = [levelLabel, modeLabel].filter(Boolean).join(" · ");
          return suffix ? `${ds.style.name} (${suffix})` : ds.style.name;
        })
      : (group.tags || []).map((t: { name: string }) => t.name);

    if (danceStyleItems.length > 0 && y < contentBottomY - 30) {
      y = sectionHeader(doc, "Tanzstile", innerX, y, 64, { r: 67, g: 56, b: 202 });
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(67, 56, 202);
      const text = danceStyleItems.join(" • ");
      const lines = clampLines(doc.splitTextToSize(text, innerW), 3);
      doc.text(lines, innerX, y);
      y += lines.length * 5 + 8;
    }

    // Events (only if space remains; never add pages)
    if (group.events && group.events.length > 0 && y < contentBottomY - 40) {
      y = sectionHeader(doc, "Kommende Events", innerX, y, 88, { r: 17, g: 94, b: 89 });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);

      for (const event of group.events) {
        if (y > contentBottomY - 30) break;
        const date = new Date(event.startDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
        const time = new Date(event.startDate).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        const loc = event.locationName ? ` – ${event.locationName}` : "";
        const line = `${date} ${time} – ${event.title}${loc}`;
        const lines = clampLines(doc.splitTextToSize(line, innerW), 2);
        doc.text(lines, innerX, y);
        y += lines.length * 5 + 2;
      }

      y += 6;
    }

    // QR Codes (Group URL + Video URL)
    const groupUrl = `${publicOrigin}/groups/${group.id}`;
    const groupQr = await tryGenerateQrDataUrl(groupUrl);
    const videoQr = group.videoUrl ? await tryGenerateQrDataUrl(group.videoUrl) : null;

    // Contact Section (two columns: left contact info, right QR codes)
    y = Math.min(y, contactBoxY);

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(innerX, y, innerW, contactBoxHeight, 6, 6, "F");

    const boxPaddingX = 5;
    const boxPaddingY = 10;
    const boxX = innerX;
    const boxY = y;

    // Right column: QR codes
    const qrSize = 24;
    const qrGap = 6;
    const showGroupQr = Boolean(groupQr);
    const showVideoQr = Boolean(videoQr);
    const qrCount = (showGroupQr ? 1 : 0) + (showVideoQr ? 1 : 0);
    const qrBlockWidth = qrCount > 0 ? (qrCount * qrSize + (qrCount - 1) * qrGap) : 0;
    const qrBlockX = boxX + innerW - boxPaddingX - qrBlockWidth;
    const qrBlockY = boxY + 14;

    // Left column width considers QR block
    const leftMaxWidth = innerW - (qrCount > 0 ? (qrBlockWidth + 10) : 0);
    const leftX = boxX + boxPaddingX;

    // Title
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Kontakt & Mehr Infos", leftX, boxY + boxPaddingY);

    // Contact lines
    let contactY = boxY + boxPaddingY + 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);

    {
      const emailValue = (group.contactEmail || "(nicht hinterlegt)").toString();
      const emailLines = clampLines(doc.splitTextToSize(`E-Mail: ${emailValue}`, leftMaxWidth), 2);
      doc.text(emailLines, leftX, contactY);
      contactY += emailLines.length * 5 + 1;
    }

    {
      const webValue = (group.website || "(nicht hinterlegt)").toString();
      const webLines = clampLines(doc.splitTextToSize(`Web: ${webValue}`, leftMaxWidth), 2);
      doc.text(webLines, leftX, contactY);
      contactY += webLines.length * 5 + 1;
    }

    if (qrCount > 0) {
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);

      let x = qrBlockX;
      if (groupQr) {
        doc.addImage(groupQr, "PNG", x, qrBlockY, qrSize, qrSize);
        doc.text("Gruppe", x + qrSize / 2, qrBlockY + qrSize + 5, { align: "center" });
        x += qrSize + qrGap;
      }
      if (videoQr) {
        doc.addImage(videoQr, "PNG", x, qrBlockY, qrSize, qrSize);
        doc.text("Video", x + qrSize / 2, qrBlockY + qrSize + 5, { align: "center" });
      }
    }

    y += contactBoxHeight + 5;

    // Footer
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Erstellt mit TribeFinder.de", margin, footerY);
    doc.text(publicOrigin, pageWidth / 2, footerY, { align: "center" });
    doc.text(new Date().toLocaleDateString("de-DE"), pageWidth - margin, footerY, { align: "right" });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    const disposition = requestUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const safeFilename = `${group.name.replace(/[^a-zA-Z0-9]/g, "_")}_Flyer.pdf`;

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Fehler bei der PDF-Generierung" }, { status: 500 });
  }
}

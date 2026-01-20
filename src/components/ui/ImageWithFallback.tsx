"use client";

import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  fallbackSrc?: string;
};

function normalizeUploadedImageUrl(image?: string | null): string | null {
  if (!image) return null;
  const trimmed = image.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/uploads/")) return trimmed;
  if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
  if (!trimmed.startsWith("/")) return `/uploads/${trimmed}`;
  return trimmed;
}

export default function ImageWithFallback({
  src,
  fallbackSrc = "/icons/icon.svg",
  ...rest
}: Props) {
  const normalizedSrc = normalizeUploadedImageUrl(src);
  return (
    <img
      {...rest}
      alt={rest.alt ?? ""}
      src={normalizedSrc || fallbackSrc}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src && !img.src.endsWith(fallbackSrc)) img.src = fallbackSrc;
        rest.onError?.(e);
      }}
    />
  );
}

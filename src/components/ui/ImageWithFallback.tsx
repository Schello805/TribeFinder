"use client";

import type { ImgHTMLAttributes } from "react";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  fallbackSrc?: string;
};

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

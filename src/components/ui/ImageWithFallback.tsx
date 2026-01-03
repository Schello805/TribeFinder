"use client";

import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  fallbackSrc?: string;
};

export default function ImageWithFallback({
  src,
  fallbackSrc = "/icons/icon.svg",
  ...rest
}: Props) {
  return (
    <img
      {...rest}
      alt={rest.alt ?? ""}
      src={src || fallbackSrc}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src && !img.src.endsWith(fallbackSrc)) img.src = fallbackSrc;
        rest.onError?.(e);
      }}
    />
  );
}

"use client";

import { useEffect, useState } from "react";
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
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      {...rest}
      src={currentSrc}
      onError={(e) => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
        rest.onError?.(e);
      }}
    />
  );
}

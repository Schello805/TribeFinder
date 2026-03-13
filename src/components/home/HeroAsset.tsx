"use client";

import Image from "next/image";
import { useState } from "react";

export default function HeroAsset({
  url,
  isVideo,
  placeholderUrl,
}: {
  url: string;
  isVideo: boolean;
  placeholderUrl?: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  if (isVideo) {
    return (
      <div className="relative w-full h-full rounded-2xl p-4 flex items-center justify-center">
        {!isLoaded && placeholderUrl ? (
          <div className="absolute inset-0">
            <Image
              src={placeholderUrl}
              alt="TribeFinder"
              fill
              sizes="(min-width: 768px) 28rem, 100vw"
              className="object-contain opacity-70"
              unoptimized
            />
          </div>
        ) : null}
        <span className="relative z-10 inline-flex [filter:drop-shadow(0_14px_28px_rgba(0,0,0,0.28))_drop-shadow(0_6px_10px_rgba(0,0,0,0.16))]">
          <video
            src={url}
            className="h-full w-full object-contain"
            muted
            autoPlay
            loop
            playsInline
            onLoadedData={() => setIsLoaded(true)}
            onCanPlay={() => setIsLoaded(true)}
            onError={() => setIsLoaded(true)}
          />
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-full aspect-square rounded-full overflow-hidden flex items-center justify-center p-3">
      {!isLoaded && placeholderUrl ? (
        <div className="absolute inset-0">
          <Image
            src={placeholderUrl}
            alt="TribeFinder"
            fill
            sizes="(min-width: 768px) 28rem, 100vw"
            className="object-contain opacity-70"
            unoptimized
          />
        </div>
      ) : null}
      <span className="relative z-10 inline-flex w-full h-full [filter:drop-shadow(0_14px_28px_rgba(0,0,0,0.28))_drop-shadow(0_6px_10px_rgba(0,0,0,0.16))]">
        <Image
          src={url}
          alt="TribeFinder"
          width={280}
          height={280}
          className="h-full w-full object-contain"
          unoptimized
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
      </span>
    </div>
  );
}

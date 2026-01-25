"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AdminEmbedMode() {
  const params = useSearchParams();
  const isEmbed = params.get("embed") === "1";

  useEffect(() => {
    if (!isEmbed) return;

    const els: Array<HTMLElement | null> = [
      document.querySelector("nav"),
      document.querySelector("footer"),
      document.querySelector("button.fixed.bottom-6.right-6"),
    ];

    const previous = els.map((el) => (el ? el.style.display : ""));

    els.forEach((el) => {
      if (el) el.style.display = "none";
    });

    return () => {
      els.forEach((el, idx) => {
        if (el) el.style.display = previous[idx] || "";
      });
    };
  }, [isEmbed]);

  return null;
}

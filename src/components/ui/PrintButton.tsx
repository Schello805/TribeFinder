"use client";

import type { ReactNode } from "react";

export default function PrintButton({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {children ?? "Drucken"}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface FlyerGeneratorProps {
  group: {
    id: string;
    name: string;
    description: string;
    image?: string | null;
    website?: string | null;
    contactEmail?: string | null;
    trainingTime?: string | null;
    size?: string | null;
    foundingYear?: number | null;
    seekingMembers?: boolean;
    performances?: boolean;
    location?: {
      address?: string | null;
    } | null;
    tags?: { name: string }[];
  };
}

export default function FlyerGenerator({ group }: FlyerGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  const handlePreview = async () => {
    const url = `/api/groups/${group.id}/flyer?disposition=inline`;
    const win = window.open("about:blank", "_blank");
    if (!win) {
      showToast("Popup blockiert", "error");
      return;
    }

    setIsGenerating(true);
    try {
      win.opener = null;
      win.location.href = url;
      showToast("Flyer-Vorschau geöffnet", "success");
    } catch (error) {
      console.error("Flyer preview failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handlePreview}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition-all shadow-sm font-medium text-sm disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Erstelle PDF...</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>Flyer Vorschau</span>
        </>
      )}
    </button>
  );
}

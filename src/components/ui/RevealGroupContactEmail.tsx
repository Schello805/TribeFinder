"use client";

import { useState } from "react";
import ObfuscatedEmail from "@/components/ui/ObfuscatedEmail";
import { useToast } from "@/components/ui/Toast";

export default function RevealGroupContactEmail({ groupId, className = "" }: { groupId: string; className?: string }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function reveal() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/contact-email`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Kontakt-E-Mail konnte nicht geladen werden");
      if (!data?.email) throw new Error("Kontakt-E-Mail konnte nicht geladen werden");
      setEmail(String(data.email));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Kontakt-E-Mail konnte nicht geladen werden", "error");
    } finally {
      setIsLoading(false);
    }
  }

  if (email) {
    return <ObfuscatedEmail email={email} className={className} />;
  }

  return (
    <button
      type="button"
      onClick={() => void reveal()}
      disabled={isLoading}
      className={className}
      title="Klicken um E-Mail anzuzeigen"
    >
      {isLoading ? "Lade..." : "E-Mail anzeigen"}
    </button>
  );
}

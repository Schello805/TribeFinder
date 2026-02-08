"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function DeleteGroupButton(props: {
  groupId: string;
  className?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const onDelete = async () => {
    const ok = window.confirm(
      "Gruppe wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden."
    );
    if (!ok) return;

    const typed = window
      .prompt(
        "Zur Bestätigung bitte LÖSCHEN eintippen (Großbuchstaben).",
        ""
      )
      ?.trim();
    if (typed !== "LÖSCHEN") {
      showToast("Löschen abgebrochen.", "info");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups/${props.groupId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data?.message || "Fehler beim Löschen der Gruppe", "error");
        return;
      }

      showToast("Gruppe gelöscht", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      showToast("Fehler beim Löschen der Gruppe", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading) onDelete();
      }}
      disabled={isLoading}
      className={
        props.className ||
        "tf-gothic-btn px-4 py-2 rounded-md shadow-sm text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 bg-red-600 text-white hover:bg-red-700 border border-red-700 disabled:opacity-50"
      }
      title="Gruppe löschen"
    >
      Gruppe löschen
    </button>
  );
}

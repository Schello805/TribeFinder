"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function DeleteMarketplaceListingButton({
  listingId,
  redirectTo,
}: {
  listingId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Möchtest du dieses Inserat wirklich löschen?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/marketplace/${listingId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { message?: string };

      if (!res.ok) {
        showToast(data?.message || "Fehler beim Löschen", "error");
        return;
      }

      showToast("Inserat gelöscht", "success");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch {
      showToast("Fehler beim Löschen", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={isDeleting}
      className="px-4 py-2 rounded-md border border-red-200 bg-[var(--surface)] text-red-700 hover:bg-red-50 disabled:opacity-50 transition font-medium"
    >
      {isDeleting ? "Lösche…" : "Inserat löschen"}
    </button>
  );
}

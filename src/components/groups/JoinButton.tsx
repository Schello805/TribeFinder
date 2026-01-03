"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface JoinButtonProps {
  groupId: string;
  initialStatus: string; // 'APPROVED' | 'PENDING' | 'NONE'
}

export default function JoinButton({ groupId, initialStatus }: JoinButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleJoin = async () => {
    setIsLoading(true);
    try {
      const isJoining = status === 'NONE';
      const method = isJoining ? "POST" : "DELETE";
      
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method,
      });

      if (response.ok) {
        if (isJoining) {
          setStatus('PENDING'); // Assume pending after join request
        } else {
          setStatus('NONE');
        }
        router.refresh();
      } else {
        const data = await response.json();
        console.error("Failed to update membership:", data.message);
        alert(data.message || "Fehler beim Aktualisieren der Mitgliedschaft");
      }
    } catch (error) {
      console.error("Error updating membership:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonConfig = () => {
    switch (status) {
      case 'APPROVED':
        return {
          text: "Mitgliedschaft beenden",
          className: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
        };
      case 'PENDING':
        return {
          text: "Anfrage zurückziehen",
          className: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200"
        };
      default:
        return {
          text: "Gruppe beitreten",
          className: "bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent"
        };
    }
  };

  const config = getButtonConfig();

  return (
    <button
      onClick={handleToggleJoin}
      disabled={isLoading}
      className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 ${config.className}`}
    >
      {isLoading ? "Wird geladen..." : config.text}
    </button>
  );
}

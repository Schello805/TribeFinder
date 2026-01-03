"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GroupsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Groups error:", error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <span className="text-2xl">👥</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          Gruppen konnten nicht geladen werden
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          Beim Laden der Tanzgruppen ist ein Fehler aufgetreten.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            Erneut laden
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-medium"
          >
            Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}

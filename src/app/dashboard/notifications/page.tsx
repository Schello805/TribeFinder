"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import RadiusMapPicker from "@/components/user/RadiusMapPicker";

type Prefs = {
  emailNotifications: boolean;
  notifyInboxMessages: boolean;
  notifyNewGroups: boolean;
  notifyNewEvents: boolean;
  notifyRadius: number;
  notifyLat: number | null;
  notifyLng: number | null;
};

export default function DashboardNotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({
    emailNotifications: true,
    notifyInboxMessages: false,
    notifyNewGroups: false,
    notifyNewEvents: false,
    notifyRadius: 50,
    notifyLat: null,
    notifyLng: null,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/user/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setPrefs((p) => ({ ...p, ...data }));
        })
        .finally(() => setIsLoading(false));
    }
  }, [status, router]);

  const save = async () => {
    setIsSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data?.message || "Fehler beim Speichern");
        return;
      }

      setMessage("Gespeichert!");
      setTimeout(() => setMessage(""), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="p-8 text-center text-gray-700 dark:text-gray-200">Laden...</div>;
  }

  if (!session?.user) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Benachrichtigungen</h2>
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">E-Mail Benachrichtigungen</div>
            <div className="text-sm text-gray-500 dark:text-gray-300">Aktiviere/Deaktiviere Benachrichtigungen per E-Mail.</div>
          </div>
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, emailNotifications: !p.emailNotifications }))}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium border transition ${
              prefs.emailNotifications
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {prefs.emailNotifications ? "Aktiv" : "Inaktiv"}
          </button>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white">Inbox (Gruppen-Nachrichten)</div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Benachrichtige mich per E-Mail, wenn eine Gruppe eine neue Nachricht erhält.
            </div>
            <button
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, notifyInboxMessages: !p.notifyInboxMessages }))}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium border transition ${
                prefs.notifyInboxMessages
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {prefs.notifyInboxMessages ? "Aktiv" : "Inaktiv"}
            </button>
          </div>

          <div className="text-sm font-medium text-gray-900 dark:text-white">Neue Inhalte in deiner Nähe</div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, notifyNewGroups: !p.notifyNewGroups }))}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium border transition ${
                prefs.notifyNewGroups
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Neue Gruppen
            </button>

            <button
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, notifyNewEvents: !p.notifyNewEvents }))}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium border transition ${
                prefs.notifyNewEvents
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Neue Events
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Umkreis</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Wähle, in welchem Radius du Benachrichtigungen bekommst.</div>
              </div>
              <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{prefs.notifyRadius} km</div>
            </div>

            <input
              type="range"
              min={10}
              max={250}
              step={10}
              value={prefs.notifyRadius}
              onChange={(e) => setPrefs((p) => ({ ...p, notifyRadius: Number(e.target.value) }))}
              className="w-full"
            />

            <RadiusMapPicker
              lat={prefs.notifyLat}
              lng={prefs.notifyLng}
              radiusKm={prefs.notifyRadius}
              onChange={({ lat, lng }) => setPrefs((p) => ({ ...p, notifyLat: lat, notifyLng: lng }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm font-medium text-green-600 min-h-[1.5rem]">{message}</div>
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? "Speichere..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

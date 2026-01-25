import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

function OpsCard({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <Link href={href} className="inline-flex items-center justify-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
          {action}
        </Link>
      </div>
    </div>
  );
}

export default async function AdminOpsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Betrieb</h1>

      <AdminNav />

      <div className="grid grid-cols-1 gap-6">
        <OpsCard
          title="Backups & Restore"
          description="Manuelle Backups, Upload/Inspect, Restore und Auto-Backup Status."
          href="/admin/backups"
          action="Zu Backups"
        />

        <OpsCard
          title="Diagnose"
          description="Self-Test: Datenbank, Uploads, Konfiguration und wichtige Endpunkte."
          href="/admin/diagnostics"
          action="Zu Diagnose"
        />

        <OpsCard
          title="Fehler"
          description="Fehler/Reports einsehen und bearbeiten."
          href="/admin/errors"
          action="Zu Fehlern"
        />

        <OpsCard
          title="Feedback"
          description="Feedback-Liste sowie Benachrichtigungs-Empfänger konfigurieren."
          href="/admin/feedback"
          action="Zu Feedback"
        />
      </div>
    </div>
  );
}

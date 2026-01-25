import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

function OpsAccordionItem({
  title,
  description,
  src,
  height,
}: {
  title: string;
  description: string;
  src: string;
  height: string;
}) {
  return (
    <details className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
      <summary className="cursor-pointer select-none px-4 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">{title}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</div>
          </div>
          <div className="text-sm text-gray-400">Öffnen</div>
        </div>
      </summary>
      <div className="border-t border-gray-200 dark:border-gray-700">
        <iframe src={src} title={title} className={`w-full ${height} bg-transparent`} />
      </div>
    </details>
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
        <OpsAccordionItem
          title="Backups & Restore"
          description="Manuelle Backups, Upload/Inspect, Restore und Auto-Backup Status."
          src="/admin/backups?embed=1"
          height="h-[1900px]"
        />

        <OpsAccordionItem
          title="Diagnose"
          description="Self-Test: Datenbank, Uploads, Konfiguration und wichtige Endpunkte."
          src="/admin/diagnostics?embed=1"
          height="h-[900px]"
        />

        <OpsAccordionItem
          title="Fehler"
          description="Fehler/Reports einsehen und bearbeiten."
          src="/admin/errors?embed=1"
          height="h-[1400px]"
        />

        <OpsAccordionItem
          title="Feedback"
          description="Feedback-Liste sowie Benachrichtigungs-Empfänger konfigurieren."
          src="/admin/feedback?embed=1"
          height="h-[1400px]"
        />
      </div>
    </div>
  );
}

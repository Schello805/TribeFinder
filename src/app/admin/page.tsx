import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import AdminEmailTest from "@/components/admin/AdminEmailTest";
import TagSeeder from "@/components/admin/TagSeeder";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    redirect("/");
  }

  // Statistiken laden
  let pendingTagsCount = 0;
  let totalTagsCount = 0;
  let totalGroupsCount = 0;
  let totalUsersCount = 0;
  let pendingTags: Array<{ id: string; name: string; isApproved: boolean }> = [];
  let approvedTags: Array<{ id: string; name: string; isApproved: boolean }> = [];

  try {
    pendingTagsCount = await prisma.tag.count({
      where: { isApproved: false },
    });
    totalTagsCount = await prisma.tag.count();
    totalGroupsCount = await prisma.group.count();
    totalUsersCount = await prisma.user.count();

    pendingTags = await prisma.tag.findMany({
      where: { isApproved: false },
      take: 5,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isApproved: true },
    });

    approvedTags = await prisma.tag.findMany({
      where: { isApproved: true },
      take: 20,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isApproved: true },
    });
  } catch {
    pendingTagsCount = 0;
    totalTagsCount = 0;
    totalGroupsCount = 0;
    totalUsersCount = 0;
    pendingTags = [];
    approvedTags = [];
  }

  // Settings laden
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_FROM']
      }
    }
  });

  const dbConfig = settings.reduce((acc: Record<string, string>, setting: { key: string; value: string }) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  const smtpHost = dbConfig.SMTP_HOST || process.env.SMTP_HOST;
  const smtpPort = dbConfig.SMTP_PORT || process.env.SMTP_PORT;
  const smtpUser = dbConfig.SMTP_USER || process.env.SMTP_USER;
  const smtpFrom = dbConfig.SMTP_FROM || process.env.SMTP_FROM;
  
  // Prüfen ob Passwort gesetzt ist (DB Wert muss nicht-leer sein)
  const dbPasswordEntry = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_PASSWORD' } });
  const hasDbPassword = dbPasswordEntry && dbPasswordEntry.value.length > 0;
  const hasEnvPassword = !!process.env.SMTP_PASSWORD;
  
  const isConfigured = !!(smtpHost && smtpUser && (hasDbPassword || hasEnvPassword));

  const smtpConfig = {
    host: smtpHost || 'Nicht gesetzt',
    port: smtpPort || 'Nicht gesetzt',
    user: smtpUser || 'Nicht gesetzt',
    from: smtpFrom || 'Nicht gesetzt',
    isConfigured
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>

      <AdminNav />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Gruppen Gesamt</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{totalGroupsCount}</dd>
        </div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Benutzer Gesamt</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{totalUsersCount}</dd>
        </div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Tags Gesamt</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{totalTagsCount}</dd>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Benutzerverwaltung</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Verwaltung aller registrierten Benutzer und Test-User Status.
            </p>
          </div>
          <Link 
            href="/admin/users" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Benutzer verwalten
          </Link>
        </div>
      </div>

      {/* Tags Section */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Tanzstile / Tags</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Verwaltung der Kategorien und Stile.
            </p>
          </div>
          <div className="flex gap-2">
            <TagSeeder />
            <Link 
              href="/admin/tags" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Alle verwalten
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="space-y-4">
            
            {/* Pending Tags Alert */}
            {pendingTagsCount > 0 ? (
              <div className="flex flex-col gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-100 dark:border-yellow-800">
                <div className="flex items-center text-yellow-800 dark:text-yellow-200 font-medium">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {pendingTagsCount} Tanzstil(e) warten auf Freigabe:
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {pendingTags.map((tag: { id: string; name: string }) => (
                    <span key={tag.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                      {tag.name}
                    </span>
                  ))}
                  {pendingTagsCount > 5 && <span className="text-xs text-yellow-600 self-center">... und weitere</span>}
                </div>
                <div className="mt-2">
                  <Link href="/admin/tags" className="text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 hover:underline">
                    Jetzt prüfen &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-md">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Alle Tanzstile sind aktuell geprüft.</span>
              </div>
            )}

            {/* Approved Tags Preview */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aktive Tanzstile (Auszug):</h4>
              {approvedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {approvedTags.map((tag: { id: string; name: string }) => (
                    <span key={tag.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {tag.name}
                    </span>
                  ))}
                  {totalTagsCount > 20 && (
                    <Link href="/admin/tags" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-indigo-600 hover:bg-indigo-50">
                      +{totalTagsCount - 20} weitere...
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Noch keine Tanzstile vorhanden. 
                  <div className="mt-2">
                    <TagSeeder />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Email Config Section */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Email Konfiguration (SMTP)</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Verwaltung der Email-Server Einstellungen.
            </p>
          </div>
          <Link 
            href="/admin/settings" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ⚙️ Einstellungen bearbeiten
          </Link>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {smtpConfig.isConfigured ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Konfiguriert
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Fehlende Konfiguration
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Host</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono text-xs">{smtpConfig.host}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Port</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono text-xs">{smtpConfig.port}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Benutzer</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono text-xs truncate">{smtpConfig.user}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Absender (From)</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono text-xs">{smtpConfig.from}</dd>
            </div>
          </dl>
          
          <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
             <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Test-Email senden</h4>
             <AdminEmailTest currentUserEmail={session.user.email || ""} />
          </div>
        </div>
      </div>

      {/* Matomo / Analytics Section */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Analytics (Matomo)</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Tracking-Code für Besucheranalyse.
            </p>
          </div>
          <Link 
            href="/admin/settings" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ⚙️ Einstellungen bearbeiten
          </Link>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Füge deinen Matomo-Tracking-Code unter <Link href="/admin/settings" className="text-indigo-600 hover:underline">Einstellungen</Link> ein, um Besucherstatistiken zu erfassen.
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Optionen: Matomo URL + Site ID oder kompletter Tracking-Code
          </div>
        </div>
      </div>
    </div>
  );
}

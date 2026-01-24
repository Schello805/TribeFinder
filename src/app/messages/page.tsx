import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nachrichten</h1>
      <p className="text-gray-600 dark:text-gray-300">
        Der Nachrichtenbereich ist noch in Arbeit.
      </p>
      {session ? (
        <p className="text-gray-600 dark:text-gray-300">
          Du kannst aktuell bereits Gruppen über die Kontakt-E-Mail oder Events kontaktieren.
        </p>
      ) : (
        <p className="text-gray-600 dark:text-gray-300">
          Bitte melde dich an, um Nachrichten zu nutzen, sobald das Feature verfügbar ist.
        </p>
      )}
      <div className="flex gap-3">
        <Link
          href="/groups"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
        >
          Gruppen finden
        </Link>
        <Link
          href="/"
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );

}

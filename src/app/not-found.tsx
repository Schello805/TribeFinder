import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
          <span className="text-4xl">🔍</span>
        </div>
        <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">
          404
        </h1>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Seite nicht gefunden
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Die gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Zur Startseite
          </Link>
          <Link
            href="/groups"
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium"
          >
            Gruppen entdecken
          </Link>
        </div>
      </div>
    </div>
  );
}

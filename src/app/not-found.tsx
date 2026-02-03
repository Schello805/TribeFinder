import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-[var(--bg)] text-[var(--foreground)]">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--surface-2)] border border-[var(--border)] mb-6">
          <span className="text-4xl">🔍</span>
        </div>
        <h1 className="tf-display text-6xl font-bold text-[var(--muted)] mb-4">
          404
        </h1>
        <h2 className="tf-display text-2xl font-bold text-[var(--foreground)] mb-4">
          Seite nicht gefunden
        </h2>
        <p className="text-[var(--muted)] mb-8">
          Die gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/"
            className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition font-medium"
          >
            Zur Startseite
          </Link>
          <Link
            href="/groups"
            className="px-6 py-3 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--surface-hover)] transition font-medium"
          >
            Gruppen entdecken
          </Link>
        </div>
      </div>
    </div>
  );
}

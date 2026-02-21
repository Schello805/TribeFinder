import prisma from "@/lib/prisma";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

export const dynamic = "force-dynamic";

type MarketingAssetType = "LOGO" | "HEADER" | "POSTER";

type MarketingAsset = {
  id: string;
  type: MarketingAssetType;
  title: string;
  description: string | null;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  const value = i === 0 ? String(Math.round(n)) : n.toFixed(1);
  return `${value} ${units[i]}`;
}

export default async function MarketingPage() {
  const items = (await prisma.marketingAsset.findMany({
    orderBy: { createdAt: "desc" },
  })) as MarketingAsset[];

  const grouped = items.reduce((acc: Record<MarketingAssetType, MarketingAsset[]>, item: MarketingAsset) => {
    acc[item.type].push(item);
    return acc;
  }, {
    LOGO: [],
    HEADER: [],
    POSTER: [],
  });

  const sections: Array<{ key: "LOGO" | "HEADER" | "POSTER"; title: string; subtitle: string }> = [
    { key: "LOGO", title: "Logo", subtitle: "Für Webseiten, Social Media und Flyer" },
    { key: "HEADER", title: "Header / Banner", subtitle: "Für Webseiten, Newsletter oder Social Posts" },
    { key: "POSTER", title: "Plakate", subtitle: "Zum Download und Weiterverteilen" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-2">
        <h1 className="tf-display text-3xl font-extrabold text-[var(--foreground)]">Marketing</h1>
        <p className="text-sm text-[var(--muted)]">
          Hier findest du offizielles Material (Logo, Header, Plakate), das du gerne teilen und zur Bewerbung von TribeFinder nutzen kannst.
        </p>
      </div>

      {sections.map((sec) => {
        const list = grouped[sec.key] || [];
        return (
          <section key={sec.key} className="space-y-4">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="tf-display text-xl font-bold text-[var(--foreground)]">{sec.title}</div>
                <div className="text-sm text-[var(--muted)]">{sec.subtitle}</div>
              </div>
              <div className="text-xs text-[var(--muted)]">{list.length} Datei(en)</div>
            </div>

            {list.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-5 text-sm text-[var(--muted)]">
                Noch keine Dateien vorhanden.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {list.map((item) => {
                  const url = normalizeUploadedImageUrl(item.fileUrl) || item.fileUrl;
                  const isPdf = (item.mimeType || "").toLowerCase().includes("pdf") || url.toLowerCase().endsWith(".pdf");
                  const isLogo = item.type === "LOGO";
                  return (
                    <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                      <div className="p-4 space-y-2">
                        <div className="tf-display text-base font-bold text-[var(--foreground)] line-clamp-2">{item.title}</div>
                        {item.description ? <div className="text-sm text-[var(--muted)] line-clamp-3">{item.description}</div> : null}
                        <div className="text-xs text-[var(--muted)]">
                          {item.mimeType}
                          {item.sizeBytes ? ` • ${formatBytes(item.sizeBytes)}` : ""}
                        </div>
                      </div>

                      <div className="border-t border-[var(--border)] bg-[var(--surface-2)]">
                        {isPdf ? (
                          <div className="p-4 text-sm text-[var(--muted)]">PDF Vorschau nicht eingebettet – bitte herunterladen.</div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <div className="w-full bg-[var(--surface)] p-4 flex items-center justify-center">
                            <img
                              src={url}
                              alt={item.title}
                              className={isLogo ? "w-full h-auto max-h-48 object-contain" : "w-full h-auto max-h-[70vh] object-contain"}
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <a
                            href={url}
                            download
                            className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold hover:opacity-95 transition"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

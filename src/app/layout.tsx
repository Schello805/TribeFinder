import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import Navbar from "@/components/layout/Navbar";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import prisma from "@/lib/prisma";
import MatomoTracker from "@/components/analytics/MatomoTracker";
import ForceThemeStyles from "@/components/layout/ForceThemeStyles";
import Image from "next/image";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import { unstable_cache } from "next/cache";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import path from "path";
import fs from "node:fs";
import { readFile } from "fs/promises";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = (process.env.SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");

  let brandingLogoUrl = "";
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "BRANDING_LOGO_URL" },
      select: { value: true },
    });
    brandingLogoUrl = normalizeUploadedImageUrl(setting?.value) ?? "";
  } catch {
    brandingLogoUrl = "";
  }

  const appleIcon = brandingLogoUrl || undefined;
  const socialImageUrl = brandingLogoUrl || "/icons/icon.svg";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: "TribeFinder",
      template: "%s | TribeFinder",
    },
    description:
      "Finde Tanzgruppen, Workshops und News zu Tribal Style Dance und Bauchtanz auf Tribefinder.de. Deine Online-Plattform für den Austausch und die Vernetzung innerhalb der deutschsprachigen Tanzszene.",
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      type: "website",
      locale: "de_DE",
      url: baseUrl,
      siteName: "TribeFinder",
      title: "TribeFinder",
      description:
        "Finde Tanzgruppen, Workshops und News zu Tribal Style Dance und Bauchtanz auf Tribefinder.de. Deine Online-Plattform für den Austausch und die Vernetzung innerhalb der deutschsprachigen Tanzszene.",
      images: [{
        url: socialImageUrl,
      }],
    },
    twitter: {
      card: "summary",
      title: "TribeFinder",
      description:
        "Finde Tanzgruppen, Workshops und News zu Tribal Style Dance und Bauchtanz auf Tribefinder.de. Deine Online-Plattform für den Austausch und die Vernetzung innerhalb der deutschsprachigen Tanzszene.",
      images: [socialImageUrl],
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "TribeFinder",
    },
    icons: {
      icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
      apple: appleIcon ? [{ url: appleIcon }] : undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  const resolveProjectRoot = () => {
    let dir = process.cwd();
    for (let i = 0; i < 10; i++) {
      const hasPackageJson = fs.existsSync(path.join(dir, "package.json"));
      const hasPrismaSchema = fs.existsSync(path.join(dir, "prisma", "schema.prisma"));
      if (hasPackageJson && hasPrismaSchema) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  };

  const readAppVersionFallback = async () => {
    try {
      const pkgPath = path.join(resolveProjectRoot(), "package.json");
      const raw = await readFile(pkgPath, "utf8");
      const pkg = JSON.parse(raw) as { version?: unknown };
      return typeof pkg.version === "string" ? pkg.version.trim() : "";
    } catch {
      return "";
    }
  };

  const getCachedSystemConfig = unstable_cache(
    async () => {
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              "MATOMO_URL",
              "MATOMO_SITE_ID",
              "MATOMO_TRACKING_CODE",
              "BRANDING_LOGO_URL",
              "SITE_BANNER_ENABLED",
              "SITE_BANNER_TEXT",
              "SITE_BANNER_BG",
              "SITE_BANNER_TEXT_COLOR",
            ],
          },
        },
      });

      return settings.reduce((acc: Record<string, string>, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
    },
    ["system-settings", "layout"],
    { revalidate: 10 }
  );

  const config = await getCachedSystemConfig();
  const brandingLogoUrl = normalizeUploadedImageUrl(config.BRANDING_LOGO_URL) ?? "";

  const appCommit = (process.env.NEXT_PUBLIC_APP_COMMIT || "").trim();
  const appVersion = ((process.env.NEXT_PUBLIC_APP_VERSION || "").trim() || (await readAppVersionFallback()));

  const siteBannerEnabled = String(config.SITE_BANNER_ENABLED || "").toLowerCase() === "true";
  const siteBannerText = (config.SITE_BANNER_TEXT || "").trim();
  const siteBannerBg = (config.SITE_BANNER_BG || "").trim() || "#f59e0b";
  const siteBannerTextColor = (config.SITE_BANNER_TEXT_COLOR || "").trim() || "#ffffff";

  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ForceThemeStyles />
          <AuthProvider>
            <ToastProvider>
              <ErrorBoundary>
                <MatomoTracker
                  url={config.MATOMO_URL}
                  siteId={config.MATOMO_SITE_ID}
                  trackingCode={config.MATOMO_TRACKING_CODE}
                />
                {siteBannerEnabled && siteBannerText ? (
                  <div
                    className="fixed top-0 left-0 w-full text-xs leading-none px-3 h-6 flex items-center justify-center z-50"
                    style={{ backgroundColor: siteBannerBg, color: siteBannerTextColor }}
                  >
                    <span className="truncate">{siteBannerText}</span>
                  </div>
                ) : null}
                <div className={siteBannerEnabled && siteBannerText ? "pt-6" : undefined}>
                  <Navbar />
                  <main className="flex-grow container mx-auto px-4 py-8">
                    {children}
                  </main>
                  <FeedbackWidget />
                </div>
              </ErrorBoundary>
            </ToastProvider>
            <footer className="bg-gray-900 border-t border-gray-800 py-10 text-center text-gray-400 text-sm mt-auto">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 mb-2">
                  {brandingLogoUrl ? (
                    <Image src={brandingLogoUrl} alt="TribeFinder" width={28} height={28} className="h-7 w-7 rounded" unoptimized />
                  ) : (
                    <span className="text-2xl">💃</span>
                  )}
                  <span className="text-lg font-bold text-white tracking-tight">TribeFinder</span>
                </div>
                <p>&copy; {new Date().getFullYear()} TribeFinder. Alle Rechte vorbehalten.</p>
                
                <div className="flex gap-4 text-xs text-gray-500">
                  <Link href="/impressum" className="hover:text-gray-300 transition-colors">Impressum</Link>
                  <Link href="/datenschutz" className="hover:text-gray-300 transition-colors">Datenschutz</Link>
                  <a href="https://github.com/Schello805/TribeFinder" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors flex items-center gap-1">
                    GitHub
                  </a>
                </div>

                <div className="w-full max-w-xs h-px bg-gray-800 my-2"></div>

                {appVersion || appCommit ? (
                  <div className="text-xs text-gray-600">
                    Version: {appVersion ? `v${appVersion}` : "(unbekannt)"}
                    {appCommit ? ` (${appCommit})` : ""}
                  </div>
                ) : null}

                {process.env.NODE_ENV !== "production" ? (
                  <div className="text-xs text-gray-600">
                    Status: {session ? 'Eingeloggt' : 'Gast'} | Rolle: {session?.user?.role || 'Keine'}
                  </div>
                ) : null}

                {session?.user?.role === 'ADMIN' && (
                  <Link href="/admin" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                    <span>🔧</span> Admin Bereich
                  </Link>
                )}
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

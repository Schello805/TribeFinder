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

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "TribeFinder",
  description: "Finde und verwalte deine Tanzgruppe",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TribeFinder",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  const getCachedSystemConfig = unstable_cache(
    async () => {
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: ["MATOMO_URL", "MATOMO_SITE_ID", "BRANDING_LOGO_URL"],
          },
        },
      });

      return settings.reduce((acc: Record<string, string>, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
    },
    ["system-settings", "layout"],
    { revalidate: 60 }
  );

  const config = await getCachedSystemConfig();

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
                <MatomoTracker url={config.MATOMO_URL} siteId={config.MATOMO_SITE_ID} />
                <Navbar />
                <main className="flex-grow container mx-auto px-4 py-8">
                  {children}
                </main>
                <FeedbackWidget />
              </ErrorBoundary>
            </ToastProvider>
            <footer className="bg-gray-900 border-t border-gray-800 py-10 text-center text-gray-400 text-sm mt-auto">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 mb-2">
                  {config.BRANDING_LOGO_URL ? (
                    <Image src={config.BRANDING_LOGO_URL} alt="TribeFinder" width={28} height={28} className="h-7 w-7 rounded" />
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

                {/* Debug Info */}
                <div className="text-xs text-gray-600">
                  Status: {session ? 'Eingeloggt' : 'Gast'} | Rolle: {session?.user?.role || 'Keine'}
                </div>

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

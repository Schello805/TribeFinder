import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Second Hand Börse",
  description:
    "Kaufen, verkaufen und suchen: Second Hand Börse für Kostüme, Accessoires und Tribal/Bauchtanz-Equipment. Lokal & deutschlandweit auf TribeFinder.",
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tänzerinnen finden",
  description:
    "Finde Tänzerinnen aus der Tribal Style Dance und Bauchtanz Szene. Entdecke Profile und Gruppen-Mitgliedschaften auf TribeFinder.",
};

export default function DancersLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tanzgruppen finden",
  description:
    "Finde Tribal Style Dance und Bauchtanz Gruppen in deiner Nähe. Entdecke Profile, Termine und Kontaktmöglichkeiten auf TribeFinder.",
};

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

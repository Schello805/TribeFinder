import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Entdecke Workshops, Partys und Trainings rund um Tribal Style Dance und Bauchtanz. Finde Events in deiner Nähe auf TribeFinder.",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

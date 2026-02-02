"use client";

import { useSession } from "next-auth/react";
import EventForm from "@/components/events/EventForm";
import Link from "next/link";

export default function CreateEventPage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="tf-display text-2xl font-bold mb-4 text-[var(--foreground)]">Anmeldung erforderlich</h1>
        <p className="mb-6 text-[var(--muted)]">Du musst eingeloggt sein, um ein Event zu erstellen.</p>
        <Link 
          href="/auth/signin?callbackUrl=/events/create" 
          className="inline-block px-6 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition"
        >
          Anmelden
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/events" className="text-[var(--link)] hover:underline mb-4 inline-block text-sm">
          &larr; Zurück zu Events
        </Link>
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Neues Event erstellen</h1>
        <p className="text-[var(--muted)] mt-2">
          Teile einen Workshop, ein offenes Training oder eine Show mit der Community.
        </p>
      </div>
      
      <EventForm groupId="" />
    </div>
  );
}

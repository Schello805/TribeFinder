"use client";

import { useSession } from "next-auth/react";
import EventForm from "@/components/events/EventForm";
import Link from "next/link";

export default function CreateEventPage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Anmeldung erforderlich</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">Du musst eingeloggt sein, um ein Event zu erstellen.</p>
        <Link 
          href="/auth/signin?callbackUrl=/events/create" 
          className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
        >
          Anmelden
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/events" className="text-indigo-600 dark:text-indigo-400 hover:underline mb-4 inline-block text-sm">
          &larr; Zurück zu Events
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Neues Event erstellen</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Teile einen Workshop, ein offenes Training oder eine Show mit der Community.
        </p>
      </div>
      
      <EventForm groupId="" />
    </div>
  );
}

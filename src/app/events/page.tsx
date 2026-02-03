"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ListSkeleton } from "@/components/ui/SkeletonLoader";

const TZ_EUROPE_BERLIN = "Europe/Berlin";

type Event = {
  id: string;
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  locationName: string | null;
  group: {
    id: string;
    name: string;
  };
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const formatBerlin = (value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("de-DE", { ...options, timeZone: TZ_EUROPE_BERLIN }).format(d);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append("upcoming", "true");

    try {
      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      // Support both old array format and new paginated format
      setEvents(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "WORKSHOP": return "Workshop";
      case "SOCIAL": return "Social / Party";
      case "OPEN_TRAINING": return "Offenes Training";
      default: return "Event";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "WORKSHOP":
        return "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]";
      case "SOCIAL":
        return "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]";
      case "OPEN_TRAINING":
        return "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]";
      default:
        return "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">📅 Event Kalender</h1>
          <p className="text-[var(--muted)] mt-2">Entdecke Workshops, Partys und Trainings in deiner Umgebung.</p>
        </div>
        
        <div className="flex gap-4">
          <Link
            href="/events/create"
            className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] font-medium rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition shadow-sm whitespace-nowrap"
          >
            + Event eintragen
          </Link>
        </div>
      </div>

      {loading ? (
        <ListSkeleton count={6} type="event" />
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface-2)] text-[var(--foreground)] rounded-lg border border-dashed border-[var(--border)]">
          <p className="text-[var(--muted)]">Aktuell keine Events gefunden.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-[var(--surface)] text-[var(--foreground)] rounded-lg shadow-sm border border-[var(--border)] p-6 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
              
              {/* Date Box */}
              <div className="flex-shrink-0 w-20 h-20 bg-[var(--surface-2)] rounded-lg flex flex-col items-center justify-center text-center border border-[var(--border)]">
                <span className="text-sm font-bold text-[var(--muted)] uppercase">
                  {formatBerlin(event.startDate, { month: "short" })}
                </span>
                <span className="tf-display text-2xl font-bold text-[var(--foreground)]">
                  {formatBerlin(event.startDate, { day: "2-digit" })}
                </span>
              </div>

              {/* Content */}
              <div className="flex-grow space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${getTypeColor(event.eventType)}`}>
                      {getTypeLabel(event.eventType)}
                    </span>
                    <h3 className="tf-display text-xl font-bold text-[var(--foreground)] hover:text-[var(--link)] transition-colors">
                      <Link href={`/events/${event.id}`}>{event.title}</Link>
                    </h3>
                  </div>
                </div>
                
                <p className="text-[var(--muted)] line-clamp-2">
                  {event.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-[var(--muted)] pt-2">
                  <span className="flex items-center gap-1">
                    🕒 {formatBerlin(event.startDate, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} Uhr
                  </span>
                  {event.locationName && (
                    <span className="flex items-center gap-1">
                      📍 {event.locationName}
                    </span>
                  )}
                  {event.group && (
                    <span className="flex items-center gap-1">
                      👥 <Link href={`/groups/${event.group.id}`} className="hover:underline">{event.group.name}</Link>
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-center md:justify-end">
                <Link 
                  href={`/events/${event.id}`}
                  className="w-full md:w-auto px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] rounded-md hover:bg-[var(--surface-hover)] transition-colors text-sm font-medium"
                >
                  Details
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

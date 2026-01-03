"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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
  const [filterType, setFilterType] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append("upcoming", "true");
    if (filterType) params.append("type", filterType);

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
  }, [filterType]);

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
      case "WORKSHOP": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "SOCIAL": return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
      case "OPEN_TRAINING": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📅 Event Kalender</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Entdecke Workshops, Partys und Trainings in deiner Umgebung.</p>
        </div>
        
        <div className="flex gap-4">
          <Link
            href="/events/create"
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition shadow-sm whitespace-nowrap"
          >
            + Event eintragen
          </Link>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="">Alle Events</option>
            <option value="WORKSHOP">Workshops</option>
            <option value="SOCIAL">Socials & Partys</option>
            <option value="OPEN_TRAINING">Offene Trainings</option>
            <option value="EVENT">Sonstige Events</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">Lade Events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-500">Aktuell keine Events gefunden.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
              
              {/* Date Box */}
              <div className="flex-shrink-0 w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex flex-col items-center justify-center text-center border border-indigo-100 dark:border-indigo-800/50">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  {format(new Date(event.startDate), "MMM", { locale: de })}
                </span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {format(new Date(event.startDate), "dd")}
                </span>
              </div>

              {/* Content */}
              <div className="flex-grow space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${getTypeColor(event.eventType)}`}>
                      {getTypeLabel(event.eventType)}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white hover:text-indigo-600 transition-colors">
                      <Link href={`/events/${event.id}`}>{event.title}</Link>
                    </h3>
                  </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                  {event.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-2">
                  <span className="flex items-center gap-1">
                    🕒 {format(new Date(event.startDate), "HH:mm")} Uhr
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
                  className="w-full md:w-auto px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
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

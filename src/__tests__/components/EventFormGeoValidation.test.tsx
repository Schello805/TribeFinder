import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import EventForm from "@/components/events/EventForm";

describe("EventForm geolocation validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks submit if address and coordinates do not match (Nürnberg vs Berlin)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("nominatim.openstreetmap.org/reverse")) {
        return new Response(
          JSON.stringify({ address: { postcode: "10115", city: "Berlin", country_code: "de" } }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.startsWith("/api/events")) {
        return new Response(JSON.stringify({ id: "e1" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const now = Date.now();
    render(
      <EventForm
        initialData={{
          id: "e1",
          title: "Test Event",
          description: "Beschreibung Beschreibung",
          eventType: "EVENT",
          startDate: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
          locationName: "Gemeinschaftshaus Langwasser",
          address: "Glogauer Str. 50, 90473 Nürnberg",
          lat: 52.52,
          lng: 13.405,
        }}
        isEditing={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Aktualisieren" }));

    await waitFor(() => {
      expect(screen.getByText(/Adresse\/Position stimmen nicht überein/i)).toBeInTheDocument();
    });

    const apiCalls = fetchMock.mock.calls.filter((c) => {
      const u = typeof c[0] === "string" ? c[0] : c[0]?.toString();
      return typeof u === "string" && u.startsWith("/api/events");
    });

    expect(apiCalls.length).toBe(0);
  });
});

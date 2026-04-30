import { describe, expect, test } from "vitest";
import { buildEventJsonLd } from "@/lib/seo/eventJsonLd";

describe("buildEventJsonLd", () => {
  test("includes performer", () => {
    const json = buildEventJsonLd({
      baseUrl: "https://tribefinder.de",
      pageUrl: "https://tribefinder.de/events/evt1",
      organizerName: "My Organizer",
      organizerUrl: "https://tribefinder.de/groups/g1",
      event: {
        title: "Test Event",
        description: "Beschreibung",
        startDate: new Date("2026-04-30T10:00:00.000Z"),
        endDate: null,
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
        locationName: "Venue",
        address: "Main Street 1, 10115 Berlin",
        country: "Deutschland",
        lat: 52.52,
        lng: 13.405,
        flyer1: null,
        flyer2: null,
        website: null,
        ticketLink: null,
        ticketPrice: null,
      },
    });

    const parsed = JSON.parse(json) as { performer?: unknown };
    expect(Array.isArray(parsed.performer)).toBe(true);
  });

  test("adds validFrom + priceCurrency to offers when ticketLink exists", () => {
    const json = buildEventJsonLd({
      baseUrl: "https://tribefinder.de",
      pageUrl: "https://tribefinder.de/events/evt2",
      organizerName: "My Organizer",
      event: {
        title: "Test Event",
        description: "Beschreibung",
        startDate: new Date("2026-04-30T10:00:00.000Z"),
        endDate: null,
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
        locationName: null,
        address: "Main Street 1, 10115 Berlin",
        country: "Deutschland",
        lat: 52.52,
        lng: 13.405,
        flyer1: null,
        flyer2: null,
        website: null,
        ticketLink: "https://tickets.example.com/event/1",
        ticketPrice: "10",
      },
    });

    const parsed = JSON.parse(json) as { offers?: unknown };
    expect(parsed.offers).toBeTruthy();

    const offer = parsed.offers as { validFrom?: unknown; priceCurrency?: unknown; price?: unknown; url?: unknown };
    expect(offer.url).toBe("https://tickets.example.com/event/1");
    expect(offer.validFrom).toBe("2026-04-01T10:00:00.000Z");
    expect(offer.priceCurrency).toBe("EUR");
    expect(offer.price).toBe("10");
  });
});


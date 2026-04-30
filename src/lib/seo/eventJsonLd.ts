import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

type BuildEventJsonLdInput = {
  baseUrl: string;
  pageUrl: string;
  organizerName: string;
  organizerUrl?: string;
  event: {
    title: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    locationName: string | null;
    address: string | null;
    country: string | null;
    lat: number;
    lng: number;
    flyer1: string | null;
    flyer2: string | null;
    website: string | null;
    ticketLink: string | null;
    ticketPrice: string | null;
    createdAt?: Date;
  };
};

export function buildEventJsonLd(input: BuildEventJsonLdInput) {
  const { baseUrl, pageUrl, organizerName, organizerUrl, event } = input;

  const flyerCandidates = [normalizeUploadedImageUrl(event.flyer1), normalizeUploadedImageUrl(event.flyer2)].filter(Boolean) as string[];
  const imageUrls = flyerCandidates.length
    ? flyerCandidates.map((u) => (/^https?:\/\//i.test(u) ? u : new URL(u, baseUrl).toString()))
    : [new URL("/opengraph-image", baseUrl).toString()];

  const ticketUrl = (event.ticketLink || "").trim();
  const rawPrice = (event.ticketPrice || "").trim();
  const priceMatch = rawPrice.match(/(\d+(?:[.,]\d+)?)/);
  const priceNumber = priceMatch ? Number(priceMatch[1].replace(",", ".")) : NaN;

  const offers = ticketUrl
    ? {
        "@type": "Offer",
        url: ticketUrl,
        validFrom: (event.createdAt instanceof Date ? event.createdAt : new Date()).toISOString(),
        availability: "https://schema.org/InStock",
        priceCurrency: "EUR",
        ...(Number.isFinite(priceNumber) ? { price: String(priceNumber) } : {}),
      }
    : undefined;

  const locationNameResolved = (event.locationName || "").trim() || (event.address || "").trim() || "Veranstaltungsort";
  const addressValue = (event.address || "").trim();
  const countryValue = (event.country || "").trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: (event.description || "").trim().slice(0, 2000),
    url: pageUrl,
    startDate: new Date(event.startDate).toISOString(),
    ...(event.endDate ? { endDate: new Date(event.endDate).toISOString() } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: imageUrls,
    location: {
      "@type": "Place",
      name: locationNameResolved,
      ...(addressValue || countryValue
        ? {
            address: {
              "@type": "PostalAddress",
              ...(addressValue ? { streetAddress: addressValue } : {}),
              ...(countryValue ? { addressCountry: countryValue } : {}),
            },
          }
        : {}),
      ...(Number.isFinite(event.lat) && Number.isFinite(event.lng)
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: event.lat,
              longitude: event.lng,
            },
          }
        : {}),
    },
    organizer: {
      "@type": "Organization",
      name: organizerName || "TribeFinder",
      ...(organizerUrl ? { url: organizerUrl } : {}),
    },
    performer: [
      {
        "@type": "Organization",
        name: organizerName || "TribeFinder",
        ...(organizerUrl ? { url: organizerUrl } : {}),
      },
    ],
    ...(offers ? { offers } : {}),
  };

  return JSON.stringify(jsonLd);
}


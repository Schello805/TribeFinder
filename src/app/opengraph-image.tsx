import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b1220 0%, #1f2937 50%, #0b1220 100%)",
          color: "white",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}
          >
            💃
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>TribeFinder</div>
            <div style={{ fontSize: 22, opacity: 0.85 }}>Tanzgruppen · Workshops · Events</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05 }}>
            Finde deine Community.
          </div>
          <div style={{ fontSize: 26, opacity: 0.9, maxWidth: 900, lineHeight: 1.25 }}>
            Entdecke Gruppen und Events rund um Tribal Style Dance und Bauchtanz – in deiner Nähe.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 20, opacity: 0.8 }}>
          <div>tribefinder.de</div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.10)" }}>
              Gruppen
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.10)" }}>
              Events
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.10)" }}>
              Karte
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}


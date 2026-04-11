import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BLACK SHEEP — The Place To Be";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        color: "#FFFFF3",
        fontFamily: "Arial Black, Arial, sans-serif",
      }}
    >
      <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: "0.1em" }}>BLACK SHEEP</div>
      <div
        style={{
          fontSize: 20,
          letterSpacing: "0.4em",
          opacity: 0.6,
          marginTop: 16,
        }}
      >
        THE PLACE TO BE
      </div>
      <div
        style={{
          fontSize: 14,
          letterSpacing: "0.2em",
          opacity: 0.4,
          marginTop: 40,
        }}
      >
        OGNI LUNEDI — 11 CLUBROOM — CORSO COMO — MILANO
      </div>
    </div>,
    { ...size },
  );
}

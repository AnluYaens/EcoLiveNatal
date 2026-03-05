import { ImageResponse } from "next/og";

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#1B3A5C",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "7px",
      }}
    >
      <span
        style={{
          color: "#FAFAF8",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: -0.5,
          lineHeight: 1,
        }}
      >
        ELN
      </span>
      <span
        style={{ color: "#E8A0A0", fontSize: 8, lineHeight: 1, marginTop: 1 }}
      >
        ♥
      </span>
    </div>,
    { ...size },
  );
}

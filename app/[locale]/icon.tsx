import { ImageResponse } from "next/og";

export const runtime = 'edge';
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#1B3A5C",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
      }}
    >
      <span
        style={{
          color: "#FAFAF8",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: -1,
          lineHeight: 1,
        }}
      >
        ELN
      </span>
    </div>,
    { ...size },
  );
}

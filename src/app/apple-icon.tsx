import { ImageResponse } from "next/og";
import { markDataUri } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone da tela inicial (iOS): símbolo sobre fundo claro da marca. */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFF" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={markDataUri()} width={132} height={132} alt="" />
    </div>,
    size,
  );
}

import { ImageResponse } from "next/og";
import { markDataUri } from "@/lib/brand-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon gerado a partir do símbolo da marca (substitui o ícone padrão do Next.js). */
export default function Icon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={markDataUri()} width={32} height={32} alt="" />,
    size,
  );
}

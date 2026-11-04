import { ImageResponse } from "next/og";
import { markDataUri } from "@/lib/brand-mark";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem de compartilhamento (Open Graph / redes sociais). Só texto e marca: nada de prints inventados. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#F8FAFF", color: "#192447", padding: "72px 80px", position: "relative" }}>
      <div style={{ position: "absolute", right: -120, top: -80, width: 520, height: 520, borderRadius: 9999, background: "#FDEEF5", display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 760, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markDataUri()} width={72} height={72} alt="" />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
            CENA<span style={{ color: "#3158DC", marginLeft: 10 }}>LAB</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.06, letterSpacing: -2 }}>Crie suas próprias historinhas animadas com Claude.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#56617C", lineHeight: 1.35 }}>
            Você escreve a ideia. O CENA LAB monta as instruções. O Claude cria a animação.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 24, color: "#3158DC" }}>
          <span style={{ display: "flex", padding: "8px 18px", borderRadius: 999, background: "#EDF2FF" }}>Final A/B</span>
          <span style={{ display: "flex", padding: "8px 18px", borderRadius: 999, background: "#EDF2FF" }}>Séries</span>
          <span style={{ display: "flex", padding: "8px 18px", borderRadius: 999, background: "#EDF2FF" }}>Cartoon 2D · Stickman</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri()} width={300} height={300} alt="" />
      </div>
    </div>,
    size,
  );
}

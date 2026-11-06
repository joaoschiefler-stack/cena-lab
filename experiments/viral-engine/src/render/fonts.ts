import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/** Fontes empacotadas (SIL OFL 1.1, licenças em public/fonts). Nada é baixado no render. */
export const FONT_DISPLAY = "Anton";
export const FONT_BODY = "Nunito";

let loaded: Promise<unknown> | null = null;

export function loadFonts() {
  loaded ??= Promise.all([
    loadFont({ family: FONT_DISPLAY, url: staticFile("fonts/anton-latin-400-normal.woff2"), weight: "400" }),
    loadFont({ family: FONT_DISPLAY, url: staticFile("fonts/anton-latin-ext-400-normal.woff2"), weight: "400", unicodeRange: "U+0100-024F, U+1E00-1EFF" }),
    loadFont({ family: FONT_BODY, url: staticFile("fonts/nunito-latin-800-normal.woff2"), weight: "800" }),
    loadFont({ family: FONT_BODY, url: staticFile("fonts/nunito-latin-900-normal.woff2"), weight: "900" }),
  ]);
  return loaded;
}

/**
 * Símbolo do CENA LAB: três quadros em leque (uma sequência de cenas, como um
 * flipbook) e, no quadro da frente, o "play" — a história virando animação.
 *
 * Fonte única da geometria: usada no logo do site, no favicon, no ícone da
 * tela inicial (apple-icon) e na imagem de compartilhamento.
 */
export const MARK_VIEWBOX = "0 0 32 32";

export const MARK_INNER = [
  '<rect x="3.5" y="7" width="13" height="19" rx="3" fill="#F5A7CA" transform="rotate(-12 10 16.5)"/>',
  '<rect x="8" y="5.5" width="13" height="20" rx="3" fill="#A9BCF5" transform="rotate(-4 14.5 15.5)"/>',
  '<rect x="13" y="4.5" width="14.5" height="23" rx="3.5" fill="#3158DC"/>',
  '<path d="M18.1 11.9v8.2a.9.9 0 0 0 1.37.77l6.45-4.1a.9.9 0 0 0 0-1.53l-6.45-4.1a.9.9 0 0 0-1.37.76z" fill="#FFFFFF"/>',
].join("");

/** SVG completo como data URI (para next/og, que não usa componentes do site). */
export function markDataUri(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}">${MARK_INNER}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

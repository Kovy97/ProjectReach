// claude:2026-10-24T09:00:00+02:00 — Trailer-Bühne: Spiel-Assets kommen über publicDir (= src/renderer/assets) direkt aus dem Client.
export const asset = (p: string): string => `/${p}`;

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

declare const __CINZEL_URL__: string;
export async function loadFonts(): Promise<void> {
  const face = new FontFace("Cinzel", `url("${__CINZEL_URL__}")`);
  await face.load();
  document.fonts.add(face);
}

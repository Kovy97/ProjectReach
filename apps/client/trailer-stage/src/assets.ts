// claude:2026-10-24T09:00:00+02:00 — Trailer-Bühne: Spiel-Assets kommen über publicDir (= src/renderer/assets) direkt aus dem Client.
export const asset = (p: string): string => `/${p}`;

// claude:2026-10-24T11:53:00+02:00 — Chrome lehnt decode() bei vielen gleichzeitigen großen Bildern gelegentlich ab: kurz warten und erneut
export async function loadImage(url: string, tries = 5): Promise<HTMLImageElement> {
  for (let k = 0; ; k++) {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
      return img;
    } catch (e) {
      if (k >= tries - 1) throw new Error(`Bild nicht ladbar: ${url} (${String(e)})`);
      await new Promise((r) => setTimeout(r, 80 * (k + 1)));
    }
  }
}

declare const __CINZEL_URL__: string;
declare const __NOTO_SC_URL__: string;
export async function loadFonts(): Promise<void> {
  const face = new FontFace("Cinzel", `url("${__CINZEL_URL__}")`);
  await face.load();
  document.fonts.add(face);
  // claude:2026-10-24T20:16:00+02:00 — chinesische Fassung v4: Noto Serif SC (OFL), auf die Zeichen des Trailers verkleinert (trailer-stage/fonts)
  const zh = new FontFace("Noto Serif SC Trailer", `url("${__NOTO_SC_URL__}")`, { weight: "200 900" });
  await zh.load();
  document.fonts.add(zh);
}

/**
 * Eigenes Charakter-Porträt hochladen (Chef 2026-07-11): verkleinert ein vom Spieler gewähltes
 * Bild clientseitig auf max. 640px Kante und liefert es als WebP-Data-URL (~60–150 KB). Die
 * Data-URL wird direkt in `character.portrait` gespeichert — sie lebt damit IM Save (kein
 * separater Datei-Pfad, der bei Steam-Cloud-Sync auf einem anderen Rechner fehlen würde) und
 * `getPortrait()` reicht sie unverändert als <img src> durch.
 *
 * Die Dateiauswahl selbst läuft über ein verstecktes React-<input type="file"> an den beiden
 * Aufruf-Stellen (CharacterPage/CharacterCreation) — ein dynamisch erzeugtes Input hatte ein
 * cancel/change-Race und ist schlechter testbar.
 */

/** Längste Kante des gespeicherten Porträts — genug für die 444px-Anzeige, klein genug fürs Save. */
const MAX_EDGE = 640;

/** Gewählte Bilddatei → verkleinerte WebP-Data-URL, oder null bei unlesbarer Datei. */
export function processPortraitFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    // FileReader→Data-URL statt URL.createObjectURL: unsere CSP erlaubt `img-src 'self' data:`,
    // aber KEIN blob: — eine blob-URL würde beim Laden ins <img> geblockt.
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/webp", 0.85));
        } catch {
          resolve(null); // z. B. SecurityError — dann bleibt das bisherige Porträt einfach stehen
        }
      };
      img.onerror = () => resolve(null);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

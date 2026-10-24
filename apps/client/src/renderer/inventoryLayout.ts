/**
 * claude:2026-10-24T19:57:00+02:00 — Raster des Inventars: welche Zelle an welcher Fachposition steht.
 *
 * Spieler-Bugreport 24.10.2026: „ein paar Items lassen sich nicht richtig ziehen, Drag & Drop wirft das Inventar
 * durcheinander“. Reine Varianten (verzaubert/Suffix ohne Grundstapel) haben kein eigenes Fach; sie standen als
 * Zusatzzellen hinter dem letzten belegten Fach, und dafür fielen gleich viele Leerfächer weg. Alles hinter einer
 * Lücke rutschte optisch nach vorne, und die Variantenzellen waren kein Ablageziel.
 *
 * Jetzt belegt jede Variantengruppe ein echtes freies Fach: die ersten freien HINTER dem letzten belegten Fach
 * (Chef-Regel 06.07.: Varianten direkt hinter den Items, vor den Leerfächern), reicht das nicht, die letzten freien
 * davor. So steht jede Zelle an ihrer echten Position. Nur wenn mehr Gruppen als freie Fächer da sind (übervolles
 * Inventar), stehen die übrigen fachlos hinten.
 */
export interface InventarRaster<G> {
  /** Fachindex -> Variantengruppe, die in diesem (leeren) Fach angezeigt wird. */
  variantenImFach: Map<number, G>;
  /** Gruppen ohne freies Fach (übervoll), hinten angehängt. */
  variantenFachlos: G[];
  /** Leere Fächer, die als Leerzelle sichtbar sind (höchstens so viele, wie Kapazitätseinheiten frei sind). */
  leereSichtbar: Set<number>;
}

export function inventarRaster<G>(
  slots: ReadonlyArray<unknown>,
  varianten: readonly G[],
  freieEinheiten: number,
): InventarRaster<G> {
  const frei: number[] = [];
  let letztesBelegt = -1;
  slots.forEach((sl, i) => {
    if (sl === null || sl === undefined) frei.push(i);
    else letztesBelegt = i;
  });
  const dahinter = frei.filter((i) => i > letztesBelegt);
  const fehlen = Math.max(0, varianten.length - dahinter.length);
  const davor = fehlen > 0 ? frei.filter((i) => i < letztesBelegt).slice(-fehlen) : [];
  const plaetze = [...davor, ...dahinter];

  const variantenImFach = new Map<number, G>();
  const variantenFachlos: G[] = [];
  varianten.forEach((grp, k) => {
    const fach = plaetze[k];
    if (fach === undefined) variantenFachlos.push(grp);
    else variantenImFach.set(fach, grp);
  });

  const leereSichtbar = new Set<number>();
  for (const idx of frei) {
    if (!variantenImFach.has(idx) && leereSichtbar.size < freieEinheiten) leereSichtbar.add(idx);
  }
  return { variantenImFach, variantenFachlos, leereSichtbar };
}

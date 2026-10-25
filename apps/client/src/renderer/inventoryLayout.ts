/**
 * claude:2026-10-24T19:57:00+02:00 — Raster des Inventars: welche Zelle an welcher Fachposition steht.
 *
 * Spieler-Bugreport 24.10.2026: „ein paar Items lassen sich nicht richtig ziehen, Drag & Drop wirft das Inventar
 * durcheinander“. Reine Varianten (verzaubert/Suffix ohne Grundstapel) hatten kein eigenes Fach; sie standen als
 * Zusatzzellen hinter dem letzten belegten Fach, und dafür fielen gleich viele Leerfächer weg.
 *
 * claude:2026-10-25T18:03:00+01:00 — Chef-Report 25.10.2026 („Items verschieben sich nach Restart von selbst. Habe vom letzten
 * Slot ein Item weggezogen, dann ist ein anderes Item hineingesprungen, was nicht mehr draggable ist.“): die Lage der
 * Variantenzellen wurde hier bei jedem Rendern neu berechnet (hinter dem letzten belegten Fach) und sprang darum bei jeder
 * Belegungsänderung. Seit SAVE 98 hat jede reine Variantengruppe ein GESPEICHERTES Fach (`inventory.variantCells`, gepflegt von
 * engine `syncVariantCells`); dieses Raster liest es nur noch. Gruppen ohne gültiges Fach (übervolles Inventar oder der kurze
 * Moment bis zum nächsten Tick) stehen fachlos hinten. Die alte Berechnung lebt als `legacyVariantCellLayout` in der Engine und
 * dient nur noch der Migration < 98.
 */
export interface InventarRaster<G> {
  /** Fachindex -> Variantengruppe, die in diesem (leeren) Fach angezeigt wird. */
  variantenImFach: Map<number, G>;
  /** Gruppen ohne gültiges Fach (übervoll), hinten angehängt. */
  variantenFachlos: G[];
  /** Leere Fächer, die als Leerzelle sichtbar sind (höchstens so viele, wie Kapazitätseinheiten frei sind). */
  leereSichtbar: Set<number>;
}

/**
 * @param slots       die echten Fächer (`inventory.slots`)
 * @param varianten   reine Variantengruppen in Anzeige-Reihenfolge
 * @param fachVon     gespeichertes Fach einer Gruppe (`inventory.variantCells[basis]`), `undefined` = keins
 * @param freieEinheiten freie Kapazitätseinheiten (Kapazität minus `usedCapacityUnits`)
 */
export function inventarRaster<G>(
  slots: ReadonlyArray<unknown>,
  varianten: readonly G[],
  fachVon: (grp: G) => number | undefined,
  freieEinheiten: number,
): InventarRaster<G> {
  const variantenImFach = new Map<number, G>();
  const variantenFachlos: G[] = [];
  for (const grp of varianten) {
    const fach = fachVon(grp);
    const gueltig =
      typeof fach === "number" &&
      Number.isInteger(fach) &&
      fach >= 0 &&
      fach < slots.length &&
      (slots[fach] === null || slots[fach] === undefined) &&
      !variantenImFach.has(fach);
    if (gueltig) variantenImFach.set(fach, grp);
    else variantenFachlos.push(grp);
  }

  const leereSichtbar = new Set<number>();
  for (let idx = 0; idx < slots.length; idx++) {
    const leer = slots[idx] === null || slots[idx] === undefined;
    if (leer && !variantenImFach.has(idx) && leereSichtbar.size < freieEinheiten) leereSichtbar.add(idx);
  }
  return { variantenImFach, variantenFachlos, leereSichtbar };
}

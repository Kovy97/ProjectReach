import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { monsterResists } from "./combat";

/**
 * Spieler-Report 31.08.2026: „For characters that ignore status effects, Shock works, but Ice and
 * Poison don't. Is that how it's supposed to be?"
 *
 * Nein. Zwei Fehler lagen uebereinander:
 *  1. Der Schock-Bogen (Ueberspringen bei einem Krit) zieht dem Gegner DIREKT Leben ab und fragte
 *     nur, ob die Waffe Schock traegt — nie, ob das Ziel immun ist. Jede andere Elementar-Wirkung
 *     laeuft ueber `applyEnemyStatus` und damit durch `monsterResists`.
 *  2. Die Resist-Liste des Abgrundverschlingers meint „ignoriert Statuseffekte", wurde aber vor
 *     `shock` und `void` geschrieben und wuchs nicht mit.
 */

describe("Status-Immunitaet gilt fuer ALLE Elemente", () => {
  it("wer alle alten Status ignoriert, ignoriert auch die neuen (shock, void)", () => {
    const alt = ["burn", "frost", "poison", "bleed"] as const;
    const neu = ["shock", "void"] as const;
    const luecken: string[] = [];
    for (const m of Object.values(content.monsters)) {
      const liste = (m as { resist?: string[] }).resist ?? [];
      // Nur die Kreaturen betrachten, deren Liste erkennbar „alles" meint.
      if (!alt.every((s) => liste.includes(s))) continue;
      for (const s of neu) if (!liste.includes(s)) luecken.push(`${m.id} fehlt ${s}`);
    }
    expect(luecken).toEqual([]);
  });

  it("der Abgrundverschlinger ignoriert jeden Statuseffekt, den es gibt", () => {
    const m = content.monsters.abyssal_devourer;
    expect(m).toBeDefined();
    for (const s of ["burn", "frost", "shock", "poison", "bleed", "void"] as const) {
      expect(monsterResists(m!, s), s).toBe(true);
    }
  });
});

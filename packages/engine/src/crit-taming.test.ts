import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ItemDef, ItemInstance } from "@hearthforge/shared";
import {
  CRIT_CHANCE_ATTR_K,
  CRIT_CHANCE_ATTR_MAX,
  CRIT_CHANCE_CAP,
  CRIT_DAMAGE_CAP,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { xpForLevel } from "./leveling";

/**
 * Crit-Zähmung (design/crit-taming-spec.md §3/§5.3, Task #294) — Cap-Guards.
 *
 * Vorher one-hittete ein BiS-Endgame-Char Idol-Hall-Bosse (90 % Chance / 533 % Schaden =
 * ×4.9 eff. DPS). Diese Guards frieren die zwei Deckel und die Sättigungs-Eigenschaft der
 * Attribut-Kurve ein: Attribute allein erreichen den Chance-Cap NIE (Asymptote 45 % < 50 %),
 * und auch der maximal stapelbare Voll-Ausbau (BiS-Gear + Executioner/Phantom-Suffixe +
 * Slayer's War Brew) kommt exakt an, aber nie über die Caps.
 */
describe("Crit-Zähmung #294: Caps & Sättigungskurve", () => {
  // ── Harness-Bausteine (analog scratchpad/crit-audit.mts der Spec) ─────────
  function maxedChar() {
    const s = createGame({ name: "QA" }, content, 42);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    return s;
  }

  /** BiS-Krit-Kit per Content-Scan (kein hartes Id-Pinning außer der godly 2H-Waffe). */
  function critScore(it: ItemDef): number {
    const m = it.modifiers ?? {};
    return (m.dex ?? 0) * 0.4 + (m.lck ?? 0) * 0.6;
  }
  function buildFullStack() {
    const s = maxedChar();
    const bySlot: Record<string, ItemDef[]> = {};
    for (const it of Object.values(content.items)) {
      if (it.type !== "equipment" || !it.slot) continue;
      const reqOk = Object.values(it.requirements ?? {}).every((v) => Number(v) <= 99);
      if (!reqOk) continue;
      (bySlot[it.slot] ??= []).push(it);
    }
    const pick = (slot: string) =>
      [...(bySlot[slot] ?? [])].sort((a, b) => critScore(b) - critScore(a))[0]?.id ?? null;

    const kit: Record<string, string | null> = { mainhand: "last_judgement", offhand: null };
    for (const slot of ["helmet", "amulet", "body", "legs", "gloves", "boots", "cape"]) {
      kit[slot] = pick(slot);
    }
    const rings = [...(bySlot["ring"] ?? [])].sort((a, b) => critScore(b) - critScore(a));
    kit.ring1 = rings[0]?.id ?? null;
    kit.ring2 = rings[1]?.id ?? null;
    for (const [slot, id] of Object.entries(kit)) {
      if (id) (s.character.equipment as Record<string, string>)[slot] = id;
    }

    // Suffix-Voll-Stack: Waffe „of the Executioner" (+cc/+cd), 5 Rüstungsteile „of the Phantom"
    // (+cc, +dex) — max-roll ilvl 100. Guard: die Suffixe müssen im Content existieren, sonst
    // prüft der Test stillschweigend NICHT mehr den Voll-Stack, den er behauptet.
    expect(content.suffixes?.["suffix_executioner"], "suffix_executioner existiert").toBeTruthy();
    expect(content.suffixes?.["suffix_phantom"], "suffix_phantom existiert").toBeTruthy();
    const inst = (slot: string, base: string, suffixId: string): ItemInstance => ({
      instanceId: `t294-${slot}`,
      baseItemId: base,
      affixes: [],
      suffix: { suffixId, ilvl: 100, roll: 1 },
    });
    const eqi: NonNullable<typeof s.character.equippedInstances> = {};
    eqi.mainhand = inst("mainhand", "last_judgement", "suffix_executioner");
    for (const slot of ["helmet", "body", "legs", "gloves", "boots"]) {
      if (kit[slot]) eqi[slot as keyof typeof eqi] = inst(slot, kit[slot]!, "suffix_phantom");
    }
    s.character.equippedInstances = eqi;

    // Stärkstes Krit-Konsumable obendrauf (Guard: Buff trägt wirklich beide Krit-Zeilen).
    const brew = content.items["slayer_war_brew"]?.buff;
    expect(brew?.bonus?.critChance, "slayer_war_brew buffet critChance").toBeTruthy();
    expect(brew?.bonus?.critDamage, "slayer_war_brew buffet critDamage").toBeTruthy();
    s.character.buffs.push({ itemId: "slayer_war_brew", remainingMs: 3_600_000 });
    return s;
  }

  it("Attribut-Krit SATURIERT unter dem Cap: S=1000 ⇒ critChance < 0.45 (Asymptote unerreichbar)", () => {
    // Extremwert weit jenseits jeder erreichbaren Attribut-Summe (BiS-Endgame: S≈73). Die alte
    // lineare Formel (S/100, Cap 0.9) stünde hier bei 90 % — die Sättigungskurve bleibt unter
    // ihrer eigenen 45-%-Asymptote und damit STRIKT unter dem 50-%-Cap: Attribute allein können
    // den Deckel nie kaufen, die letzten ~25 pp gehören Gear/Suffixen/Tonika.
    const s = createGame({ name: "QA", baseAttributes: { dex: 1000, lck: 1000 } }, content, 1);
    const st = computeStats(s, content);
    const S = st.attributes.dex * 0.4 + st.attributes.lck * 0.6;
    expect(S).toBeGreaterThanOrEqual(1000);
    expect(st.critChance).toBeLessThan(CRIT_CHANCE_ATTR_MAX);
    // Exakte Kurvenlage (kein stilles Umtunen): 0.45·S/(S+75), ± Fließkomma.
    expect(st.critChance).toBeCloseTo((CRIT_CHANCE_ATTR_MAX * S) / (S + CRIT_CHANCE_ATTR_K), 10);
  });

  it("critDamage-Cap hält: lck 200 + Slayer's War Brew ⇒ exakt 2.5 (vorher wäre es 3.83)", () => {
    const s = createGame({ name: "QA", baseAttributes: { lck: 200 } }, content, 1);
    s.character.buffs.push({ itemId: "slayer_war_brew", remainingMs: 3_600_000 });
    const st = computeStats(s, content);
    // Ungedeckelt: 1.5 + ~203·0.01 + 0.3 ≈ 3.83 — der Clamp MUSS greifen.
    expect(st.critDamage).toBe(CRIT_DAMAGE_CAP);
  });

  it("Voll-Stack (BiS-Gear + Suffixe + Brew): critChance kommt exakt an den 50-%-Cap, nie darüber", () => {
    const st = computeStats(buildFullStack(), content);
    // Ungedeckelte Summe läge weit drüber (attr ~23 pp + Suffixe 30 pp + Brew 20 pp) —
    // der Cap ist erreichbar (by design, §3.3) und exakt bindend.
    expect(st.critChance).toBe(CRIT_CHANCE_CAP);
  });

  it("Voll-Stack (BiS-Gear + Suffixe + Brew): critDamage kommt exakt an den 250-%-Cap, nie darüber", () => {
    const st = computeStats(buildFullStack(), content);
    // Ungedeckelt: 1.5 + lck~82·0.01 + Executioner 0.25 + Brew 0.30 ≈ 2.87 — Clamp bindet.
    expect(st.critDamage).toBe(CRIT_DAMAGE_CAP);
  });
});

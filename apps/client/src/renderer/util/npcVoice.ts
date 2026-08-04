import { content } from "@hearthforge/content";
import { blessingForTime } from "@hearthforge/engine";
import type { BlessingId, GameState, LocalizedString } from "@hearthforge/shared";
import { DEATH_ESCALATION_MANY } from "../components/DeathPopup";
import { hasFreshTracks } from "./eliteBoard";

/**
 * Persönlichkeits-Paket „Das Reach führt Buch" §C (design/lore/waechter-stimme-pack.md, v2):
 * bedingte NPC-Weltkommentare für die vier bestehenden Begrüßungen (Bank/Shop/Slayer/Quests),
 * die die normale greet1–3-Rotation ersetzen, wenn eine Bedingung greift. Priorität bei
 * Mehrfach-Treffern (§D.4, Chef-Empfehlung übernommen): Elite > Spielerzustand > Segen.
 *
 * Die zwei „Kapitel frisch abgeschlossen"-Zeilen des Pakets (`npc.shop.chapter`/
 * `npc.quests.chapter`) sind HIER bewusst NICHT verdrahtet — es gibt kein sauberes vorhandenes
 * Signal für „gerade eben abgeschlossen" (QuestsPage kennt nur den STATISCHEN Claimed-Zähler,
 * kein Event/Breadcrumb; ein neuer Engine-State dafür ist außerhalb dieses Auftrags, s.
 * Aufgabenstellung „KEIN neuer Engine-State von dir"). Wird nachgereicht, sobald ein Breadcrumb
 * existiert (z.B. nach dem Muster `lastParagonChest`/`lastEliteSpawn`).
 */
export type NpcVoiceId = "bank" | "shop" | "slayer" | "quests";

/** Welche Segen-IDs welcher NPC kommentiert + der jeweilige Übersetzungs-Key (§C.1–§C.4). */
const BLESSING_KEY_BY_NPC: Record<NpcVoiceId, Partial<Record<BlessingId, string>>> = {
  bank: { silence: "npc.bank.blessing.silence", greed: "npc.bank.blessing.greed" },
  shop: { rotmist: "npc.shop.blessing.rotmist", greed: "npc.shop.blessing.greed" },
  slayer: { bloodmoon: "npc.slayer.blessing.bloodmoon", wildhunt: "npc.slayer.blessing.wildhunt" },
  quests: { ashenstorm: "npc.quests.blessing.ashenstorm", mistvigil: "npc.quests.blessing.mistvigil" },
};

/** Elite-Zeile je NPC (alle vier haben eine, §C.1–§C.4). */
const ELITE_KEY_BY_NPC: Record<NpcVoiceId, string> = {
  bank: "npc.bank.elite",
  shop: "npc.shop.elite",
  slayer: "npc.slayer.elite",
  quests: "npc.quests.elite",
};

/** „hohe Gesamt-Todeszahl"-Zeile — NUR Bank/Slayer/Quests (der Händler hat im Paket keine
 *  eigene, s. §C.2: seine vierte Zeile ist die geparkte `chapter`-Zeile). */
const DEATHS_KEY_BY_NPC: Partial<Record<NpcVoiceId, string>> = {
  bank: "npc.bank.deaths",
  slayer: "npc.slayer.deaths",
  quests: "npc.quests.deaths",
};

/** Irgendeine Zone gerade mit aktivem Elite (`state.eliteZones[id]` im „Aktiv"-Zustand)? Liefert
 *  deren lokalisierten Zonen-Namen für `{zone}` — deterministisch die erste in `content.zones`-
 *  Reihenfolge, falls (selten) mehrere Zonen gleichzeitig aktiv sind. */
export function activeEliteZoneName(state: GameState, tr: (v: LocalizedString) => string): string | null {
  const zones = state.eliteZones ?? {};
  for (const zone of content.zones) {
    const entry = zones[zone.id];
    if (entry && "variantId" in entry) return tr(zone.name);
  }
  return null;
}

/** Löst den Vorrangs-Key für einen NPC auf (oder `null`, wenn keine Bedingung greift — dann läuft
 *  die normale greet1–3-Rotation weiter). Reine State-Lese-Funktion, kein Seiteneffekt. */
export function resolveNpcVoiceKey(npc: NpcVoiceId, state: GameState): string | null {
  // 1) Elite — sticht alles (§D.4).
  const hasEliteActive = Object.values(state.eliteZones ?? {}).some((e) => "variantId" in e);
  if (hasEliteActive) return ELITE_KEY_BY_NPC[npc];

  // 1.5) Spuren (nur Brenna, § E v1 waechter-stimme-pack.md): "Priorität unter npc.slayer.elite"
  //      laut Paket — ein Weltereignis wie Elite (kein Spieler- oder Kalenderzustand), deshalb
  //      hier VOR Spielerzustand/Segen eingeordnet. Teilt sich die Ableitung mit dem Kopfgeld-
  //      Brett-Badge (util/eliteBoard.ts `hasFreshTracks`, dieselbe Quelle, kein zweites Signal).
  if (npc === "slayer" && Object.values(state.eliteZones ?? {}).some((e) => hasFreshTracks(e))) {
    return "npc.slayer.tracks";
  }

  // 2) Spielerzustand — hohe Todeszahl vor Slayer-Serie (ein ernstes Signal vor einer kleinen
  //    Prahlerei); Todes-Schwelle identisch zur Todes-Chronik (§B, DEATH_ESCALATION_MANY).
  //    Streak-Schwelle "> 0" matcht die bestehende Serien-Chip-Anzeige auf SlayerPage.tsx
  //    (`state.slayerStreak > 0` — s. dort), keine zweite, abweichende Schwelle erfinden.
  const deathsKey = DEATHS_KEY_BY_NPC[npc];
  if (deathsKey && state.stats.deaths >= DEATH_ESCALATION_MANY) return deathsKey;
  if (npc === "slayer" && state.slayerStreak > 0) return "npc.slayer.streak";

  // 3) Segen — der heute aktive Wochentags-Segen, falls dieser NPC dafür eine Zeile hat.
  const blessingId = blessingForTime(Date.now()).id;
  return BLESSING_KEY_BY_NPC[npc][blessingId] ?? null;
}

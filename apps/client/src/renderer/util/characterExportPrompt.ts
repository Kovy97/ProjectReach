import {
  EQUIP_SLOTS,
  EQUIP_SLOT_LABELS,
  RARITY_LABEL,
  getItemRarity,
  resolveText,
  type ContentDB,
  type EquipSlot,
  type ItemId,
  type WeaponStyle,
} from "@hearthforge/shared";

/**
 * Prompt-Extractor (Chef-Auftrag 28.08.2026, design/prompt-extractor.md): baut den fertigen
 * englischen Bildgenerator-Prompt für den aktuellen Charakter. REINE Funktion — keine DOM-/
 * Canvas-/IPC-Abhängigkeit, direkt unit-testbar (s. characterExportPrompt.test.ts).
 *
 * Bewusst NICHT die volle `GameState` als Eingabe: nur die paar Felder, die der Prompt wirklich
 * braucht — CharacterPage.tsx reicht sie aus `state.character`/`computeStats` durch, der Unit-Test
 * baut sich ein schlankes Fixture-Objekt ohne einen kompletten Spielstand konstruieren zu müssen.
 *
 * Der Prompt bleibt IMMER Englisch, unabhängig von der aktiven UI-Sprache — Item-/Rarity-/Slot-
 * Texte werden daher über `resolveText(value, "en")` aufgelöst, NICHT über `tr()` (das würde der
 * aktuellen Spielsprache folgen). `character.race`/`gender` existieren im Datenmodell nicht (nur
 * Tavern-NPCs haben `race`, s. `TavernGuestDef`) — die Charakterzeile lässt beides bewusst aus,
 * statt erfundene Werte zu behaupten.
 */
export interface CharacterExportInput {
  name: string;
  /** Gesamtlevel über alle Skills (`character.totalLevel`) — es gibt keine separate "Kampfstufe". */
  totalLevel: number;
  /** Aktiver Kampfstil, aus der Hauptwaffe abgeleitet (`computeStats(state, content).style`,
   *  Default "melee" ohne Waffe — dieselbe Regel wie `packages/engine/src/character.ts`). */
  style: WeaponStyle;
  equipment: Record<EquipSlot, ItemId | null>;
}

const STYLE_LABEL_EN: Record<WeaponStyle, string> = {
  melee: "Melee",
  ranged: "Ranged",
  magic: "Magic",
};

const STYLE_DESC_EN: Record<WeaponStyle, string> = {
  melee: "a melee fighter",
  ranged: "a ranged marksman",
  magic: "a spellcaster",
};

function slotLine(equipment: CharacterExportInput["equipment"], content: ContentDB, slot: EquipSlot): string {
  const slotLabel = resolveText(EQUIP_SLOT_LABELS[slot], "en");
  const itemId = equipment[slot];
  const item = itemId ? content.items[itemId] : undefined;
  if (!item) return `${slotLabel}: empty`;
  const itemName = resolveText(item.name, "en");
  const rarity = resolveText(RARITY_LABEL[getItemRarity(item)], "en");
  const desc = item.description ? resolveText(item.description, "en") : null;
  return desc ? `${slotLabel}: ${itemName} (${rarity}) — ${desc}` : `${slotLabel}: ${itemName} (${rarity})`;
}

/** Waffe(n)-Zusammenfassung: aktiver Stil + Haupt-/Nebenhand-Namen (leer = "none"). */
function weaponSummaryLine(equipment: CharacterExportInput["equipment"], content: ContentDB, style: WeaponStyle): string {
  const nameOf = (slot: EquipSlot): string => {
    const id = equipment[slot];
    const item = id ? content.items[id] : undefined;
    return item ? resolveText(item.name, "en") : "none";
  };
  return `Weapon style: ${STYLE_LABEL_EN[style]} (mainhand: ${nameOf("mainhand")}, offhand: ${nameOf("offhand")}).`;
}

/**
 * Baut den fertigen, einfüge-bereiten englischen Prompt (Aufbau s. design/prompt-extractor.md):
 * Auftrag → Charakterzeile → alle 14 Ausrüstungsplätze → Waffen-Stil-Zeile → Stilvorgaben →
 * Anhang-Hinweis. `content` liefert die Item-Definitionen (Name/Rarity/Beschreibung je Slot).
 */
export function buildCharacterExportPrompt(input: CharacterExportInput, content: ContentDB): string {
  const lines: string[] = [];

  lines.push(
    "Create a full-body illustration of my character from the dark-fantasy RPG Grim Reach. Use the " +
      "attached portrait.png for face, hair and skin tone, and the attached kit.png as the exact " +
      "reference for every piece of equipment.",
  );
  lines.push("");
  lines.push(`Character: ${input.name} — Total level ${input.totalLevel}, ${STYLE_DESC_EN[input.style]}.`);
  lines.push("");
  lines.push("Equipment:");
  for (const slot of EQUIP_SLOTS) lines.push(slotLine(input.equipment, content, slot));
  lines.push("");
  lines.push(weaponSummaryLine(input.equipment, content, input.style));
  lines.push("");
  lines.push(
    "Style: painted dark-fantasy realism, muted ashen-iron palette of dark iron, bronze and " +
      "parchment tones; veteran presence, confident stance; a generic, immediately readable fantasy " +
      "archetype — no folk costume, no comedy. No text, no watermark, no rarity glow or shimmer on the " +
      "gear. Smoky battlefield background. Aspect ratio 3:4 (portrait orientation).",
  );
  lines.push("");
  lines.push("Attach kit.png and portrait.png with this prompt.");

  return lines.join("\n");
}

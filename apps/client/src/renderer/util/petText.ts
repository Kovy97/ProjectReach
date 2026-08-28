import { content } from "@hearthforge/content";
import {
  PET_ABILITY_DEBUFF_MS,
  PET_ABILITY_DELAYED_DOT_MS,
  PET_ABILITY_MULTIHIT_COUNT,
  PET_ABILITY_STATUS_MS,
  PET_STEAL_MIN_LOOT_CHANCE,
  PET_WHOLE_LEVEL_KINDS,
} from "@hearthforge/shared";
import type { LocalizedString, PetCombatAbility, PetDef } from "@hearthforge/shared";
import { formatPct1, formatSeconds1 } from "./format";

/**
 * Chef-Auftrag 27.08.2026 („Da fehlen mir Erklärungen zu den aktiven und passiven Skills der
 * Pets."): baut aus dem rohen `PetDef` echte, lesbare Sätze mit den TATSÄCHLICHEN Engine-Zahlen —
 * keine erfundenen Werte. Jede Zahl hier ist 1:1 aus `PetSkillEffect`/`PetCombatAbility` +
 * den Engine-Konstanten (`packages/shared/src/index.ts`, `packages/engine/src/combat.ts`
 * `firePetAbility`) abgeleitet; siehe die Kind-Tabellen dort für die Semantik-Quelle.
 *
 * Zwei Konsumenten: PetGalleryPage.tsx (Begleiter-Karte, Passiv-/Aktiv-Zeile, auch für NICHT
 * besessene Pets — der Spieler soll wissen, wofür er jagt) und CombatPage.tsx (Hover-Tooltip
 * auf dem Begleiter-Portrait im Kampf, nur die Ability, keine Passiv-Zeile — die Passiv-Wirkung
 * greift beim Skilling, nicht im Kampf).
 */

type TFn = (key: string) => string;
type TrFn = (v: LocalizedString) => string;

/** Bruch (0..1) → Prozent-Zahl-Text ohne Einheit, z.B. 0.03 → "3" (formatPct1, EINE Dezimale nur
 *  wenn gebraucht — dieselbe Rundung, die die Galerie-Karte schon für die kompakte Zeile nutzt). */
function pct(fraction: number): string {
  return formatPct1(fraction);
}

/** ms → Sekunden-Text mit fester Dezimale, z.B. 4500 → "4,5" (dieselbe Formatierung wie
 *  `companions.interval` — ein Spieler soll überall dieselbe Zahlendarstellung sehen). */
function secs(ms: number): string {
  return formatSeconds1(ms / 1000);
}

/**
 * Ein Satz mit echten Zahlen für das Passiv (`pet.skillEffect`) — z.B. „+3 % Erfolgschance bei
 * Diebeskunst" oder „5 % Chance, das Material bei Schmieden zurückzubekommen". `skillBoost` ist
 * die EINZIGE Ausnahme: `value` sind GANZE Stufen, kein Bruch (siehe `PET_WHOLE_LEVEL_KINDS`).
 */
export function passiveText(pet: PetDef, t: TFn, tr: TrFn): string {
  const se = pet.skillEffect;
  const skillDef = se.skill ? content.skills[se.skill] : undefined;
  const skillName = skillDef ? tr(skillDef.name) : (se.skill ?? "");
  const raw = se.value ?? 0;
  const valueStr = PET_WHOLE_LEVEL_KINDS.includes(se.kind) ? String(raw) : pct(raw);
  return t(`pet.passive.${se.kind}`)
    .replace(/\{value\}/g, valueStr)
    .replace(/\{pct\}/g, valueStr)
    .replace(/\{skill\}/g, skillName);
}

/**
 * Name der Fähigkeit + ein bis zwei Sätze mit Zahlen und Takt für die getriggerte Combat-Ability
 * (`pet.combatAbility`) — z.B. „Diebesgriff. Alle 6 s: 40 % Chance, ein Item aus der Beute des
 * Gegners zu stehlen. Nur Drops mit mindestens 5 % Chance, Menge 1." Selbsttragend: enthält Name
 * UND Takt, kein zusätzlicher Kontext von außen nötig.
 */
export function abilityText(pet: PetDef, t: TFn, tr: TrFn): string {
  const ce = pet.combatAbility;
  const name = tr(ce.name);
  const body = abilityBody(ce, t);
  return t("pet.ability.frame")
    .replace("{name}", name)
    .replace("{sec}", secs(ce.intervalMs))
    .replace("{body}", body);
}

function statusBody(
  ce: PetCombatAbility,
  t: TFn,
  key: "onHitStatus" | "delayedDot",
  durationMs: number,
): string {
  if (!ce.status) return "";
  if (ce.status === "frost") {
    // frost trägt keine DoT-Magnitude (isDot=false in firePetAbility) — reiner Verlangsamungs-
    // Status, „%/s Schaden" wäre hier schlicht falsch.
    return t(`pet.ability.${key}.frost`).replace("{sec}", secs(durationMs));
  }
  const value = ce.value ?? 0;
  return t(`pet.ability.${key}`)
    .replace("{status}", t(`status.${ce.status}`))
    .replace("{pct}", pct(value))
    .replace("{sec}", secs(durationMs));
}

/** Kind-spezifischer Effekt-Satz (ohne Name/Takt-Rahmen, den setzt `abilityText` drumherum). */
function abilityBody(ce: PetCombatAbility, t: TFn): string {
  const value = ce.value ?? 0;
  switch (ce.kind) {
    case "stun":
      // pa.enemyStunMs = value (ms) — Gegner setzt seinen nächsten Angriff aus.
      return t("pet.ability.stun").replace("{sec}", secs(value));
    case "burstDamage":
      // petDamageEnemy(value) = round(enemy.maxHp * value) Sofortschaden.
      return t("pet.ability.burstDamage").replace("{pct}", pct(value));
    case "onHitStatus":
      return statusBody(ce, t, "onHitStatus", PET_ABILITY_STATUS_MS);
    case "delayedDot":
      return statusBody(ce, t, "delayedDot", PET_ABILITY_DELAYED_DOT_MS);
    case "accuracyDownEnemy":
      // pa.enemyAccDownPct = value für PET_ABILITY_DEBUFF_MS (3000ms fest).
      return t("pet.ability.accuracyDownEnemy")
        .replace("{sec}", secs(PET_ABILITY_DEBUFF_MS))
        .replace("{pct}", pct(value));
    case "stealDrop":
      // value = Erfolgschance; nur Loot-Einträge mit chance ≥ PET_STEAL_MIN_LOOT_CHANCE (5%),
      // Menge = roll.min (der Dieb klaut die Mindestmenge, s. firePetAbility stealDrop-Case).
      return t("pet.ability.stealDrop")
        .replace("{pct}", pct(value))
        .replace("{min}", pct(PET_STEAL_MIN_LOOT_CHANCE));
    case "heal":
      // healPlayer(round(player.maxHp * value)).
      return t("pet.ability.heal").replace("{pct}", pct(value));
    case "shield":
      // pa.shieldHp = max(aktuell, round(player.maxHp * value)) — Absorb-Pool, kein Timer.
      return t("pet.ability.shield").replace("{pct}", pct(value));
    case "armorRend":
      // pa.enemyVulnPct = value für PET_ABILITY_DEBUFF_MS (3000ms fest) — Gegner nimmt +% Schaden
      // von JEDEM Spieler-Treffer in dem Fenster (combat.ts Zeile ~1800).
      return t("pet.ability.armorRend")
        .replace("{sec}", secs(PET_ABILITY_DEBUFF_MS))
        .replace("{pct}", pct(value));
    case "guaranteedCrit":
      // petDamageEnemy(value) — mechanisch identisch zu burstDamage, aber als garantierter Krit
      // benannt/geframt (PetCombatAbility-Doc-Tabelle, shared/index.ts).
      return t("pet.ability.guaranteedCrit").replace("{pct}", pct(value));
    case "wardRestore":
      // player.ward += player.maxWard * value (gekappt bei maxWard).
      return t("pet.ability.wardRestore").replace("{pct}", pct(value));
    case "lifestealBurst":
      // petDamageEnemy(value) + healPlayer(player.maxHp * value) — derselbe Bruch, zwei Basen.
      return t("pet.ability.lifestealBurst").replace(/\{pct\}/g, pct(value));
    case "enemyAttackDelay":
      // cs.enemyTimerMs -= value (ms) — schiebt den Gegner-Angriffs-Timer zurück.
      return t("pet.ability.enemyAttackDelay").replace("{sec}", secs(value));
    case "blockNextEnemyHit":
      // pa.blockNextHit = true — one-shot, value ungenutzt (PET_ABILITY_CAP-Kommentar).
      return t("pet.ability.blockNextEnemyHit");
    case "armorPierceHit":
      // petDamageEnemy(value) — geht (wie alle direkten Pet-Treffer) nie durch die Rüstungs-
      // Pipeline, hier als „ignoriert Rüstung" geframt (Doc-Tabelle).
      return t("pet.ability.armorPierceHit").replace("{pct}", pct(value));
    case "multiHit": {
      // PET_ABILITY_MULTIHIT_COUNT (3) Treffer à value Bruch enemy.maxHp.
      const total = value * PET_ABILITY_MULTIHIT_COUNT;
      return t("pet.ability.multiHit")
        .replace("{count}", String(PET_ABILITY_MULTIHIT_COUNT))
        .replace("{pct}", pct(value))
        .replace("{total}", pct(total));
    }
    default: {
      // Exhaustiveness-Wächter: PetAbilityKind ist eine geschlossene Taxonomie (16 Kinds,
      // shared/index.ts) — ein neues Kind ohne Fall hier ist ein Compile-Fehler, kein Runtime-Bug.
      const _exhaustive: never = ce.kind;
      return _exhaustive;
    }
  }
}

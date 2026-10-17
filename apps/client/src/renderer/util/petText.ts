import { content } from "@hearthforge/content";
import {
  EMBER_MAX_STACKS,
  PET_ABILITY_DEBUFF_MS,
  PET_ABILITY_DELAYED_DOT_MS,
  PET_ABILITY_MULTIHIT_COUNT,
  PET_ABILITY_STATUS_MS,
  PET_CRIPPLE_SLOW_MS,
  PET_CRIPPLE_SLOW_PCT,
  PET_EMBER_BRAND_MS,
  PET_EMBER_BRAND_STACK_BONUS,
  PET_EMBER_DETONATE_BURN_MS,
  PET_EMERGENCY_HEAL_BELOW,
  PET_EXECUTE_BLEED_BELOW,
  PET_POISON_SLOW_PCT,
  PET_STEAL_MIN_LOOT_CHANCE,
  PET_WHOLE_LEVEL_KINDS,
} from "@hearthforge/shared";
import type { LocalizedString, PetCombatAbility, PetDef } from "@hearthforge/shared";
import { formatPct2, formatSeconds1 } from "./format";

/**
 * Chef-Auftrag 27.08.2026 („Da fehlen mir Erklärungen zu den aktiven und passiven Skills der
 * Pets."): baut aus dem rohen `PetDef` echte, lesbare Sätze mit den TATSÄCHLICHEN Engine-Zahlen —
 * keine erfundenen Werte. Jede Zahl hier ist 1:1 aus `PetSkillEffect`/`PetCombatAbility` +
 * den Engine-Konstanten (`packages/shared/src/index.ts`, `packages/engine/src/combat.ts`
 * `firePetAbility`) abgeleitet; siehe die Kind-Tabellen dort für die Semantik-Quelle.
 *
 * Konsumenten: PetGalleryPage.tsx (Dossier: Fertigkeit, Kampf-Fähigkeit, Echo) und CombatPage.tsx
 * (Hover-Tooltip auf dem Begleiter-Portrait im Kampf, nur die Ability).
 *
 * claude:2026-10-18T02:00:00+02:00 — 1.3.0 Begleiter-Rework: Signatur-Namen der Fertigkeit, neue
 * Effektarten, Echo-Skalierung (`scale`) und zwei Nachkommastellen (Echo-Werte wie 1,25 %).
 */

type TFn = (key: string) => string;
type TrFn = (v: LocalizedString) => string;

/** Bruch (0..1) → Prozent-Zahl-Text ohne Einheit, z.B. 0.0125 → "1,25" (bis zu 2 Nachkommastellen,
 *  glatte Werte ohne Nullen-Schwanz). */
function pct(fraction: number): string {
  return formatPct2(fraction);
}

/** ms → Sekunden-Text mit fester Dezimale, z.B. 4500 → "4,5" (wie `companions.interval`). */
function secs(ms: number): string {
  return formatSeconds1(ms / 1000);
}

/** Übersetzt `key`, fällt auf `fallback` zurück, wenn der Key fehlt (t() liefert dann den Key selbst). */
function tOr(t: TFn, key: string, fallback: string): string {
  const v = t(key);
  return v === key ? t(fallback) : v;
}

/**
 * Der Satz (ohne Namen) für die Fertigkeit, mit `scale` (1 = ausgerüstet, PET_ECHO_FACTOR = Echo).
 * `skillBoost` ist die EINZIGE Ausnahme mit GANZEN Stufen (siehe `PET_WHOLE_LEVEL_KINDS`).
 */
export function passiveSentence(pet: PetDef, t: TFn, tr: TrFn, scale = 1): string {
  const se = pet.skillEffect;
  const skillDef = se.skill ? content.skills[se.skill] : undefined;
  const skillName = skillDef ? tr(skillDef.name) : (se.skill ?? "");
  const raw = (se.value ?? 0) * scale;
  const valueStr = PET_WHOLE_LEVEL_KINDS.includes(se.kind) ? String(Math.floor(raw)) : pct(raw);
  let key = `pet.passive.${se.kind}`;
  if (se.kind === "bonusFind" && se.pool) key = `pet.passive.bonusFind.${se.pool}`;
  if (se.kind === "tierUp" && se.ladder) key = `pet.passive.tierUp.${se.ladder}`;
  if (se.kind === "styleDamage" && se.style) key = `pet.passive.styleDamage.${se.style}`;
  const stunSaving = se.kind === "thievingFinesse" ? (1 - (se.stunMult ?? 1)) * scale : 0;
  return tOr(t, key, `pet.passive.${se.kind}`)
    .replace(/\{value\}/g, valueStr)
    .replace(/\{pct\}/g, valueStr)
    .replace(/\{stun\}/g, pct(stunSaving))
    .replace(/\{style\}/g, se.style ? t(`style.${se.style}`) : "")
    .replace(/\{skill\}/g, skillName);
}

/**
 * Ein Satz mit echten Zahlen für die Fertigkeit (`pet.skillEffect`), mit Signatur-Namen davor,
 * z.B. „Wurzelgespür. 6 % Chance je gefälltem Baum, …". `scale` wie bei `passiveSentence`.
 */
export function passiveText(pet: PetDef, t: TFn, tr: TrFn, scale = 1): string {
  const sentence = passiveSentence(pet, t, tr, scale);
  const name = pet.skillEffect.name;
  return name ? t("pet.passive.named").replace("{name}", tr(name)).replace("{text}", sentence) : sentence;
}

/** Geladen-Muster (1.3.0): Abklingzeit statt Takt, darum ein eigener Rahmen ohne „Alle X s". */
const CHARGED_KINDS = new Set<PetCombatAbility["kind"]>(["emergencyHeal", "deathSave"]);

/**
 * Name der Fähigkeit + ein bis zwei Sätze mit Zahlen und Takt für die getriggerte Combat-Ability
 * (`pet.combatAbility`). Selbsttragend: enthält Name UND Takt (bzw. Abklingzeit).
 */
export function abilityText(pet: PetDef, t: TFn, tr: TrFn): string {
  const ce = pet.combatAbility;
  const name = tr(ce.name);
  const body = abilityBody(ce, t);
  if (CHARGED_KINDS.has(ce.kind)) {
    return t("pet.ability.frameCharged").replace("{name}", name).replace("{body}", body);
  }
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
      return t("pet.ability.stun").replace("{sec}", secs(value));
    case "burstDamage":
      return t("pet.ability.burstDamage").replace("{pct}", pct(value));
    case "onHitStatus":
      return statusBody(ce, t, "onHitStatus", PET_ABILITY_STATUS_MS);
    case "delayedDot":
      return statusBody(ce, t, "delayedDot", PET_ABILITY_DELAYED_DOT_MS);
    case "accuracyDownEnemy":
      return t("pet.ability.accuracyDownEnemy")
        .replace("{sec}", secs(PET_ABILITY_DEBUFF_MS))
        .replace("{pct}", pct(value));
    case "stealDrop":
      // claude:2026-10-18T02:00:00+02:00 — 1.3.0: höchstens ein Erfolg je Gegner (eigener Key, damit
      // keine veraltete Übersetzung des alten Satzes stehen bleibt).
      return t("pet.ability.stealDropOnce")
        .replace("{pct}", pct(value))
        .replace("{min}", pct(PET_STEAL_MIN_LOOT_CHANCE));
    case "heal":
      return t("pet.ability.heal").replace("{pct}", pct(value));
    case "shield":
      return t("pet.ability.shield").replace("{pct}", pct(value));
    case "armorRend":
      return t("pet.ability.armorRend")
        .replace("{sec}", secs(PET_ABILITY_DEBUFF_MS))
        .replace("{pct}", pct(value));
    case "guaranteedCrit":
      return t("pet.ability.guaranteedCrit").replace("{pct}", pct(value));
    case "wardRestore":
      // claude:2026-10-18T02:00:00+02:00 — 1.3.0: Gutschrift = value × maxHp (gedeckelt bei maxWard).
      return t("pet.ability.wardRestoreHp").replace("{pct}", pct(value));
    case "lifestealBurst":
      return t("pet.ability.lifestealBurst").replace(/\{pct\}/g, pct(value));
    case "enemyAttackDelay":
      return t("pet.ability.enemyAttackDelay").replace("{sec}", secs(value));
    case "blockNextEnemyHit":
      return t("pet.ability.blockNextEnemyHit");
    case "armorPierceHit":
      return t("pet.ability.armorPierceHit").replace("{pct}", pct(value));
    case "multiHit": {
      const total = value * PET_ABILITY_MULTIHIT_COUNT;
      return t("pet.ability.multiHit")
        .replace("{count}", String(PET_ABILITY_MULTIHIT_COUNT))
        .replace("{pct}", pct(value))
        .replace("{total}", pct(total));
    }
    // ── claude:2026-10-18T02:00:00+02:00 — 1.3.0 Begleiter-Rework (Werte aus shared-Konstanten) ──
    case "currentHpStrike":
      return t("pet.ability.currentHpStrike").replace("{pct}", pct(value));
    case "crippleStrike":
      return t("pet.ability.crippleStrike")
        .replace("{pct}", pct(value))
        .replace("{sec}", secs(PET_CRIPPLE_SLOW_MS))
        .replace("{slow}", pct(PET_CRIPPLE_SLOW_PCT));
    case "cripplingPoison":
      return t("pet.ability.cripplingPoison")
        .replace("{pct}", pct(value))
        .replace("{sec}", secs(PET_ABILITY_STATUS_MS))
        .replace("{slow}", pct(PET_POISON_SLOW_PCT));
    case "emberBrand":
      return t("pet.ability.emberBrand")
        .replace("{pct}", pct(value))
        .replace("{sec}", secs(ce.durationMs ?? PET_EMBER_BRAND_MS))
        .replace("{bonus}", pct(PET_EMBER_BRAND_STACK_BONUS))
        .replace("{max}", String(EMBER_MAX_STACKS));
    case "emberDetonate":
      return t("pet.ability.emberDetonate")
        .replace("{burn}", pct(ce.burnValue ?? 0))
        .replace("{sec}", secs(PET_EMBER_DETONATE_BURN_MS))
        .replace("{pct}", pct(value));
    case "executeBleed":
      return t("pet.ability.executeBleed")
        .replace("{pct}", pct(value))
        .replace("{sec}", secs(PET_ABILITY_STATUS_MS))
        .replace("{below}", pct(PET_EXECUTE_BLEED_BELOW));
    case "frostBite":
      return t("pet.ability.frostBite").replace("{sec}", secs(value));
    case "emergencyHeal":
      return t("pet.ability.emergencyHeal")
        .replace("{below}", pct(PET_EMERGENCY_HEAL_BELOW))
        .replace("{pct}", pct(value))
        .replace("{sec}", secs(ce.intervalMs));
    case "deathSave":
      return t("pet.ability.deathSave").replace("{sec}", secs(ce.intervalMs));
    default: {
      // Exhaustiveness-Wächter: PetAbilityKind ist eine geschlossene Taxonomie (shared/index.ts) —
      // ein neues Kind ohne Fall hier ist ein Compile-Fehler, kein Runtime-Bug.
      const _exhaustive: never = ce.kind;
      return _exhaustive;
    }
  }
}

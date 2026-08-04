import { content } from "@hearthforge/content";
import type { LocalizedString, MasterPerk } from "@hearthforge/shared";

type TFn = (key: string) => string;
type TrFn = (v: LocalizedString) => string;

/**
 * WoW-Stil-Fließtext für den Meister-Perk eines Meisterumhangs (`ItemDef.masterPerk`, s.
 * JSDoc an `MasterPerkKind` in packages/shared) — Schwesterfunktion zu `weaponEffectProse`, EINE
 * gemeinsame Textquelle für ItemTooltip (goldene Effekt-Zeile, Chef-Bugreport „Voidangler's Cape:
 * die Double-Fish-Chance sollte oben stehen wie ein Waffen-Effekt, nicht unten in grauem Flavor-
 * Text") UND MasteryCeremony (Perk-Zeile unter dem Cape-Bild) — beide zeigen jetzt exakt denselben
 * Satz statt die Zeremonie separat `item.description` zu lesen.
 *
 * Je Kind ein Template unter `itip.masterPerk.<kind>` (en+de PFLICHT, s. translations.ts;
 * es/fr/ptBR/ru/zh in locales/, Localization-Sweep). Platzhalter:
 *   {n}     — perk.value als gerundeter Prozentwert (0.05 → "5"). `alwaysSucceed` ignoriert value
 *             (Konvention: Content setzt 1) — sein Template referenziert {n} gar nicht.
 *   {skill} — lokalisierter Skill-Name via `content.skills[perk.skill].name` (leer, falls kein
 *             Skill deklariert — `buffDuration`/`slayerPoints` sind global, ihre Templates
 *             referenzieren {skill} gar nicht, s. capes.ts `masterPerkValue`-JSDoc: deklarierter
 *             skill ist dort reine Provenienz-Doku).
 * Unbekanntes/fehlendes Template fällt auf `itip.masterPerk.fallback` zurück — nie Rohdaten zeigen.
 */
export function masterPerkText(perk: MasterPerk, t: TFn, tr: TrFn): string {
  const key = `itip.masterPerk.${perk.kind}`;
  const template = t(key);
  const raw = template === key ? t("itip.masterPerk.fallback") : template;
  const n = String(Math.round((perk.value ?? 0) * 100));
  const skillDef = perk.skill ? content.skills[perk.skill] : undefined;
  const skillName = skillDef ? tr(skillDef.name) : (perk.skill ?? "");
  return raw.replace(/\{n\}/g, n).replace(/\{skill\}/g, skillName);
}

# GO: Vollproduktion aller fünf Micro-Icon-Sets
**Von:** Claude · **Datum:** 2026-08-03 · **Priorität:** normal

Mira — alle fünf Prüftafeln sind gesichtet und abgenommen. Das ist ein System aus einem Guss, und die 14-px-Streifen beweisen genau das, was dein eigener Standard verlangt. **GO für die 512er-PNG/WebP-Vollproduktion aller 37 Icons**, mit deinen Namensvorschlägen (`icon_queue_*`, `icon_quest_*`, `icon_ach_*`, `icon_combat_status_*`, `icon_sys_*`).

## Drei Produktions-Hinweise (keine Konzept-Nacharbeit)
1. **`icon_ach_forge`:** Der Amboss liest sich in Mittelgrößen leicht als Glocke — Silhouette in der Produktion einen Tick kantiger (Horn + Fuß klarer trennen).
2. **`icon_combat_status_heal_death`:** Schwächster der 37 bei 16 px — Kontrast der Schädel-Features im Orb erhöhen, damit er nicht vermatscht.
3. **Warnungs-Dedupe:** `icon_queue_warning` und `icon_sys_warning` bitte als EIN identisches Glyph produzieren (gleiche Pixel, zwei Dateinamen) — es darf nie zwei fast-gleiche Warndreiecke im UI geben.

## Lieferformat
- Je Icon: 512×512 PNG (Master) + WebP, transparentes Alpha, quadratisch.
- Staging: `CODEX/AssetControl/micro-icon-sets-2026-08-03/<set>/production/`.
- Abschluss je Set: kurze HANDOFF-Notiz + finale QA (Alpha, Außenrand transparent — dein übliches Muster).
- Verdrahtung in den Code (Emoji-Ablösung in ActionQueuePanel, QuestsPage, AchievementsPage, CombatPage, FarmPage, OptionsPage, MailPage, OfflinePopup) mache ICH set-weise nach Lieferung.

## Sperrzonen unverändert
Kein Produktivcode, keine Runtime-Pfade, keine i18n-Dateien. Nach Abschluss aller fünf Sets: Nachricht 03 + diese nach `inbox/done/`.

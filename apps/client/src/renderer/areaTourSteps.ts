/**
 * Bereichs-Erst-Touren — Schritt-Registries (Chef-Auftrag „Onboarding fertig machen" Welle B,
 * 2026-07-13). Analog `onboarding-steps.ts` (Haupt-Guide), aber pro Seite/Bereich: kurze
 * Spotlight-Rundgänge (3-5 Schritte) für Kampf/Shop/Bank, die beim JEWEILS ERSTEN Besuch der
 * Seite laufen (s. AreaTourGuide.tsx für die Trigger-/Gating-Logik + Persistenz).
 *
 * `guideId: null` → zentrierter, voll abgedunkelter Intro-/Abschluss-Screen (kein Spotlight-Ziel).
 * Alle anderen `guideId`s zeigen auf `data-guide-id`-Attribute, die extra für diese Touren in den
 * jeweiligen Page-Components ergänzt wurden (CombatPage.tsx/ShopPage.tsx/BankPage.tsx) — getrennter
 * Namespace von den Haupt-Guide-IDs (`topbar.*`/`sidebar.*`), damit sich beide Systeme nie
 * überschneiden.
 */

export interface AreaTourStepDef {
  guideId: string | null;
  /** i18n-Key-PRÄFIX für diesen Schritt. Aufgelöst als `${textKey}.title` und `${textKey}.body`. */
  textKey: string;
  /**
   * true: dieser Schritt schaltet NUR weiter, wenn der Spieler tatsächlich mit dem
   * hervorgehobenen Ziel interagiert — kein "Weiter"-Button (dieselbe Semantik wie
   * `OnboardingStepDef.requireAction` in onboarding-steps.ts). Fehlt/false: die Sprechblase zeigt
   * einen "Weiter"-Button. Bisher nur von FEATURE_TOUR_STEPS genutzt — COMBAT/SHOP/BANK bleiben
   * rein Button-gesteuert (AreaTourGuide.tsx übergibt weiterhin hart `requireAction={false}`).
   */
  requireAction?: boolean;
}

/**
 * Kampf-Tour: Gegner-Auswahl, Loadout (Ausrüstung/Skills/Haltung/Auto-Essen), Auto-Battle-Kern.
 * `combat.loadout` sitzt auf ZWEI Containern (Auswahl-Sidebar UND Battle-Loadout-Spalte, s.
 * CombatPage.tsx) — je nachdem, ob beim ersten Seitenbesuch schon ein Kampf läuft, findet der
 * Spotlight das jeweils tatsächlich gerenderte Element. `combat.autoBattleCore` sitzt auf dem
 * "Kämpfen"-Button jeder Monster-Karte — ist gerade keine Monster-Karte sichtbar (z.B. man steht
 * noch auf der Zonen-Auswahl), fällt der Schritt automatisch auf den zentrierten Screen zurück
 * (SpotlightGuide-Verhalten bei fehlendem Ziel) — kein Fehlerzustand, nur weniger Spotlight-Ring.
 */
export const COMBAT_TOUR_STEPS: AreaTourStepDef[] = [
  { guideId: null, textKey: "onboarding.tour.combat.intro" },
  { guideId: "combat.enemySelect", textKey: "onboarding.tour.combat.enemySelect" },
  { guideId: "combat.loadout", textKey: "onboarding.tour.combat.loadout" },
  { guideId: "combat.autoBattleCore", textKey: "onboarding.tour.combat.autoBattle" },
];

/** Shop-Tour: Kaufen/Verkaufen-Tabs + Aufrüstungen (Slot-/Auto-Essen-Upgrades). */
export const SHOP_TOUR_STEPS: AreaTourStepDef[] = [
  { guideId: null, textKey: "onboarding.tour.shop.intro" },
  { guideId: "shop.tabs", textKey: "onboarding.tour.shop.tabs" },
  { guideId: "shop.upgrades", textKey: "onboarding.tour.shop.upgrades" },
];

/** Bank-Tour: Einlagern/Entnehmen (beide Spalten in einem Schritt) + Slot-Kauf. */
export const BANK_TOUR_STEPS: AreaTourStepDef[] = [
  { guideId: null, textKey: "onboarding.tour.bank.intro" },
  { guideId: "bank.columns", textKey: "onboarding.tour.bank.columns" },
  { guideId: "bank.slotPurchase", textKey: "onboarding.tour.bank.slotPurchase" },
];

/**
 * Versions-„Was ist neu"-Tour (Chef-Auftrag 2026-07-21): feuert EINMALIG für Spieler, die einen
 * Save von der VORIGEN Version laden — `state.onboarding.toursSeen.featureTourV1` fehlt dort noch
 * (s. shared/index.ts `newGameOnboarding`-Doc: frische Saves/Neustarts markieren den Key vorab
 * als "gesehen", nur Alt-Saves sehen die Tour). Gemountet global in App.tsx (MainLayout, neben
 * OnboardingGuide) statt Seiten-lokal wie COMBAT/SHOP/BANK_TOUR_STEPS — die beworbenen Ziele
 * (Action-Queue-Panel, Sidebar-Resize-Rand) sind globales Chrome, keine Seiten-Inhalte.
 *
 * Die zwei Feature-Schritte sind INTERAKTIV (`requireAction: true`, s. FeatureTourGuide.tsx für
 * die Klick-/Mousedown-Vorrück-Logik je Schritt) — der Spieler muss die beworbene Aktion wirklich
 * ausführen (Queue aufklappen / Sidebar-Rand anfassen), nicht nur "Weiter" klicken.
 */
export const FEATURE_TOUR_STEPS: AreaTourStepDef[] = [
  { guideId: null, textKey: "onboarding.feature.intro" },
  { guideId: "feature.queueExpand", textKey: "onboarding.feature.queueExpand", requireAction: true },
  { guideId: "feature.sidebarResize", textKey: "onboarding.feature.sidebarResize", requireAction: true },
  { guideId: null, textKey: "onboarding.feature.outro" },
];

/**
 * Versions-„Was ist neu"-Tour v2 (0.3.0 „Das Lager"/New Haven, Release-Fix-Welle Agent B, Befund
 * B4-2/B4-3, 2026-08-03): eigener, NEUER Persistenz-Key `featureTourV2` (s. shared/index.ts
 * `OnboardingState.toursSeen`-Doc + der `newGameOnboarding()`-Kommentar „künftige Update-Touren
 * bekommen einen eigenen neuen Key" — genau dieser Fall, statt `featureTourV1` wiederzuverwenden).
 *
 * Läuft VERKETTET nach FEATURE_TOUR_STEPS (FeatureTourGuide.tsx `requiresTourKey="featureTourV1"`,
 * jetzt eine generische Prop statt fest verdrahtet): startet erst, wenn `toursSeen.featureTourV1`
 * bereits `true` ist. Das deckt in EINER Bedingung beide Zielgruppen ab, die der Auftrag nennt —
 * (a) echte Alt-Saves, die v1 gerade erst (im selben Ladevorgang) gesehen/übersprungen haben, UND
 * (b) Spieler, die v1 schon VOR diesem Update gesehen hatten (toursSeen.featureTourV1 war schon
 * vorher true). Kein doppelter Persistenz-Mechanismus nötig — `toursSeen` ist bereits die
 * dynamische `Record<string, true>`-Map (shared/index.ts), ein neuer String-Key reicht.
 *
 * WICHTIG (an den CEO gemeldet, s. Abgabe-Notiz — packages/shared liegt außerhalb der ui-dev-
 * Revier): `newGameOnboarding()` markiert `featureTourV1` für frische Spieler bereits vorab als
 * "gesehen" (damit sie v1 nie sehen). Ohne einen GLEICHEN Vorab-Marker für `featureTourV2` würde
 * ein frischer 0.3.0-Spieler nach Abschluss des Haupt-Guides (sobald `onboarding.active` auf
 * `false` kippt) diese v2-Tour einmalig FÄLSCHLICH sehen — `toursSeen.featureTourV1` ist bei ihm ja
 * ebenfalls (vorab) `true`, exakt ununterscheidbar von einem "hat v1 echt gesehen"-Bestandsspieler,
 * ohne dieses zusätzliche Bit. Erforderliche Ein-Zeilen-Änderung: `newGameOnboarding()` (Zeile
 * ~5783) `toursSeen: { featureTourV1: true }` → `toursSeen: { featureTourV1: true, featureTourV2:
 * true }`. Rein additiv, kein SAVE_VERSION-Bump (dieselbe flexible Map wie bei v1).
 *
 * EIN fokussierter Schritt (Chef-Auftrag „so scharf wie möglich"): highlightet den New-Haven-
 * Sidebar-Eintrag (`data-guide-id="sidebar.newhaven"`, generisch von JEDEM Sidebar-Eintrag gesetzt,
 * s. Sidebar.tsx `data-guide-id={`sidebar.${page.id}`}` — kein neues Ziel-Attribut nötig, der
 * Eintrag existiert bereits unconditional in `getSidebarPages()`). `requireAction: true` (Muster
 * `feature.queueExpand` oben): der Klick auf den ECHTEN Sidebar-Button navigiert UND schließt die
 * Tour im selben Klick — die geforderte „Sprung-Möglichkeit zur Seite" ist damit der Klick selbst,
 * kein separater Button nötig (Überspringen bleibt für Spieler, die nicht sofort wechseln wollen).
 * Kein Intro-/Outro-Rahmen wie bei v1 — ein einzelner Schritt braucht keine Klammer-Screens.
 */
export const FEATURE_TOUR_STEPS_V2: AreaTourStepDef[] = [
  { guideId: "sidebar.newhaven", textKey: "onboarding.feature2.newHaven", requireAction: true },
];

/**
 * Item-Karten-Guide (Chef-Auftrag „Item-Wiki fürs Auffindbarkeit fehlt" 2026-08-27): Reddit-Spieler
 * kennen das Wiki nicht, weil sie nie auf den kleinen „?"-Knopf oben rechts an der Item-Karte
 * klicken. Kurzer Spotlight-Rundgang über die PINNED (geklickte, nicht nur gehoverte) Karte, EINMAL
 * pro Save, s. `AreaTourGuide`-Mount in `ItemTooltip.tsx` (`payload?.pinned`-gegatet statt
 * seiten-lokal — die Karte selbst ist der „Bereich"). `itemCard.stats` deckt gleichzeitig Werte,
 * Anforderungen UND Set-Bonus ab (alle drei leben in `.itip-warbanner-record`, s. ItemTooltipCard).
 * Kein eigener Quellen/Nutzen-Schritt: DAS ist genau das, was die Karte NICHT zeigt und das Wiki
 * (nächster Schritt) füllt — die dortige "?"-Button-Erklärung übernimmt diesen Übergang.
 */
export const ITEM_CARD_TOUR_STEPS: AreaTourStepDef[] = [
  { guideId: "itemCard.identity", textKey: "guide.itemCard.identity" },
  { guideId: "itemCard.stats", textKey: "guide.itemCard.stats" },
  { guideId: "itemCard.wikiBtn", textKey: "guide.itemCard.wikiBtn" },
  { guideId: null, textKey: "guide.itemCard.outro" },
];

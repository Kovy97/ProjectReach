/**
 * Onboarding-Guide — Schritt-Registry (UI-seitig; die Engine hält nur `state.onboarding`,
 * siehe `@hearthforge/engine` onboarding.ts). Diese Liste ist die einzige Quelle für WAS der
 * Guide zeigt, in welcher Reihenfolge, und OB ein Schritt einen echten Klick auf das
 * hervorgehobene Element verlangt statt eines simplen "Weiter"-Buttons.
 *
 * `state.onboarding.step` ist ein reiner Index in dieses Array (0-basiert). Läuft der Index über
 * das Ende hinaus (z.B. alter Spielstand, dessen Fortschritt vor einer Registry-Kürzung lag),
 * beendet `OnboardingGuide.tsx` den Guide defensiv über `finishGuide`.
 *
 * Chef-Auftrag 24.08.: Warteschlange und New Haven sind seither Teil DIESES Rundgangs. Sie
 * standen nur in den Feature-Touren (areaTourSteps.ts), die laut App.tsx einmalig fuer
 * Alt-Saves feuern — wer neu kauft, bekam beide nie erklaert.
 *
 * Aktueller Stand: Intro + jeder verbliebene Topbar-Unterpunkt einzeln + Skills-Overview
 * (Sidebar-Anfang) + ALLE 13 Sammel-/Handwerks-Skills (woodcutting, mining, fishing, smithing,
 * cooking, farming, foraging, thieving, leatherworking, tailoring, jewelcrafting, runecrafting,
 * herblore) + Statistics/Options (Sidebar-Ende) + ein Aufgaben-Hub-Schritt ("topbar.quests",
 * ceo-run-2026-07-14 Welle Y) + ein Abschluss-Schritt ("interlude") ganz am Ende, der den Guide
 * sauber beendet (finishGuide). 13 = alle content.skills OHNE die 7 Kampf-Substats (attack/power/
 * defence/ranged/magic/warding/vitality) und OHNE slayer/hunting — Kampf/Slayer/Shop/Bank/
 * Enchanting sind laut Design-Plan spätere, eigene Passes: design/onboarding-guide-plan.md,
 * Abschnitt "Kernflächen"; Jagen hat (Stand 27.08.) noch keinen eigenen Guide-Schritt, s. dessen
 * eigene Seite HuntingPage.tsx statt der generischen SkillPage. (Task #224 zog Shop/Bank in die
 * Top Bar und Statistics/Options in die Sidebar;
 * Task #274 tauschte zusätzlich Quests (→ Top Bar) mit Skills-Overview (→ Sidebar-Anfang) — die
 * Guide-Registry unten wurde jeweils entsprechend nachgezogen, siehe Kommentare bei den jeweiligen
 * Schritten. Welle Y ergänzte den Quests-Schritt bewusst ALS LETZTEN Klick-Schritt, damit der
 * Rundgang über der Aschechronik-Bühne endet statt auf der Options-Seite — s. dessen Kommentar
 * unten.)
 */

export interface OnboardingStepDef {
  /** Stabile, lesbare ID (Debugging/React-keys) — NICHT persistiert, nur der Array-Index ist es. */
  id: string;
  /**
   * `data-guide-id` des hervorzuhebenden DOM-Knotens (siehe TopBar.tsx/Sidebar.tsx). `null` für
   * Schritte ohne konkretes Ziel (Intro, Abschluss) — dann füllt ein zentrierter, vollflächig
   * abgedunkelter Screen die Bühne.
   */
  guideId: string | null;
  /**
   * i18n-Key-PRÄFIX für diesen Schritt. Aufgelöst als `${textKey}.title` und `${textKey}.body`.
   */
  textKey: string;
  /**
   * Wenn true: der Schritt schaltet NUR weiter, wenn der Spieler tatsächlich auf das
   * hervorgehobene Ziel klickt (das ist zugleich dessen normale Aktion, z.B. Navigation) — kein
   * "Weiter"-Button, das erzwingt das echte Folgen (Chef-Kernanforderung). Fehlt/false: die
   * Sprechblase zeigt einen "Weiter"/"Los"-Button, der den Guide direkt weiterschaltet (für rein
   * erklärende Schritte ohne eigene Klick-Aktion, z.B. Intro/Abschluss).
   */
  requireAction?: boolean;
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  { id: "intro", guideId: null, textKey: "onboarding.guide.intro" },

  // ── Topbar: jeder Unterpunkt einzeln (Reihenfolge wie navigation.ts topBarPages) ───────────
  // Task #224: Stats/Options sind in die Sidebar gewandert (Shop/Bank nahmen ihren Platz in der
  // Top Bar ein) — ihre Guide-Schritte stehen jetzt weiter unten im Sidebar-Block mit
  // guideId "sidebar.*", da genau dort ihr `data-guide-id`-Knoten jetzt gerendert wird.
  // Task #274: Quests und Skills-Overview haben die Plätze getauscht (Quests jetzt Top Bar,
  // Skills-Overview jetzt Sidebar ganz oben) — der alte "topbar.skills-overview"-Schritt entfällt
  // hier ersatzlos (Quests hatte nie einen eigenen Guide-Schritt, wie zuvor auch schon in der
  // Sidebar); sein Sidebar-Pendant steht jetzt als erster Schritt im Sidebar-Block unten.
  { id: "topbar.bestiary", guideId: "topbar.bestiary", textKey: "onboarding.guide.topbar.bestiary", requireAction: true },
  { id: "topbar.mastery", guideId: "topbar.mastery", textKey: "onboarding.guide.topbar.mastery", requireAction: true },
  { id: "topbar.character", guideId: "topbar.character", textKey: "onboarding.guide.topbar.character", requireAction: true },
  { id: "topbar.companions", guideId: "topbar.companions", textKey: "onboarding.guide.topbar.companions", requireAction: true },
  { id: "topbar.achievements", guideId: "topbar.achievements", textKey: "onboarding.guide.topbar.achievements", requireAction: true },
  // Enzyklopaedie (1.2.4, Chef-Auftrag 31.08.2026): steht ganz rechts in der Leiste, also auch
  // hier als letzter Topbar-Schritt. Bewusst OHNE `requireAction` — alle anderen Schritte lassen
  // den Spieler auf eine SEITE wechseln, der Guide bleibt dabei sichtbar. Das Fragezeichen oeffnet
  // dagegen ein fast bildschirmgrosses Modal; ein Klick-Zwang haette den Guide darunter begraben.
  // Der Spotlight zeigt trotzdem genau auf den Knopf, der Text erklaert ihn.
  { id: "topbar.encyclopedia", guideId: "topbar.encyclopedia", textKey: "onboarding.guide.topbar.encyclopedia" },

  // ── Sidebar: Skills-Overview (Task #274 — von der Top Bar hierher verschoben, jetzt ganz oben
  // über Combat) + alle 13 Sammel-/Handwerks-Skills (Reihenfolge wie navigation.ts) ────────────
  { id: "sidebar.skills-overview", guideId: "sidebar.skills-overview", textKey: "onboarding.guide.topbar.skillsOverview", requireAction: true },

  // New Haven, an seiner echten Sidebar-Position (navigation.ts: skills-overview, combat,
  // newhaven, dann die 12 Skills) — combat ueberspringt der Rundgang bewusst, s. Kopf.
  // Stand 24.08.: Das Lager war zuvor NUR Schritt der Feature-Tour v2, und die laeuft laut
  // App.tsx einmalig fuer Alt-Saves. Neue Spieler bekamen das Kernfeature also nie erklaert.
  { id: "sidebar.newhaven", guideId: "sidebar.newhaven", textKey: "onboarding.guide.sidebar.newhaven", requireAction: true },
  { id: "sidebar.woodcutting", guideId: "sidebar.woodcutting", textKey: "onboarding.guide.sidebarSkill.woodcutting", requireAction: true },
  { id: "sidebar.mining", guideId: "sidebar.mining", textKey: "onboarding.guide.sidebarSkill.mining", requireAction: true },
  { id: "sidebar.fishing", guideId: "sidebar.fishing", textKey: "onboarding.guide.sidebarSkill.fishing", requireAction: true },
  { id: "sidebar.smithing", guideId: "sidebar.smithing", textKey: "onboarding.guide.sidebarSkill.smithing", requireAction: true },
  { id: "sidebar.cooking", guideId: "sidebar.cooking", textKey: "onboarding.guide.sidebarSkill.cooking", requireAction: true },
  { id: "sidebar.farming", guideId: "sidebar.farming", textKey: "onboarding.guide.sidebarSkill.farming", requireAction: true },
  { id: "sidebar.foraging", guideId: "sidebar.foraging", textKey: "onboarding.guide.sidebarSkill.foraging", requireAction: true },
  { id: "sidebar.thieving", guideId: "sidebar.thieving", textKey: "onboarding.guide.sidebarSkill.thieving", requireAction: true },
  { id: "sidebar.leatherworking", guideId: "sidebar.leatherworking", textKey: "onboarding.guide.sidebarSkill.leatherworking", requireAction: true },
  // Schneidern (Chef-Entscheid 28.08., Handwerk-Aufteilung) — direkt nach Handwerk, s.
  // navigation.ts.
  { id: "sidebar.tailoring", guideId: "sidebar.tailoring", textKey: "onboarding.guide.sidebarSkill.tailoring", requireAction: true },
  // claude:2026-10-24T19:40:00+02:00 — Bognerei (1.4.0 FK) direkt nach Schneidern, s. navigation.ts.
  { id: "sidebar.bowcraft", guideId: "sidebar.bowcraft", textKey: "onboarding.guide.sidebarSkill.bowcraft", requireAction: true },
  { id: "sidebar.jewelcrafting", guideId: "sidebar.jewelcrafting", textKey: "onboarding.guide.sidebarSkill.jewelcrafting", requireAction: true },
  { id: "sidebar.runecrafting", guideId: "sidebar.runecrafting", textKey: "onboarding.guide.sidebarSkill.runecrafting", requireAction: true },
  { id: "sidebar.herblore", guideId: "sidebar.herblore", textKey: "onboarding.guide.sidebarSkill.herblore", requireAction: true },

  // Warteschlange — bewusst NACH dem Skill-Block: hier hat der Spieler gerade die zwoelf
  // Quellen gesehen, die sie fuellen. Ziel ist der Rand-Tab von ActionQueuePanel.tsx
  // (data-guide-id="feature.queueExpand", unbedingt gerendert). Der Pflichtklick ist hier
  // kein Selbstzweck: das Panel startet eingeklappt (uiPrefs.getQueuePanelCollapsed liefert
  // ohne gespeicherten Wert true), der Klick klappt es auf UND persistiert das. Wie bei
  // New Haven war auch das bisher nur Feature-Tour-Stoff (v1) und damit Alt-Save-only.
  { id: "queue", guideId: "feature.queueExpand", textKey: "onboarding.guide.queue", requireAction: true },

  // ── Sidebar: Statistics + Options (Task #224 — von der Top Bar hierher verschoben) ─────────
  { id: "sidebar.stats", guideId: "sidebar.stats", textKey: "onboarding.guide.topbar.stats", requireAction: true },
  { id: "sidebar.options", guideId: "sidebar.options", textKey: "onboarding.guide.topbar.options", requireAction: true },

  // ── Aufgaben-Hub, bewusst als LETZTER Klick-Schritt (ceo-run-2026-07-14 Welle Y, Jorin-Fund):
  // der Rundgang endete zuvor auf der Options-Seite — ein Anti-Klimax, der Abschlusstext sagte
  // "starte jetzt einen Skill", ließ den Spieler aber vor Reglern stehen. Ein Klick auf "topbar.quests"
  // (data-guide-id existiert bereits, TopBar.tsx rendert jeden topBarPages-Eintrag automatisch damit)
  // navigiert zur Quests-Seite — bei einem frischen Charakter mit aktivem Kapitel 1 öffnet sie sich
  // dort automatisch auf dem Story-Tab (QuestsPage.tsx-Default), sodass der folgende Abschluss-
  // Schritt direkt über der Aschechronik-Bühne landet statt über den Optionen.
  { id: "topbar.quests", guideId: "topbar.quests", textKey: "onboarding.guide.topbar.quests", requireAction: true },

  { id: "interlude", guideId: null, textKey: "onboarding.guide.interlude" },
];

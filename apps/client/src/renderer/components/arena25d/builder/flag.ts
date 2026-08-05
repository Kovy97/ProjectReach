/**
 * Scene-Builder — Chef-Auftrag "Arena-Scene-Builder" (reaktiviert 2026-08-04, s. design/ für den
 * vollen Auftragstext): Dev-Werkzeug, mit dem der Chef 2D-Props FREI in der 3D-Arena platziert,
 * verschiebt, skaliert und rotiert — WYSIWYG im ECHTEN Renderer (nutzt exakt dieselben
 * Kamera-/Boden-/Kulissen-/Licht-Bausteine aus `../sceneEnvironment.ts` wie `Arena25DStage.tsx`,
 * s. dortiges Modul-JSDoc "Scene-Builder-Welle" für den Herkunfts-Hintergrund).
 *
 * Zugang (Chef-Vorgabe wörtlich): `localhost:5173/?sceneBuilder=<zoneId>`, ein eigener
 * Vollbild-Screen — GENAU EIN externer Berührungspunkt, `main.tsx` (s. Kommentar dort
 * "SCENE BUILDER MOUNT SWITCH"), analog zum bestehenden `ARENA25D MOUNT SWITCH` in
 * `CombatPage.tsx`. Der Builder läuft AUSSERHALB von `<App/>`/`<GameProvider/>`/`<I18nProvider/>` —
 * er braucht (und darf laut Auftrag "kein Engine-/GameState-Kontakt") kein GameState, keine
 * Spielersprache-Auswahl; UI-Texte sind bewusst direkt Deutsch (Chef-Werkzeug, nie an Spieler
 * ausgeliefert — s. README.md "Bundle-Beweis" für denselben Tree-Shaking-Vertrag, der diesen
 * kompletten Ordner in Produktions-Builds auf 0 Byte faltet).
 *
 * Zwei-Gates-Muster identisch zu `../flag.ts` `ARENA25D_SUPPORTED`: `import.meta.env.DEV` wird von
 * Vite in Produktions-Builds zur literalen Konstante `false` gefaltet — jeder davon abhängige
 * Codepfad (inkl. des `<SceneBuilderApp/>`-JSX-Zweigs in main.tsx) wird vom Minifier als toter Code
 * erkannt und entfernt (s. README.md "Bundle-Beweis" für die empirisch verifizierte Herleitung
 * desselben Mechanismus). Kein localStorage-Schalter nötig (anders als `../flag.ts`) — der
 * Scene-Builder ist bereits über den expliziten URL-Parameter selbst "opt-in genug", ein Kampf
 * kann nie versehentlich hineinrutschen (anders als der In-Kampf-Hotkey-Toggle für die
 * Kampf-Arena-Vorschau).
 *
 * DRITTES GATE (Chef-Auftrag 2026-08-05, Standalone-EXE — s. README.md "Standalone-EXE"):
 * `__SCENE_BUILDER_BUILD__` ist eine Vite-`define`-Konstante (electron.vite.config.ts), `true` NUR
 * im dedizierten `SCENE_BUILDER_BUILD=1`-Build (Skript `package:scenebuilder`, Ausgabe-Root
 * `out-scenebuilder/`, NIE `out/`). Im normalen Spieler-Build ist sie literal `false` —
 * `false || false` wird von esbuild/Rollup exakt wie bisher konstant gefaltet, der
 * Tree-Shaking-Vertrag (Builder = 0 Byte im Spieler-Bundle) bleibt unverändert bestehen
 * (empirisch per Bundle-Grep verifiziert, s. README.md).
 */

/** True in Dev-Builds ODER im dedizierten Scene-Builder-Standalone-Build — s. Modul-JSDoc. */
export const SCENE_BUILDER_SUPPORTED: boolean = import.meta.env.DEV || __SCENE_BUILDER_BUILD__;

/**
 * Liest `?sceneBuilder=<zoneId>` aus der URL (leerer Wert ⇒ `"pastures"`-Fallback), OHNE selbst
 * das `SCENE_BUILDER_SUPPORTED`-Gate zu kennen — bewusst eine SEPARATE Funktion, damit
 * `getSceneBuilderZoneId()` unten ein einzelnes `return COND ? A : B`-Statement bleibt (exakt
 * dieselbe Form wie `../flag.ts` `isArena25dActive`s `return ARENA25D_SUPPORTED && …`). Rollups
 * Tree-Shaking faltet einen literal-`false`-Ternary-Zweig zuverlässig weg (leert dadurch in
 * Produktions-Builds effektiv `<SceneBuilderApp/>`s gesamten Importzweig, s. README.md
 * "Bundle-Beweis" für denselben, dort bereits empirisch verifizierten Mechanismus) — das
 * funktioniert NUR, wenn die literal-`false`-Konstante DIREKT die Bedingung ist, nicht hinter
 * einem mehrzeiligen `if`/`try` innerhalb der aufgerufenen Funktion versteckt liegt (dort kann der
 * Bundler die Unerreichbarkeit nicht ohne echte Funktions-Inlining-Analyse beweisen).
 */
function readSceneBuilderParam(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has("sceneBuilder") ? params.get("sceneBuilder") || "pastures" : null;
  } catch {
    return null;
  }
}

/** `null` außerhalb von Dev-Builds (⇒ `main.tsx` mountet die normale `<App/>`) oder ohne den
 *  URL-Parameter. Sonst der gewünschte Start-Zonen-ID-String, s. `readSceneBuilderParam`. */
export function getSceneBuilderZoneId(): string | null {
  return SCENE_BUILDER_SUPPORTED ? readSceneBuilderParam() : null;
}

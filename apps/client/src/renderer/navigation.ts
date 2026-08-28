import type { SkillId } from "@hearthforge/shared";
import { TAVERN_ENABLED } from "@hearthforge/shared";

export type NavView =
  | "character"
  | "combat"
  | "skill"
  | "skills-overview"
  | "mastery"
  | "bestiary"
  | "achievements"
  | "quests"
  | "bank"
  | "shop"
  | "options"
  | "stats"
  | "placeholder"
  | "companions"
  | "enchanting"
  | "newhaven"
  | "tavern"
  | "mail";

export interface NavPage {
  id: string;
  label: string;
  icon: string;
  view: NavView;
  /** Nur für view === "skill". */
  skillId?: SkillId;
  /**
   * Wo diese Seite erscheint.
   * "topbar"  — nur in der horizontalen Top Bar.
   * "sidebar" — nur in der Sidebar.
   * "footer"  — nur als eigener Button im Sidebar-Footer (siehe SidebarFooter in
   *             Sidebar.tsx), nicht in der Sidebar-Nav-Liste und nicht in der Top Bar.
   * Default: "sidebar".
   */
  placement?: "topbar" | "sidebar" | "footer";
}

export interface NavSection {
  id: string;
  label: string;
  pages: NavPage[];
}

/**
 * Data-driven Navigation-Konfiguration. Alle Views sind hier registriert damit
 * findPage/Routing sie finden kann — wo eine Seite *erscheint* steuert `placement`.
 *
 * "topbar"  → horizontale Top Bar, nicht in der Sidebar.
 * (Default) → flache Sidebar-Liste, Combat + Skills + Dev Tools.
 */
export const navigation: NavSection[] = [
  {
    id: "hero",
    label: "nav.section.hero",
    pages: [
      { id: "character", label: "nav.character", icon: "🧙", view: "character", placement: "topbar" },
      { id: "companions", label: "nav.companions", icon: "🐾", view: "companions", placement: "topbar" },
    ],
  },
  {
    id: "combat",
    label: "nav.section.combat",
    pages: [
      // Task #274 (Chef-Wunsch): Skills-Overview zieht von der Top Bar in die Sidebar — Tausch
      // mit Quests, das jetzt in der Top Bar lebt (siehe city-Sektion unten + topBarPages).
      // Als erste Seite in der ersten sidebar-platzierten Sektion eingehängt, damit sie in der
      // flachen getSidebarPages()-Liste ganz oben landet, ÜBER Combat.
      { id: "skills-overview", label: "nav.skillsOverview", icon: "📚", view: "skills-overview" },
      { id: "combat", label: "nav.combat", icon: "⚔️", view: "combat" },
      // New Haven (0.3.0 „Das Lager", Task #361): die eigene Siedlung am Furt-Übergang. Bewusst
      // ein SIDEBAR-Eintrag (kein Top-Bar-Button) — die Top-Bar-Reihe ist voll, und das Lager ist
      // ein Ort zum Verweilen, kein Zwischendurch-Sprung. Der Name bleibt in allen sieben
      // Sprachen unübersetzt (Chef-Entscheid), s. i18n-Key `nav.newhaven`.
      // 1.0-Fix (18.08.): stand vorher am Ende der city-Sektion und lag damit bei 1920x1080 unter
      // der sichtbaren Kante der Navigationsliste (im gepackten Build gemessen: 275 px Ueberlauf,
      // Eintrag bei y=1204). Als Kernfeature des Lagers gehoert es nach oben, nicht hinter 14 Skills.
      { id: "newhaven", label: "nav.newhaven", icon: "⛺", view: "newhaven" },
      // Die Taverne (1.2.0 „Alive", taverne-spec-technik.md §6): direkt unter New Haven (Chef-
      // Vorgabe), eigener Sidebar-Eintrag. Emoji-Fallback 🍺 bis Miras `sidebaricon_tavern.webp`
      // liegt (Auto-Discovery, s. sidebarIcons.ts — kein Code-Eintrag nötig, sobald sie da ist).
      // Release-Schalter (1.1.2 ohne Taverne, 1.2.0 mit): Eintrag nur bei TAVERN_ENABLED.
      ...(TAVERN_ENABLED ? [{ id: "tavern", label: "nav.tavern", icon: "🍺", view: "tavern" as const }] : []),
      { id: "bestiary", label: "nav.bestiary", icon: "📖", view: "bestiary", placement: "topbar" },
    ],
  },
  {
    id: "skills",
    label: "nav.section.skills",
    pages: [
      { id: "mastery", label: "nav.mastery", icon: "★", view: "mastery", placement: "topbar" },
      { id: "woodcutting", label: "nav.woodcutting", icon: "🪓", view: "skill", skillId: "woodcutting" },
      { id: "mining", label: "nav.mining", icon: "⛏️", view: "skill", skillId: "mining" },
      { id: "fishing", label: "nav.fishing", icon: "🎣", view: "skill", skillId: "fishing" },
      // Jagen (1.2.0 „Fasern und Fallen", design/handwerk-fasern-jagen/spec-technik.md §4): direkt
      // hinter Angeln (Chef-Vorgabe) — Emoji-Fallback 🪤 bis Miras `sidebaricon_hunting.webp`
      // liegt (Auto-Discovery, s. sidebarIcons.ts — kein Code-Eintrag nötig, sobald sie da ist).
      { id: "hunting", label: "nav.hunting", icon: "🪤", view: "skill", skillId: "hunting" },
      { id: "smithing", label: "nav.smithing", icon: "🔨", view: "skill", skillId: "smithing" },
      { id: "cooking", label: "nav.cooking", icon: "🍳", view: "skill", skillId: "cooking" },
      { id: "farming", label: "nav.farming", icon: "🌾", view: "skill", skillId: "farming" },
      { id: "foraging", label: "nav.foraging", icon: "🌿", view: "skill", skillId: "foraging" },
      { id: "thieving", label: "nav.thieving", icon: "🗝️", view: "skill", skillId: "thieving" },
      { id: "leatherworking", label: "nav.leatherworking", icon: "🧵", view: "skill", skillId: "leatherworking" },
      // Schneidern (Chef-Entscheid 28.08.: Handwerk-Aufteilung, design/1.2.0-alive/… Weben/Stoff-
      // Roben/Umhänge) — direkt hinter Handwerk (Chef-Vorgabe). Emoji-Fallback 🪡 (Nadel, unter-
      // scheidbar vom Faden-Spulen-Icon 🧵 des Handwerks) bis Miras `sidebaricon_tailoring.webp`
      // liegt (Auto-Discovery, s. sidebarIcons.ts — kein Code-Eintrag nötig, sobald sie da ist).
      { id: "tailoring", label: "nav.tailoring", icon: "🪡", view: "skill", skillId: "tailoring" },
      { id: "jewelcrafting", label: "nav.jewelcrafting", icon: "💍", view: "skill", skillId: "jewelcrafting" },
      { id: "runecrafting", label: "nav.runecrafting", icon: "🔮", view: "skill", skillId: "runecrafting" },
      { id: "herblore", label: "nav.herblore", icon: "🧪", view: "skill", skillId: "herblore" },
      { id: "slayer", label: "nav.slayer", icon: "💀", view: "skill", skillId: "slayer" },
      // Enchanting direkt unter Slayer und über Shop (Chef-Wunsch).
      { id: "enchanting", label: "nav.enchanting", icon: "✦", view: "enchanting" },
    ],
  },
  {
    id: "city",
    label: "nav.section.city",
    pages: [
      // City-Map-Seite entfernt (Stadt stillgelegt, kein erreichbarer Eintrag mehr — siehe
      // CityPage-Löschung). Shop/Bank in die Top Bar hochgezogen (Task #224); Quests folgt
      // ihnen dorthin (Task #274, Tausch mit Skills-Overview → siehe combat-Sektion oben).
      { id: "shop",   label: "nav.shop",   icon: "🪙", view: "shop",   placement: "topbar" },
      { id: "bank",   label: "nav.bank",   icon: "🏦", view: "bank",   placement: "topbar" },
      { id: "quests", label: "nav.quests", icon: "📜", view: "quests", placement: "topbar" },
    ],
  },
  {
    id: "other",
    label: "nav.section.other",
    pages: [
      { id: "achievements", label: "nav.achievements", icon: "🏆", view: "achievements", placement: "topbar" },
      // Statistics in die Sidebar heruntergezogen (Task #224); Shop/Bank nehmen ihren
      // früheren Platz in der Top Bar ein.
      { id: "stats",   label: "nav.stats",   icon: "📊", view: "stats"   },
      // Postfach (SAVE_VERSION 71, WoW-artiger Überlauf-Puffer): eigener Footer-Button
      // ZWISCHEN Main Menu und Options (Chef-Vorgabe) — siehe SidebarFooter. Nur hier registriert,
      // damit findPage("mail") die Route auflöst; der Button selbst ist (wie Save/Main Menu/
      // Options/Quit) fest in SidebarFooter verdrahtet, nicht datengetrieben aus dieser Liste.
      { id: "mail",    label: "nav.mail",    icon: "✉️", view: "mail",    placement: "footer" },
      // Chef-Wunsch: Options raus aus der Sidebar-Nav-Liste, stattdessen eigener
      // Footer-Button (Save · Main Menu · Mail · Options · Quit) — siehe SidebarFooter.
      { id: "options", label: "nav.options", icon: "⚙️", view: "options", placement: "footer" },
    ],
  },
  // Dev-Tools (Item Browser / Zone Map Editor) aus der Sidebar entfernt (Chef-Wunsch).
];

/**
 * Geordnete Top-Bar-Einträge (in der vorgegebenen Reihenfolge):
 * Bestiary, Quests, Mastery, Character, Companions, Shop, Bank, Achievements.
 * (Task #224: Shop + Bank hoch in die Top Bar, Statistics + Options runter in die Sidebar.
 *  Task #274: Quests tauscht mit Skills-Overview — Quests hoch in die Top Bar an dessen alte
 *  Stelle, Skills-Overview runter in die Sidebar, ganz oben über Combat.)
 */
export const topBarPages: NavPage[] = [
  { id: "bestiary",        label: "nav.bestiary",       icon: "📖", view: "bestiary",        placement: "topbar" },
  { id: "quests",          label: "nav.quests",          icon: "📜", view: "quests",          placement: "topbar" },
  { id: "mastery",         label: "nav.mastery",         icon: "★",  view: "mastery",         placement: "topbar" },
  { id: "character",       label: "nav.character",       icon: "🧙", view: "character",       placement: "topbar" },
  { id: "companions",      label: "nav.companions",      icon: "🐾", view: "companions",      placement: "topbar" },
  // Stadt (City-Map) auf Eis — kein eigener Top-Bar-Button, aber Shop/Bank ziehen an ihre Stelle.
  { id: "shop",            label: "nav.shop",            icon: "🪙", view: "shop",            placement: "topbar" },
  { id: "bank",            label: "nav.bank",            icon: "🏦", view: "bank",            placement: "topbar" },
  { id: "achievements",    label: "nav.achievements",    icon: "🏆", view: "achievements",    placement: "topbar" },
];

/** Sucht eine Seite über alle Sektionen hinweg (inkl. Top Bar und City-only). */
export function findPage(id: string): NavPage | undefined {
  for (const section of navigation) {
    const page = section.pages.find((p) => p.id === id);
    if (page) return page;
  }
  return undefined;
}

/**
 * Gibt die flache Sidebar-Seiten-Liste zurück:
 * nur Seiten ohne placement (default = sidebar) oder placement === "sidebar".
 * Reihenfolge: Skills-Overview → Combat → alle Skills (Task #274: Skills-Overview zog ganz nach
 * oben, siehe combat-Sektion oben).
 * Keine Sections, kein Collapse.
 */
export function getSidebarPages(): NavPage[] {
  const pages: NavPage[] = [];
  for (const section of navigation) {
    for (const page of section.pages) {
      if (!page.placement || page.placement === "sidebar") {
        pages.push(page);
      }
    }
  }
  return pages;
}

/**
 * Taverne (1.2.0, taverne-spec-technik.md §6): die Anschlagtafel in der Taverne soll auf der
 * Quests-Seite gezielt den Daily-Reiter öffnen — die Navigation selbst kennt aber keinen
 * Reiter-Parameter (`onNavigate` nimmt nur eine Seiten-ID). Statt die ganze Routing-Architektur
 * umzubauen, ein winziger einmaliger Bus (Muster util/toastBus.ts): der Klick-Handler setzt den
 * gewünschten Reiter UNMITTELBAR vor `onNavigate("quests")`, QuestsPage liest ihn einmalig in
 * ihrem `tab`-Lazy-Initializer und verwirft ihn danach. Jede andere Navigation zur Quests-Seite
 * (Sidebar/TopBar-Klick) ruft `consumeRequestedQuestsTab` nie auf — die bestehende Vorauswahl
 * (aktives Chronik-Kapitel → "chronicle", sonst "daily") bleibt für sie unverändert.
 */
export type QuestNavTab = "chronicle" | "contracts" | "daily" | "shop";
let pendingQuestsTab: QuestNavTab | null = null;
/** Von jeder Seite aus aufrufbar, direkt vor `onNavigate("quests")`. */
export function requestQuestsTab(tab: QuestNavTab): void {
  pendingQuestsTab = tab;
}
/** QuestsPage liest dies EINMAL beim eigenen Mount (Lazy-Initializer) und verwirft es sofort. */
export function consumeRequestedQuestsTab(): QuestNavTab | null {
  const tab = pendingQuestsTab;
  pendingQuestsTab = null;
  return tab;
}

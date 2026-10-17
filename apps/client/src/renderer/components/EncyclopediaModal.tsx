import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { content } from "@hearthforge/content";
import { getItemRarity } from "@hearthforge/shared";
import { getItemImage, rarityClass, rarityRank, FILTER_CATEGORIES, filterCategoryOf, itemMatchesSearch, type FilterCategory } from "../items";
import { useI18n } from "../i18n";
import { getUiIcon } from "../uiIcons";
import { registerEscCloser } from "../util/escStack";
import { openItemWikiModal } from "./ItemWikiModal";

/**
 * ENZYKLOPÄDIE (Chef-Auftrag 31.08.2026, Konzept + Mockup in design/enzyklopaedie/).
 *
 * Ein fast bildschirmgroßes Nachschlagewerk über ALLE Items: Kategorien links, Suche oben, Karten
 * rechts. Erreichbar über das große Fragezeichen ganz rechts in der Top Bar.
 *
 * GRUNDSATZ — das hier ist ein INDEX, kein zweites Wiki. Es rendert keine Item-Details; ein Klick
 * auf eine Karte ruft `openItemWikiModal(itemId)`, dasselbe Modal, das der „?"-Knopf im Tooltip
 * schon öffnet. Die Enzyklopädie bleibt darunter GEMOUNTET (escStack erlaubt mehrere „modal"-
 * Overlays, LIFO): Escape schließt zuerst das Wiki, und Suchtext, Kategorie und Scrollposition
 * stehen unverändert wieder da. Dafür ist kein eigener Rettungs-State nötig.
 *
 * OFFENES NACHSCHLAGEWERK (Chef-Entscheid 31.08.2026): Hier ist NICHTS verschlossen. Jeder
 * Eintrag zeigt Bild, Namen und Seltenheit, egal ob der Spieler das Stück je besessen hat, und
 * jeder führt ins Item-Wiki. Ein erster Bau maskierte unentdeckte Einträge (Silhouette, „???") —
 * das passte weder zum Wiki dahinter, das ohnehin jedes Item vollständig zeigt, noch zum Zweck
 * eines Nachschlagewerks: man schlägt gerade das nach, was man noch NICHT hat.
 *
 * Folge davon: Diese Komponente liest den Spielstand überhaupt nicht. Kein Abo, keine Kopplung an
 * den 10-Hz-Takt, nichts, was beim Tick neu rendert — der ganze Inhalt kommt aus dem statischen
 * Content-Katalog.
 */

// ── Katalog: einmal beim Modul-Laden, `content` ändert sich zur Laufzeit nie ────────────────
// (Muster ShopPage.SHOP_BY_CATEGORY / CombatPage.MONSTER_SELECT_MONSTERS.)

/**
 * Grundreihenfolge: Seltenheit aufsteigend, bei Gleichstand nach Wert, dann Id — bewusst NICHT
 * alphabetisch. Ein alphabetischer Katalog würde bei einem maskierten Eintrag seine Position im
 * Alphabet verraten („fängt mit A bis C an"), obwohl der Name verdeckt bleibt. Nach Seltenheit
 * liest sich die Liste außerdem wie ein echtes Nachschlagewerk: das einfache Zeug zuerst, die
 * großen Stücke zum Schluss.
 */
const KATALOG: string[] = Object.values(content.items)
  .map((item) => item.id)
  .sort((a, b) => {
    const ra = rarityRank(getItemRarity(content.items[a]!));
    const rb = rarityRank(getItemRarity(content.items[b]!));
    if (ra !== rb) return ra - rb;
    const va = content.items[a]!.value ?? 0;
    const vb = content.items[b]!.value ?? 0;
    if (va !== vb) return va - vb;
    return a.localeCompare(b);
  });

/** Kategorie je Item — einmal vorberechnet, statt bei jedem Tastendruck neu abzuleiten. */
const KATEGORIE_VON: Map<string, FilterCategory> = new Map(
  KATALOG.map((id) => [id, filterCategoryOf(id)]),
);

/** Emoji-Rückfall für die Kategorie-Zeilen (dieselben Leit-Items wie die Filter-Chips). */
const KATEGORIE_ICON: Record<Exclude<FilterCategory, "all">, string> = {
  weapons: "⚔️",
  armor: "🛡️",
  tools: "⛏️",
  food: "🍗",
  potions: "🧪",
  materials: "🪵",
};

// ── Store: von überall öffenbar, ohne Kontext-Kette (Muster ItemWikiModal) ──────────────────
let offen = false;
const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
const store = {
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: (): boolean => offen,
};

export function openEncyclopediaModal(): void {
  if (offen) return;
  offen = true;
  emit();
}

export function closeEncyclopediaModal(): void {
  if (!offen) return;
  offen = false;
  emit();
}

/**
 * Eine Item-Karte. Reine Anzeige aus dem Content-Katalog — kein Spielstand, keine Bedingung.
 * Ein Klick führt ins Item-Wiki, das dieselben Einträge ohnehin ungefiltert zeigt.
 */
function ItemCard({ itemId }: { itemId: string }): JSX.Element {
  const { tr } = useI18n();
  const item = content.items[itemId]!;
  const bild = getItemImage(itemId);

  return (
    <button
      type="button"
      className={`encp-card ${rarityClass(getItemRarity(item))}`}
      onClick={() => openItemWikiModal(itemId)}
      title={tr(item.name)}
    >
      <span className="encp-card-img-area">
        {bild
          ? <img loading="lazy" decoding="async" src={bild} alt="" />
          : <span className="encp-card-emoji" aria-hidden="true">{item.icon}</span>}
      </span>
      <span className="encp-card-name">{tr(item.name)}</span>
    </button>
  );
}

/**
 * Einmalig in App montiert (neben `ItemTooltipOverlay`/`ItemWikiModalOverlay`).
 *
 * Reihenfolge der Filterung: erst Kategorie, dann Suche, dann rendern — dieselbe Kette wie in
 * Bank und Inventar. Die Zahlen im Register zeigen dabei die GEFILTERTEN Treffer, nicht die
 * Gesamtgröße der Kategorie: wer „schwert" tippt, sieht sofort, in welcher Kategorie etwas liegt.
 * Der Suchtext bleibt beim Kategoriewechsel stehen — die Suche springt nicht aus der Kategorie
 * heraus, sie arbeitet in ihr.
 */
export function EncyclopediaModalOverlay(): JSX.Element | null {
  const sichtbar = useSyncExternalStore(store.subscribe, store.get);

  // Escape über die zentrale Registry, nicht über einen eigenen Listener (Muster ItemWikiModal).
  // Ein darüber liegendes Item-Wiki schließt zuerst — beide sind "modal", die Registry arbeitet
  // innerhalb einer Stufe von hinten nach vorne.
  useEffect(() => {
    if (!sichtbar) return;
    return registerEscCloser("modal", closeEncyclopediaModal);
  }, [sichtbar]);

  // Der Rumpf ist bewusst eine EIGENE Komponente, die nur im offenen Zustand überhaupt entsteht:
  // so setzt der Wechsel „geschlossen → offen" Suche und Kategorie ganz ohne Effekt zurück — eine
  // neu gemountete Komponente startet von selbst mit ihren Anfangswerten. Diese Hülle hier ist von
  // App aus IMMER montiert, auch im Hauptmenü, und tut dort nichts.
  if (!sichtbar) return null;
  return <EncyclopediaBody />;
}

function EncyclopediaBody(): JSX.Element {
  const { t, tr, locale } = useI18n();
  const [suche, setSuche] = useState("");
  const [kategorie, setKategorie] = useState<FilterCategory>("all");

  // Suchtreffer über den GANZEN Katalog — daraus fallen die Zahlen je Kategorie und die aktuelle
  // Auswahl gleichermaßen ab, ohne zweimal zu filtern. `locale` steht bewusst in den Abhängigkeiten:
  // gesucht wird im lokalisierten Namen, ein Sprachwechsel muss die Treffer neu bewerten.
  const { treffer, zahlen } = useMemo(() => {
    const zahlen: Record<string, number> = { all: 0 };
    for (const cat of FILTER_CATEGORIES) zahlen[cat] = 0;
    const treffer: string[] = [];
    for (const id of KATALOG) {
      if (!itemMatchesSearch(id, suche, tr)) continue;
      const cat = KATEGORIE_VON.get(id)!;
      zahlen.all = (zahlen.all ?? 0) + 1;
      zahlen[cat] = (zahlen[cat] ?? 0) + 1;
      if (kategorie === "all" || cat === kategorie) treffer.push(id);
    }
    return { treffer, zahlen };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tr` ist an `locale` gebunden
  }, [suche, kategorie, locale]);

  const lupe = getUiIcon("icon_ach_search");
  const kategorien: FilterCategory[] = ["all", ...FILTER_CATEGORIES];

  return (
    <div className="modal-overlay encp-overlay" onClick={closeEncyclopediaModal}>
      <div className="modal encp-modal" onClick={(e) => e.stopPropagation()}>
        <header className="encp-titlebar">
          {/* Linke Spalte bleibt leer: es gibt keine interne Historie, also auch kein „Zurück".
              Sie existiert trotzdem, damit der Kicker wirklich mittig sitzt (Muster iwk-titlebar). */}
          <div className="encp-titlebar-side" />
          <div className="encp-kicker">{t("encyclopedia.kicker")}</div>
          <div className="encp-titlebar-side encp-titlebar-side--end">
            <button
              type="button"
              className="modal-close ds-close-button"
              onClick={closeEncyclopediaModal}
              aria-label={t("common.close")}
            />
          </div>
        </header>

        <div className="encp-search-row">
          {lupe
            ? <img loading="lazy" decoding="async" src={lupe} alt="" />
            : <span aria-hidden="true">🔍</span>}
          <input
            type="text"
            value={suche}
            autoFocus
            onChange={(e) => setSuche(e.target.value)}
            placeholder={t("encyclopedia.searchPlaceholder")}
            aria-label={t("encyclopedia.searchPlaceholder")}
          />
          <span className="encp-result-count">
            {t("encyclopedia.resultCount")
              .replace("{n}", String(treffer.length))
              .replace("{total}", String(KATALOG.length))}
          </span>
        </div>

        <div className="encp-stage">
          <nav className="encp-rail" aria-label={t("encyclopedia.categoriesAria")}>
            {kategorien.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`encp-cat${cat === kategorie ? " is-active" : ""}`}
                onClick={() => setKategorie(cat)}
              >
                <span className="encp-cat-icon" aria-hidden="true">
                  {cat === "all" ? "◆" : KATEGORIE_ICON[cat]}
                </span>
                <span className="encp-cat-label">{t(`inv.filter.${cat}`)}</span>
                <span className="encp-cat-count">{zahlen[cat] ?? 0}</span>
              </button>
            ))}
          </nav>

          <div className="encp-grid-wrap">
            <div className="encp-grid">
              {treffer.length === 0 ? (
                <div className="encp-empty">
                  <span>{t("encyclopedia.noResults")}</span>
                  <button type="button" className="btn-iron btn-iron--sm" onClick={() => setSuche("")}>
                    {t("encyclopedia.clearSearch")}
                  </button>
                </div>
              ) : (
                treffer.map((id) => <ItemCard key={id} itemId={id} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

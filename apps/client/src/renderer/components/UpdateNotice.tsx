import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import emblWaxseal from "../assets/ui/emblem_waxseal.svg";

/**
 * „Was ist neu" — ein einmaliger Hinweis nach einem Update.
 *
 * Warum es das gibt (Chef-Auftrag 23.08.2026): Wenn ein Patch etwas am Spielstand des Spielers
 * VERÄNDERT, darf er das nicht stillschweigend tun. Der Anlass war der Zweihand-Fix an den Bögen:
 * wer mit Bogen und Schild unterwegs war, findet sein Schild plötzlich im Gepäck statt am Arm —
 * ohne Erklärung ist das ein Bug-Report, kein Fix. Dieselbe Lektion hatten wir eine Woche vorher
 * schon mit dem verschobenen New-Haven-Eintrag („The New Haven disappeared").
 *
 * Mechanik bewusst ohne Save-Feld: gezeigt wird der Hinweis genau einmal je Programmversion,
 * gemerkt in `localStorage`. Ein Spielstand ist davon völlig unberührt (kein SAVE_VERSION-Bump,
 * keine Migration), und wer das Spiel neu installiert, sieht ihn schlimmstenfalls ein zweites Mal.
 *
 * Der Abschnitt zum Schild erscheint NUR, wenn dieser Spieler wirklich betroffen war. Erkennbar
 * ist das am Brief, den die Ladelogik in genau diesem Fall ins Postfach legt
 * (`persistence/index.ts`, Zweihand-Invariante) — kein zweiter Merker nötig, und der Text lügt
 * niemanden an, dem gar nichts weggenommen wurde.
 */
const SHIELD_LETTER_KEY = "mail.letter.warden.twoHandedRanged";

function speicherSchluessel(): string {
  return `gr.updateNotice.${__APP_VERSION__}`;
}

function schonGesehen(): boolean {
  try {
    // `…suppress` ist ausschließlich für den Mess-Harness (ui-audit/sim-harness.mjs) da: der
    // Hinweis legt sich sonst über JEDE aufgenommene Szene und schluckt den ersten Klick, der
    // die Szene ansteuern soll — der Lauf vermisst dann das Popup statt der Seite. Wegklicken
    // reicht nicht, weil der Klick schon verloren ist; er darf dort gar nicht erst erscheinen.
    // Im ausgelieferten Spiel setzt diesen Schlüssel niemand.
    if (localStorage.getItem("gr.updateNotice.suppress") === "1") return true;
    return localStorage.getItem(speicherSchluessel()) === "1";
  } catch {
    // Privater Modus/gesperrter Speicher: dann lieber einmal zu viel zeigen als abstürzen.
    return false;
  }
}

function merken(): void {
  try {
    localStorage.setItem(speicherSchluessel(), "1");
  } catch {
    /* kein Speicher verfügbar — der Hinweis erscheint beim nächsten Start erneut, das ist ok */
  }
}

export function UpdateNotice(): JSX.Element | null {
  const state = useGameState();
  const { t } = useI18n();
  const [offen, setOffen] = useState(false);

  const schildBetroffen = (state.mailbox ?? []).some(
    (m) => m.kind === "letter" && m.textKey === SHIELD_LETTER_KEY,
  );

  useEffect(() => {
    if (schonGesehen()) return;
    // Ein Patch-Hinweis richtet sich an jemanden, der die Vorversion gespielt hat. Wer den
    // Rundgang noch vor sich hat (`onboarding.done === false`; Alt-Saves migrieren auf `true`),
    // hat kein „vorher": Der Text erzaehlte ihm von einem Schild, das er nie getragen hat, und
    // von einem New-Haven-Umzug, den er nie erlebt hat. Schlimmer noch, das Overlay legte sich
    // ueber den Rundgang und schluckte dessen ersten Pflichtklick — dieselbe Wirkung, die weiter
    // oben schon fuer den Mess-Harness abgefangen ist, nur eben beim echten Spieler.
    // Gemessen mit ui-audit/onboarding-tour-285.mjs (Abbruch bei Schritt 1, „modal-overlay
    // intercepts pointer events"). Gleich als gesehen merken, sonst holt der Hinweis den
    // Neuling beim naechsten Start ein.
    // Ausnahme: Wem der Zweihand-Fix wirklich das Schild abgenommen hat (Brief im Postfach),
    // der bekommt die Erklaerung IMMER — auch mitten im Rundgang.
    if (!state.onboarding.done && !schildBetroffen) {
      merken();
      return;
    }
    setOffen(true);
    // Absichtlich einmalig beim Mounten: der Hinweis soll nicht spaeter im Spiel aufpoppen,
    // wenn sich `onboarding.done` oder das Postfach aendert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!offen) return null;

  const schliessen = (): void => {
    merken();
    setOffen(false);
  };

  // Die Punkte kommen als nummerierte Schlüssel; fehlt einer, hört die Liste dort auf. So braucht
  // ein künftiger Patch nur neue Texte, keinen Code.
  // Chef 30.08.2026: keine langen Patchnotes mehr im Spiel. Der Hinweis ist ab jetzt EIN Satz, der auf
  // die Steam-Seite verweist — die `updateNotice.pointN`-Schluessel werden bewusst nicht mehr gelesen.
  // Anlass war ein Steam-Deck-Report: die lange Liste schob den Schliessen-Knopf aus dem 800px-Bild,
  // der Spieler kam nicht mehr ins Spiel. Gegen genau das schuetzt zusaetzlich die Hoehengrenze in
  // modals.css (.update-notice-modal: max-height + overflow-y), damit der Knopf strukturell nie mehr
  // ausserhalb des Bildschirms liegen kann.

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal update-notice-modal">
        <div className="update-notice-icon">
          <img loading="lazy" decoding="async" src={emblWaxseal} alt="" className="pixelart" />
        </div>
        <h2 className="update-notice-title">
          {t("updateNotice.title").replace("{version}", __APP_VERSION__)}
        </h2>
        <p className="update-notice-intro">{t("updateNotice.intro")}</p>
        {schildBetroffen && (
          <p className="update-notice-shield">{t("updateNotice.shield")}</p>
        )}
        <div className="update-notice-actions">
          <button className="btn-iron" onClick={schliessen}>
            {t("updateNotice.close")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

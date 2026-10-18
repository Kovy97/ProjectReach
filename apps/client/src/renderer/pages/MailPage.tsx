import { useRef, useState } from "react";
import { content } from "@hearthforge/content";
import { collectAllMail, collectMail, mailCollectBlocked } from "@hearthforge/engine";
import type { MailCollectBlockReason } from "@hearthforge/engine";
import type { MailLetterSender, MailMessage } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getPortrait } from "../portraits";
import { ItemCell } from "../components/ItemCell";
import { CrossSaveTransferModal } from "../components/CrossSaveTransferModal";
import emblWaxseal from "../assets/ui/emblem_waxseal.svg";
// Mira-Set 2026-08-03 (Gap-Sweep Priorität A) — löst das ✉-Zeichen ab (Nicht-Brief-Zeilen +
// leeres Postfach); direkter Modul-Import wie emblWaxseal oben, gleiches Hausmuster dieser Datei.
import iconMail from "../assets/icons/icon_sys_mail.webp";
import "../styles/mail.css";

/**
 * Postfach/Mailbox-UI (WoW-artig, s. packages/engine/src/mail.ts): zeigt `state.mailbox`
 * (höchstens EINE stehende `kind:"overflow"`-Mail, Jagd-Paket-`letter` von Brenna/dem Wächter und
 * seit SAVE 88 `transfer`-Fracht anderer lokaler Spielstände; codex:2026-08-31T23:22:00+02:00)
 * als anklickbare Liste
 * links + geöffnete Nachricht mit Anhänge-Grid rechts. Bewusst generisch über MEHRERE Mails
 * gebaut (nicht auf "genau 1" hartkodiert) — die Engine reserviert sich das Recht auf weitere
 * `kind`s, ohne dass diese Seite dafür umgebaut werden müsste.
 */

/** Absender-Steckbrief je `letter.from` (Jagd-Paket Task 4): Porträt (falls das PNG existiert,
 *  sonst Wachssiegel-Fallback im Markup unten) + der jeweils bereits bestehende NPC-Namens-Key
 *  (dieselbe Quelle wie die Speaking-Head-Begrüßung auf SlayerPage/QuestsPage — KEIN zweiter,
 *  abweichender Name für dieselbe Figur). */
const MAIL_SENDER_INFO: Record<MailLetterSender, { portraitId: string; nameKey: string }> = {
  brenna: { portraitId: "slayermaster_brenna_ashwick", nameKey: "npc.slayer.name" },
  warden: { portraitId: "npc_warden", nameKey: "npc.quests.name" },
};

function mailSenderName(from: MailLetterSender, t: (k: string) => string): string {
  return t(MAIL_SENDER_INFO[from].nameKey);
}

/** Betreffzeile je Mail-Art. */
function mailSubject(mail: MailMessage, t: (k: string) => string): string {
  switch (mail.kind) {
    case "letter":
      return t("mail.subject.letter").replace("{name}", mailSenderName(mail.from, t));
    // codex:2026-08-31T22:38:00+02:00 — Cross-Save-Fracht zeigt den echten Absendersave.
    case "transfer":
      return t("mail.subject.transfer").replace("{name}", mail.fromSaveName);
    case "overflow":
    default:
      return t("mail.subject.overflow");
  }
}

/** Gesamtzahl der Einheiten in dieser EINEN Mail (Item-qty-Summe + Instanzen), fürs Listen-
 *  Meta und den Detail-Kopf. Briefe tragen ihr optionales Geschenk (Jagd-Paket Task 4) in
 *  DENSELBEN Feldern wie eine Überlauf-Mail (s. `MailMessage`-JSDoc — kein separates Anhang-
 *  Feld), diese Funktion bleibt daher unverändert kind-generisch. */
function mailUnitCount(mail: MailMessage): number {
  return mail.items.reduce((sum, a) => sum + a.qty, 0) + mail.instances.length;
}

function MailRow({
  mail,
  active,
  onClick,
  t,
  blocked,
}: {
  mail: MailMessage;
  active: boolean;
  onClick: () => void;
  t: (k: string) => string;
  /** claude:2026-10-18T14:00:00+02:00 — Sperrgrund (Prestige): die Zeile trägt einen Schloss-Hinweis. */
  blocked?: MailCollectBlockReason | null;
}): JSX.Element {
  return (
    <button
      type="button"
      className={`mail-row${active ? " mail-row--active" : ""}${mail.kind === "letter" ? " mail-row--letter" : ""}${mail.kind === "transfer" ? " mail-row--transfer" : ""}`}
      onClick={onClick}
    >
      {/* Wachssiegel-Optik für Briefe (Jagd-Paket Task 4) statt des generischen Umschlags. */}
      <span className="mail-row-icon" aria-hidden="true">
        {mail.kind === "letter" ? (
          <img src={emblWaxseal} alt="" className="mail-row-icon-img" />
        ) : (
          <img src={iconMail} alt="" className="mail-row-icon-img" />
        )}
      </span>
      <span className="mail-row-main">
        <span className="mail-row-subject">{mailSubject(mail, t)}</span>
        <span className="mail-row-meta muted">
          {t("mail.parcelLabel").replace("{n}", String(mail.createdSeq))}
          {mailUnitCount(mail) > 0 && (
            <>
              {" · "}
              {t("mail.itemCount").replace("{n}", String(mailUnitCount(mail)))}
            </>
          )}
          {blocked && <span className="mail-row-lock"> · {t("mail.blocked.badge")}</span>}
        </span>
      </span>
    </button>
  );
}

function MailDetail({
  mail,
  onCollect,
  t,
  blocked,
}: {
  mail: MailMessage;
  onCollect: () => void;
  t: (k: string) => string;
  /** claude:2026-10-18T14:00:00+02:00 — Sperrgrund (Prestige `prestige_locked`): Abholen ist gesperrt, nichts geht verloren. */
  blocked?: MailCollectBlockReason | null;
}): JSX.Element {
  const hasAttachments = mailUnitCount(mail) > 0;
  return (
    <div className={`mail-detail-panel shop-panel${mail.kind === "letter" ? " mail-detail-panel--letter" : ""}`}>
      {/* Raben-Post-Darstellung (Jagd-Paket Task 4): Absender-Zeile (Porträt + Name) + Brieftext
          via t(textKey) — Wachssiegel-/Pergament-Optik statt der schlichten Betreffzeile. Die
          Brief-TEXTE selbst liefert lore-dev separat (s. translations.ts-Kommentar bei den zwei
          Platzhalter-Keys); hier wird nur GERENDERT, was unter `textKey` liegt. */}
      {mail.kind === "letter" ? (
        <div className="mail-letter-sender">
          {(() => {
            const portraitUrl = getPortrait(MAIL_SENDER_INFO[mail.from].portraitId);
            return portraitUrl ? (
              <img loading="lazy" decoding="async" src={portraitUrl} alt="" className="pixelart mail-letter-sender-portrait" />
            ) : (
              <img src={emblWaxseal} alt="" className="mail-letter-sender-sealfallback" />
            );
          })()}
          <span className="mail-letter-sender-name">{mailSenderName(mail.from, t)}</span>
        </div>
      ) : (
        <div className="mail-detail-head">
          <div className="mail-detail-headtext">
            <span className="mail-detail-subject">{mailSubject(mail, t)}</span>
            <span className="mail-detail-meta muted">
              {t("mail.parcelLabel").replace("{n}", String(mail.createdSeq))}
              {" · "}
              {t("mail.itemCount").replace("{n}", String(mailUnitCount(mail)))}
            </span>
          </div>
          <button type="button" className="shop-citadel-btn" onClick={onCollect} disabled={!!blocked} title={blocked ? t(`mail.blocked.${blocked}`) : undefined}>
            {t("mail.collectOne")}
          </button>
        </div>
      )}
      {mail.kind === "letter" && (
        <p className="mail-letter-body">{t(mail.textKey)}</p>
      )}
      {/* Anhänge (Jagd-Paket Task 4: "wie bestehende Mail-Items einsammelbar" — derselbe
          ItemCell-Baustein wie bei Überlauf-Post) — bei einem reinen Flavor-Brief ohne Geschenk
          (z.B. der Wächter-Brief) bleibt der ganze Block weg statt einer leeren gestrichelten Box.
          Briefe tragen ihr optionales Geschenk in DENSELBEN `items`/`instances`-Feldern wie eine
          Überlauf-Mail (s. `MailMessage`-JSDoc) und zeigen den Sammeln-Button hier direkt über dem
          Grid (der Kopf trägt bei ihnen schon die Absender-Zeile, keinen zweiten); Überlauf-Post
          behält ihren Button im bestehenden Kopf oben. */}
      {blocked && hasAttachments && (
        <p className="mail-blocked-note" role="status">{t(`mail.blocked.${blocked}`)}</p>
      )}
      {hasAttachments && (
        <>
          {mail.kind === "letter" ? (
            <div className="mail-letter-attach-head">
              <span className="mail-attachments-label">{t("mail.attachments")}</span>
              <button type="button" className="shop-citadel-btn shop-citadel-btn--sm" onClick={onCollect} disabled={!!blocked} title={blocked ? t(`mail.blocked.${blocked}`) : undefined}>
                {t("mail.collectOne")}
              </button>
            </div>
          ) : (
            <div className="mail-attachments-label">{t("mail.attachments")}</div>
          )}
          <div className="mail-attachments-grid cs-inv-grid">
            {mail.items.map((att) => (
              <ItemCell key={`item:${att.itemId}`} itemId={att.itemId} qty={att.qty} className="inv-slot filled" />
            ))}
            {mail.instances.map((inst) => (
              <ItemCell
                key={`inst:${inst.instanceId}`}
                itemId={inst.baseItemId}
                instance={inst}
                className="inv-slot filled"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function MailPage(): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  const mailbox = state.mailbox ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  // Fällt automatisch auf die erste Mail zurück, sobald die zuletzt ausgewählte ID nicht (mehr)
  // existiert — z.B. direkt nach dem Öffnen (noch keine Auswahl) oder nachdem `collectMail` die
  // ausgewählte Mail vollständig geleert und damit aus `state.mailbox` entfernt hat.
  const selected = mailbox.find((m) => m.id === selectedId) ?? mailbox[0] ?? null;

  const flashNotice = (text: string): void => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setNotice(text);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 4000);
  };
  const flashPartialNotice = (): void => flashNotice(t("mail.partialNotice"));
  // claude:2026-10-18T14:00:00+02:00 — Sperrhinweis statt „Inventar voll": `blocked` kommt aus collectMail/collectAllMail.
  const flashBlockedNotice = (code: MailCollectBlockReason): void => flashNotice(t(`mail.blocked.${code}`));

  // codex:2026-08-31T22:38:00+02:00 — Versand ist auch bei leerem Postfach erreichbar; der alte
  // Early-Return hätte das wichtigste neue Verb ausgerechnet im normalen Leerzustand versteckt.
  return (
    <div className="mail-page">
      {notice && <div className="mail-notice" role="status">{notice}</div>}
      <div className="mail-page-actions">
        <div>
          {/* claude:2026-10-17T13:10:00+02:00 — Titel nur ohne Liste; sonst stand „Postfach“ doppelt
              (hier + Listenkopf direkt darunter). */}
          {mailbox.length === 0 && <span className="mail-list-title">{t("mail.list.title")}</span>}
          <span className="mail-page-actions-note">{t("mail.transfer.pageNote")}</span>
        </div>
        <button type="button" className="shop-citadel-btn" onClick={() => setTransferOpen(true)}>
          {t("mail.transfer.open")}
        </button>
      </div>
      {mailbox.length === 0 ? (
        <div className="mail-empty shop-panel">
          <span className="mail-empty-icon" aria-hidden="true">
            <img src={iconMail} alt="" className="ui-icon" />
          </span>
          <p className="muted">{t("mail.empty")}</p>
        </div>
      ) : (
        <div className="mail-layout">
          <aside className="mail-list shop-panel">
            <div className="mail-list-head">
              <span className="mail-list-title">{t("mail.list.title")}</span>
              <button
                type="button"
                className="shop-citadel-btn shop-citadel-btn--sm"
                onClick={() => {
                  const res = collectAllMail(state, content);
                  if (res.blocked) flashBlockedNotice(res.blocked);
                  else if (res.partial) flashPartialNotice();
                }}
              >
                {t("mail.collectAll")}
              </button>
            </div>
            <div className="mail-list-rows">
              {mailbox.map((mail) => (
                <MailRow
                  key={mail.id}
                  mail={mail}
                  active={mail.id === selected?.id}
                  onClick={() => setSelectedId(mail.id)}
                  t={t}
                  blocked={mailUnitCount(mail) > 0 ? mailCollectBlocked(state, content, mail) : null}
                />
              ))}
            </div>
          </aside>
          <section className="mail-detail">
            {selected && (
              <MailDetail
                mail={selected}
                t={t}
                blocked={mailCollectBlocked(state, content, selected)}
                onCollect={() => {
                  const res = collectMail(state, content, selected.id);
                  if (res.blocked) flashBlockedNotice(res.blocked);
                  else if (res.partial) flashPartialNotice();
                }}
              />
            )}
          </section>
        </div>
      )}
      {transferOpen && <CrossSaveTransferModal onClose={() => setTransferOpen(false)} />}
    </div>
  );
}

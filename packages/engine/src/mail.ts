import type {
  ContentDB,
  GameState,
  ItemId,
  ItemInstance,
  MailAttachment,
  MailLetterSender,
  MailMessage,
} from "@hearthforge/shared";
import { addInstance, addInstanceOrBank, addItem, addItemOrBank, markItemDiscovered } from "./inventory";

/**
 * Postfach / Mailbox (SAVE_VERSION 71): Überlauf-Puffer für vollen Inventar (WoW-artig).
 *
 * Wenn beim Sammeln/Crafting ein Loot-/Output-Item weder ins Inventar noch (bei Auto-Bank) ins
 * Lager passt, wandert es hier hinein (statt die Aktion zu stoppen oder verloren zu gehen). Die
 * Aktion LÄUFT WEITER. Items werden GESTAFFELT: es entsteht EINE stehende `kind:"overflow"`-Mail,
 * in der stackbarer Loot per itemId zusammengefasst und Instanzen als Liste gesammelt werden
 * (find-or-create). Erst wenn eine Mail vollständig abgeholt ist, verschwindet sie; neuer Überlauf
 * legt bei Bedarf eine frische an.
 *
 * DETERMINISMUS: kein RNG in diesem Modul. `id`/`createdSeq` kommen aus dem State-Sequenzzähler
 * `mailSeq` (KEIN Date.now/Math.random) — sonst bräche der Offline==Online-Determinismus.
 */

/** Vergibt eine deterministische Mail-ID + Sequenz (Muster mintInstanceId). */
function mintMailSeq(state: GameState): { id: string; seq: number } {
  if (typeof state.mailSeq !== "number" || !Number.isFinite(state.mailSeq)) state.mailSeq = 0;
  const seq = state.mailSeq++;
  return { id: `mail_${seq.toString(36)}`, seq };
}

/**
 * Findet die aktuelle stehende `kind:"overflow"`-Mail oder legt (deterministisch) eine frische an.
 * Es gibt zu jedem Zeitpunkt höchstens EINE Überlauf-Mail: solange sie existiert, wird nur an sie
 * angehängt; nach vollständigem Abholen (`collectMail` entfernt sie) startet neuer Überlauf frisch.
 */
function findOrCreateOverflowMail(state: GameState): MailMessage {
  const mailbox = (state.mailbox ??= []);
  const existing = mailbox.find((m) => m.kind === "overflow");
  if (existing) return existing;
  const { id, seq } = mintMailSeq(state);
  const mail: MailMessage = { id, kind: "overflow", createdSeq: seq, items: [], instances: [] };
  mailbox.push(mail);
  return mail;
}

/**
 * Raben-Post (§Raben-Post, „Jagd-Paket" L, design/elite-spawns-concept.md, Chef-GO 2026-07-22):
 * stellt einen erzählerischen Brief zu — eine EIGENE `kind:"letter"`-Mail-Zeile (anders als die
 * stehende Überlauf-Mail wird hier NICHT zusammengefasst; jeder Brief bekommt seine eigene Zeile).
 * `id`/`createdSeq` deterministisch wie jede andere Mail (`mintMailSeq`). `textKey` ist ein
 * i18n-SCHLÜSSEL (sprachneutral im Save, NIE Rohtext — die Übersetzung liefert der i18n-Katalog).
 * Ein optionales Geschenk liegt DIREKT in `items` (Default `[]`, dieselbe stackbare Anhang-Form wie
 * bei der Überlauf-Mail — s. `MailMessage`-Doku in shared, KEIN separates `attachments`-Feld) und
 * wird über `collectMail`/`collectAllMail` unten genauso eingesammelt. Zieht KEIN RNG
 * (Determinismus-neutral).
 */
export function sendLetter(
  state: GameState,
  from: MailLetterSender,
  textKey: string,
  items: MailAttachment[] = [],
): void {
  const { id, seq } = mintMailSeq(state);
  const mailbox = (state.mailbox ??= []);
  mailbox.push({
    id,
    kind: "letter",
    createdSeq: seq,
    items: items.map((a) => ({ itemId: a.itemId, qty: a.qty })),
    instances: [],
    from,
    textKey,
  });
}

/**
 * Zentraler Loot-Vergabe-Pfad für stackbare Items (Sammeln/Crafting-Output): versucht zuerst
 * `addItemOrBank` (Inventar → bei Auto-Bank Lager, inkl. Paragon-Schlüssel-Intercept, Erst-Besitz-
 * Marker). Was danach NICHT untergekommen ist (Inventar voll UND Bank voll/Auto-Bank aus), wandert
 * in die Überlauf-Mail (gestapelt per itemId) — NICHTS geht verloren, die Aktion muss nicht stoppen.
 * Zieht KEIN RNG (addItemOrBank/mail sind RNG-frei) → Determinismus-neutral.
 */
export function grantLoot(state: GameState, content: ContentDB, itemId: ItemId, qty: number): void {
  if (!itemId || !Number.isFinite(qty) || qty <= 0) return;
  const { toInventory, toBank } = addItemOrBank(state, content, itemId, qty);
  const overflow = qty - toInventory - toBank;
  if (overflow <= 0) return;
  const mail = findOrCreateOverflowMail(state);
  const existing = mail.items.find((a) => a.itemId === itemId);
  if (existing) existing.qty += overflow;
  else mail.items.push({ itemId, qty: overflow });
  markItemDiscovered(state, itemId);
}

/**
 * Loot-Vergabe für eine non-stackable Item-Instanz (verzaubert/gesuffixt). Versucht zuerst
 * `addInstanceOrBank` (Inventar-Tasche → bei Kapazitäts-Gate der Gear-Vault `bankInstances`, Chef-
 * Bugfix „22/20" 2026-07-23 — Muster `grantLoot`/`addItemOrBank` für Stapelbares). Der Gear-Vault ist
 * unbegrenzt → der Mail-Zweig ist der Vollständigkeit halber vorhanden (falls die Ablage je begrenzt
 * wird), aktuell praktisch unerreichbar. Instanzen stapeln nie → sie liegen als Liste in
 * `mail.instances`.
 */
export function grantLootInstance(state: GameState, content: ContentDB, instance: ItemInstance): void {
  if (!instance) return;
  const { toInventory, toBank } = addInstanceOrBank(state, content, instance);
  if (toInventory || toBank) {
    markItemDiscovered(state, instance.baseItemId);
    return;
  }
  const mail = findOrCreateOverflowMail(state);
  mail.instances.push(instance);
  markItemDiscovered(state, instance.baseItemId);
}

/**
 * Holt eine Mail ab: verschiebt ihren Inhalt zurück INS INVENTAR (nicht ins Lager) — Instanzen in die
 * unbegrenzte Instanz-Tasche (immer vollständig), stackbare Items soweit Platz ist. Passt nicht alles
 * (Inventar voll), bleibt der Rest in der Mail (partieller Collect). Wird die Mail vollständig geleert,
 * verschwindet sie. Gibt die Anzahl abgeholter Einheiten (Items-qty + Instanzen) und `partial` (Rest
 * blieb liegen) zurück. Zieht KEIN RNG.
 *
 * Raben-Post (`kind:"letter"`, „Jagd-Paket" L): braucht KEINE Sonderbehandlung — ein Brief-Geschenk
 * liegt in denselben `items`/`instances`-Feldern wie bei einer Überlauf-Mail (s. `MailMessage`-Doku
 * in shared), derselbe Collect-Pfad gilt identisch. Ein Brief OHNE Geschenk (leere `items`/
 * `instances`, z. B. der Wächter-Brief) gilt beim ERSTEN Aufruf sofort als vollständig „gelesen" und
 * verschwindet — das ist die geteilte „gelesen"-Mechanik, kein separates read-Flag.
 */
export function collectMail(
  state: GameState,
  content: ContentDB,
  mailId: string,
): { collected: number; partial: boolean } {
  const mailbox = (state.mailbox ??= []);
  const idx = mailbox.findIndex((m) => m.id === mailId);
  if (idx === -1) return { collected: 0, partial: false };
  const mail = mailbox[idx]!;
  let collected = 0;

  // Instanzen zuerst (unbegrenzte Instanz-Tasche → immer erfolgreich).
  const restInstances: ItemInstance[] = [];
  for (const inst of mail.instances) {
    if (addInstance(state.inventory, inst)) {
      markItemDiscovered(state, inst.baseItemId);
      collected += 1;
    } else {
      restInstances.push(inst);
    }
  }
  mail.instances = restInstances;

  // Stackbare Items soweit Platz.
  const restItems: MailAttachment[] = [];
  for (const att of mail.items) {
    const placed = addItem(state.inventory, content, att.itemId, att.qty);
    if (placed > 0) {
      markItemDiscovered(state, att.itemId);
      collected += placed;
    }
    const rest = att.qty - placed;
    if (rest > 0) restItems.push({ itemId: att.itemId, qty: rest });
  }
  mail.items = restItems;

  const partial = mail.items.length > 0 || mail.instances.length > 0;
  if (!partial) mailbox.splice(idx, 1);
  return { collected, partial };
}

/**
 * Holt ALLE Mails ab („Alles abholen"). Verschiebt jeden Mail-Inhalt zurück ins Inventar (soweit
 * Platz); geleerte Mails verschwinden, partieller Rest bleibt liegen. `partial` = true, wenn in
 * mindestens einer Mail etwas liegen blieb.
 */
export function collectAllMail(
  state: GameState,
  content: ContentDB,
): { collected: number; partial: boolean } {
  const mailbox = (state.mailbox ??= []);
  let collected = 0;
  let partial = false;
  // IDs vorab kopieren — collectMail mutiert das Array (entfernt geleerte Mails).
  for (const id of mailbox.map((m) => m.id)) {
    const r = collectMail(state, content, id);
    collected += r.collected;
    if (r.partial) partial = true;
  }
  return { collected, partial };
}

/**
 * Liegt überhaupt Post im Postfach? (Selektor für die UI — ein Eintrag ohne jeden `items`/
 * `instances`-Inhalt existiert für `kind:"overflow"` nie; ein geschenkloser Brief, z. B. der
 * Wächter-Brief, bleibt bis zum ersten `collectMail`-Aufruf trotzdem im Array stehen — die
 * UI-Mailliste zählt dort einfach `state.mailbox.length`, s. MailPage.tsx.)
 */
export function hasMail(state: GameState): boolean {
  const mailbox = state.mailbox;
  if (!Array.isArray(mailbox)) return false;
  return mailbox.some((m) => m.items.length > 0 || m.instances.length > 0);
}

/** Gesamtzahl wartender Einheiten im Postfach (Item-qty + Instanzen) — für ein UI-Badge. */
export function mailItemCount(state: GameState): number {
  const mailbox = state.mailbox;
  if (!Array.isArray(mailbox)) return 0;
  let n = 0;
  for (const m of mailbox) {
    for (const a of m.items) n += a.qty;
    n += m.instances.length;
  }
  return n;
}

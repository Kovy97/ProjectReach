/**
 * ASSET-WERKSTATT, Frühstart (nur Dev-Server bzw. Build mit `ASSET_LAB=1`; im Steam-Build fällt der Aufruf in main.tsx samt
 * Modul weg). NUR Deutsch, bewusst ohne i18n.
 *
 * claude:2026-11-01T11:59:23+01:00 — Chef 01.11.: „Warum haben wir die erste Sekunde eine Stein-Textur, bevor unser Holz kommt?“
 * Die Werkstatt selbst lädt nach dem Start nach (großer Chunk, im Dev-Server ~900 Bild-URL-Module); bis dahin galt das
 * Spiel-CSS. Deshalb merkt sich der Werkstatt-Kern sein fertiges Live-CSS (CSS_CACHE_KEY) und dieses Modul setzt es
 * SYNCHRON vor dem ersten Render, dazu die Element-Markierungen per Pfad (gleiche Prüfung wie im Kern). Sobald der Kern
 * bootet, übernimmt er denselben <style> und dieselben Markierungen; der Frühstart-Beobachter endet nach 8 s.
 */

export const LS_KEY = "hearthforge:assetLab";
export const CSS_CACHE_KEY = "hearthforge:assetLab:css";
export const STYLE_ID = "asset-lab-overrides";
export const ID_ATTR = "data-asset-lab-id";

export function elText(el: Element): string {
  if (el instanceof HTMLImageElement) return el.alt || el.currentSrc.split("/").pop() || "";
  return (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
}

const textKey = (s: string): string => s.replace(/[^\p{L}]/gu, "").toLowerCase().slice(0, 10);

/**
 * claude:2026-11-01T11:08:37+01:00 — Positionspfade (:nth-of-type) gelten nur, wenn der Textanfang zum gespeicherten passt
 * (gleiche Sprache; Zahlen zählen nicht). Andere Pfade und andere Sprachen: Pfad allein entscheidet.
 */
export interface TextIdentity {
  path?: string;
  txt?: string;
  lang?: string;
  label?: string;
}
/**
 * claude:2026-11-01T12:02:51+01:00 — Chef 01.11.: Karten wechseln ihren Text je nach Zustand („Suggested Fight“ → „Last Fight“, „Continue“
 * mit wechselnder Aktivität). Abweichender Text allein sperrt daher nicht mehr; gesperrt wird nur, wenn ein ANDERER
 * gespeicherter Eintrag (gleiche Element-Art) genau dieses Element über seinen Text beansprucht (Hauptmenü-Karten-Tausch).
 */
export function matchesStoredText(o: TextIdentity, el: Element, others: readonly TextIdentity[] = []): boolean {
  if (!o.path?.includes(":nth-of-type(") || !o.txt) return true;
  const lang = document.documentElement.lang || undefined;
  if (o.lang && lang && o.lang !== lang) return true;
  const key = textKey(elText(el));
  if (textKey(o.txt) === key) return true;
  return !others.some((x) => x !== o && !!x.txt && x.label === o.label && (!x.lang || !lang || x.lang === lang) && textKey(x.txt) === key);
}

interface StoredOv extends TextIdentity {
  scope?: string;
  labId?: string;
  ins?: unknown;
}

export function earlyAssetLab(): void {
  try {
    const css = localStorage.getItem(CSS_CACHE_KEY);
    const raw = localStorage.getItem(LS_KEY);
    if (!css || !raw) return;
    const stored = JSON.parse(raw) as { enabled?: boolean; overrides?: StoredOv[] };
    if (stored.enabled === false || !document.head || !document.body) return;
    if (!document.getElementById(STYLE_ID)) {
      const st = document.createElement("style");
      st.id = STYLE_ID;
      st.textContent = css;
      document.head.appendChild(st);
    }
    const list = (stored.overrides ?? []).filter((o) => o && o.scope === "el" && o.labId && o.path && !o.ins);
    if (!list.length) return;
    const tag = (): void => {
      for (const o of list) {
        if (document.querySelector(`[${ID_ATTR}="${o.labId}"]`)) continue;
        try {
          const hits = document.querySelectorAll(o.path!);
          const hit = hits.length === 1 ? hits[0] : undefined;
          if (hit && !hit.hasAttribute(ID_ATTR) && matchesStoredText(o, hit, list)) hit.setAttribute(ID_ATTR, o.labId!);
        } catch {
          /* ungültiger Pfad */
        }
      }
    };
    // MutationObserver-Rückrufe laufen vor dem nächsten Bild: die Markierung sitzt, bevor React-Inhalte sichtbar werden.
    const mo = new MutationObserver(tag);
    mo.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => mo.disconnect(), 8000); // danach hält der Werkstatt-Kern die Markierungen (retag)
  } catch {
    /* localStorage gesperrt oder kaputt: dann eben erst mit dem Kern */
  }
}

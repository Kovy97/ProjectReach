import { useEffect, useRef, useState } from "react";
import { CitadelTip } from "./CitadelTip";

/**
 * claude:2026-10-24T22:57:00+02:00 — App-weiter Ersatz für native Windows-Tooltips (Chef 24.10.2026: „viele Windows-Tooltips beim Mouse-over,
 * z. B. in der Topbar. Der Tooltip ist dann UNTER der Maus und nicht lesbar. Wir haben ein eigenes Tooltip-System … kannst du
 * das überall für jede Schaltfläche implementieren?“).
 *
 * Statt rund 280 `title=`-Stellen in 61 Dateien einzeln umzubauen, fängt diese eine Komponente das Überfahren jedes Elements mit
 * `title` ab: Der Text wandert in `data-ct-title`, das Attribut verschwindet (der native Tooltip kommt damit nie), und derselbe
 * Text erscheint im Citadel-Tooltip (`CitadelTip`, wie die Werte im Charakterfenster): über dem Element, bei zu wenig Platz
 * darunter, nie unter dem Mauszeiger. Gilt damit auch für jede künftige Schaltfläche mit `title`.
 *
 * React setzt `title` nur bei geänderter Prop neu; dann gewinnt beim nächsten Überfahren der neue Wert. Ein kurzer Verzug
 * (DELAY_MS) verhindert Flackern beim Überstreichen vieler Knöpfe; Klick, Scrollen und Fensterwechsel schließen den Tooltip.
 */
const DELAY_MS = 180;

function titleHost(start: EventTarget | null): HTMLElement | null {
  if (!(start instanceof Element)) return null;
  const el = start.closest<HTMLElement>("[title], [data-ct-title]");
  if (!el || el.closest(".ct-tip")) return null;
  const fresh = el.getAttribute("title");
  if (fresh !== null) {
    // Text übernehmen und das Attribut entfernen, sonst zeigt Windows nach ~1 s zusätzlich seinen eigenen Tooltip
    if (fresh.trim()) el.dataset.ctTitle = fresh;
    else delete el.dataset.ctTitle;
    el.removeAttribute("title");
    if (fresh.trim() && !el.getAttribute("aria-label") && !el.textContent?.trim()) el.setAttribute("aria-label", fresh);
  }
  return el.dataset.ctTitle ? el : null;
}

export function GlobalTitleTip(): JSX.Element | null {
  const [tip, setTip] = useState<{ text: string; rect: DOMRect } | null>(null);
  const timer = useRef<number | null>(null);
  const current = useRef<HTMLElement | null>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const clear = (): void => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    };
    const close = (): void => {
      clear();
      current.current = null;
      setTip(null);
    };
    const show = (el: HTMLElement): void => {
      clear();
      current.current = el;
      timer.current = window.setTimeout(() => {
        if (current.current !== el || !el.isConnected || !el.dataset.ctTitle) return;
        // Große Flächen (Ziehgriff der Seitenleiste, ganze Panels): am Mauszeiger verankern, sonst läge der Tooltip
        // über oder unter dem Element außerhalb des Fensters
        const r = el.getBoundingClientRect();
        const gross = r.height > 120 || r.width > 600;
        const rect = gross ? new DOMRect(pointer.current.x - 1, pointer.current.y - 14, 2, 28) : r;
        setTip({ text: el.dataset.ctTitle, rect });
      }, DELAY_MS);
    };
    const onMove = (e: PointerEvent): void => {
      pointer.current = { x: e.clientX, y: e.clientY };
    };
    const onOver = (e: Event): void => {
      if (e instanceof PointerEvent) pointer.current = { x: e.clientX, y: e.clientY };
      const el = titleHost(e.target);
      if (!el) {
        if (current.current && !(e.target instanceof Node && current.current.contains(e.target))) close();
        return;
      }
      if (el !== current.current) show(el);
    };
    const onOut = (e: Event): void => {
      const to = (e as PointerEvent).relatedTarget;
      if (current.current && !(to instanceof Node && current.current.contains(to))) close();
    };
    const onFocus = (e: Event): void => {
      const el = titleHost(e.target);
      if (el) show(el);
    };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", close, true);
    document.addEventListener("pointerdown", close, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("blur", close);
    return () => {
      clear();
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", close, true);
      document.removeEventListener("pointerdown", close, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("blur", close);
    };
  }, []);

  if (!tip) return null;
  return (
    <CitadelTip rect={tip.rect}>
      {tip.text.split("\n").map((line, i) => (
        <span key={i} className="ct-tip-desc">
          {line}
        </span>
      ))}
    </CitadelTip>
  );
}

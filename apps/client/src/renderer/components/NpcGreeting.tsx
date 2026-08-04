import { useState } from "react";
import type { ReactNode } from "react";
import "../styles/npc-greeting.css";

/**
 * NPC-Begrüßungs-Baustein („Speaking Head", Chef-GO 2026-07-13): Kopf-Medaillon im
 * Holzrahmen + Sprechblase mit einer kurzen Flavor-Zeile, oben auf einer Seite —
 * die Welt soll bewohnt wirken. Reine Atmosphäre: keine Interaktion, kein Modal;
 * kostet bewusst ~80px Seitenhöhe, der Inhalt rückt darunter.
 *
 * Porträts sind vorerst PLATZHALTER (überall Brenna, s. Chef-Vorgabe) — Kopf, Name
 * und Texte kommen komplett über Props, der spätere Tausch pro NPC ist eine reine
 * Prop-Änderung an der Einbindungsstelle. Die Sprechblase ist separat exportiert
 * (NpcSpeechBubble), damit der Onboarding-Guide (Folge-Welle, Tour-Sprecherin) sie
 * ohne den Seiten-Layout-Anteil nutzen kann.
 */
export interface NpcGreetingProps {
  /** Aufgelöste Porträt-URL, z. B. getPortrait("slayermaster_brenna_ashwick"). */
  portraitSrc: string | null;
  /** Angezeigter NPC-Name (bereits lokalisiert, z. B. t("npc.shop.name")). */
  name: string;
  /**
   * Begrüßungszeilen (bereits lokalisiert). Pro Mount wird EINE zufällig gewählt
   * und bleibt dann für die Lebensdauer der Seite stabil (auch über Game-Ticks und
   * Sprachwechsel hinweg — gemerkt wird der Zufallswert, nicht der String).
   */
  lines: string[];
  /**
   * Persönlichkeits-Paket „Das Reach führt Buch" §C/§D.4 (design/lore/waechter-stimme-pack.md):
   * eine WELTZUSTAND-gewählte Zeile (Elite-Spawn/Spielerzustand/Segen — Priorität liegt beim
   * Aufrufer, s. util/npcVoice.ts), die die normale `lines`-Rotation für diesen Mount ERSETZT.
   * `null`/`undefined`/leer ⇒ ganz normal die zufällige greet1–3-Rotation (unverändertes
   * Bestandsverhalten). Bewusst kein eigener Re-Roll bei Änderung: die Bedingung wird nur beim
   * Seiten-Mount ausgewertet (Muster des bestehenden `roll`-Lazy-State unten), damit die Zeile
   * nicht mitten im Lesen unter dem Spieler wegspringt (z.B. Segen wechselt lokal um Mitternacht).
   */
  priorityLine?: string | null;
}

export interface NpcSpeechBubbleProps {
  /** NPC-Name klein über dem Text (Cinzel-Gold). */
  name: string;
  /** Zeiger-Dreieck Richtung Sprecher-Kopf; "none" für freistehende Nutzung. */
  tail?: "left" | "none";
  children: ReactNode;
}

/** Sprechblase im dunklen Citadel-Ton — auch standalone nutzbar (Onboarding-Guide). */
export function NpcSpeechBubble({ name, tail = "left", children }: NpcSpeechBubbleProps): JSX.Element {
  return (
    <div className={`npc-bubble${tail === "left" ? " npc-bubble--tail-left" : ""}`}>
      <div className="npc-bubble-name">{name}</div>
      <div className="npc-bubble-text">{children}</div>
    </div>
  );
}

/** Kopf-Medaillon + Sprechblase; oben auf einer Seite einhängen (erstes Kind des Page-Wrappers). */
export function NpcGreeting({ portraitSrc, name, lines, priorityLine }: NpcGreetingProps): JSX.Element {
  // Zufallswert EINMAL pro Mount würfeln (deterministisch für die Seiten-Lebensdauer);
  // der Index wird erst beim Rendern gebildet, damit ein Locale-Wechsel dieselbe Zeile behält.
  const [roll] = useState(() => Math.random());
  const rotationText = lines.length > 0 ? lines[Math.min(Math.floor(roll * lines.length), lines.length - 1)] : "";
  // Weltzustand-Zeile (§C/§D.4) sticht die normale Rotation, wenn eine Bedingung greift.
  const text = priorityLine || rotationText;
  return (
    <div className="npc-greeting">
      <div className="npc-greeting-head" aria-hidden="true">
        {portraitSrc ? (
          <img loading="lazy" decoding="async" src={portraitSrc} alt="" className="npc-greeting-img" />
        ) : (
          <span className="npc-greeting-fallback">🗨</span>
        )}
      </div>
      <NpcSpeechBubble name={name}>{text}</NpcSpeechBubble>
    </div>
  );
}

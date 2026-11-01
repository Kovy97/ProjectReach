// claude:2026-10-30T20:31:00+01:00 — Hauptmenü-Hub: merkt sich je Spielstand die zuletzt laufende Tätigkeit (Aktion) und den
// zuletzt gekämpften Gegner. Der Spielstand selbst trägt dafür kein Feld (nur `lastStop` für Stoppgründe), und die Engine
// bleibt unberührt: reine Anzeige-Vorliebe im localStorage (Muster util/uiPrefs.ts), nie Teil des Savegames.
import { useEffect } from "react";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { useGameSelector } from "../game/GameContext";

export interface LastActivity {
  /** Zuletzt laufende Sammel-/Handwerksaktion. */
  actionId?: string;
  /** Zuletzt bekämpftes Welt-Monster (kein Dungeon/Elite/Turm). */
  monsterId?: string;
}

const KEY_PREFIX = "gr.hub.last.";

/** Schlüssel je Charakter (Name + Erstellzeit trennen zwei Spielstände gleichen Namens). */
// claude:2026-10-31T14:40:00+01:00 — Fixwelle D7/D8: der Aschesturz-Durchgang (`prestige.count`) steckt im Schlüssel, damit Einträge der
// vorigen Runde nach einem Aschesturz nicht mitwandern; gelesen wird einmal pro Schlüssel (Zwischenspeicher), nicht pro 10-Hz-Render.
function storageKey(name: string, createdAt: number, run = 0): string {
  return `${KEY_PREFIX}${name}.${createdAt}.r${run}`;
}

const cache = new Map<string, LastActivity>();

function read(key: string): LastActivity {
  const hit = cache.get(key);
  if (hit) return hit;
  const v = readStorage(key);
  cache.set(key, v);
  return v;
}

function readStorage(key: string): LastActivity {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const v = JSON.parse(raw) as LastActivity;
    return { actionId: typeof v.actionId === "string" ? v.actionId : undefined, monsterId: typeof v.monsterId === "string" ? v.monsterId : undefined };
  } catch {
    return {};
  }
}

/** Gemerkte Tätigkeit dieses Spielstands; Ids, die der Katalog nicht mehr kennt, fallen weg. */
export function getLastActivity(state: GameState): LastActivity {
  const v = read(storageKey(state.character.name, state.character.createdAt, state.prestige?.count ?? 0));
  return {
    actionId: v.actionId && content.actions[v.actionId] ? v.actionId : undefined,
    monsterId: v.monsterId && content.monsters[v.monsterId] && !content.monsters[v.monsterId]!.dungeonOnly ? v.monsterId : undefined,
  };
}

/**
 * Wird einmal in MainLayout aufgerufen: schreibt bei jedem Wechsel der laufenden Aktion bzw. des Kampfgegners mit.
 * Der Selektor liefert einen String, damit nur echte Wechsel (nicht jeder Tick) einen Render und Schreibzugriff auslösen.
 */
export function useRememberLastActivity(): void {
  const sig = useGameSelector((s) => {
    const fightable = s.combat.monsterId !== null && !s.combat.dungeonId && s.combat.paragonFloor === undefined && !s.combat.eliteVariantId;
    return [s.character.name, s.character.createdAt, s.prestige?.count ?? 0, s.activeActionId ?? "", fightable ? s.combat.monsterId : ""].join("\u0001");
  });
  useEffect(() => {
    const [name, createdAt, run, actionId, monsterId] = sig.split("\u0001");
    if (!actionId && !monsterId) return;
    try {
      const key = storageKey(name ?? "", Number(createdAt), Number(run));
      const cur = { ...read(key) };
      if (actionId) cur.actionId = actionId;
      if (monsterId) cur.monsterId = monsterId;
      cache.set(key, cur);
      localStorage.setItem(key, JSON.stringify(cur));
    } catch {
      /* localStorage nicht verfügbar: Hub zeigt dann nur die laufende Tätigkeit */
    }
  }, [sig]);
}

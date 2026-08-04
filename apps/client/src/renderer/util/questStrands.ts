import type { ContentDB, LocalizedString, QuestDef } from "@hearthforge/shared";
import { CHRONICLE_ID_PREFIX } from "./chronicle";

/**
 * "Strand" grouping for the Contracts tab (Chef-Auftrag Welle X, 2026-07-16): "kein einfache
 * Liste, komplexeres Layout" — the master-detail replacement for the old flat quest-card list
 * (pages/QuestsPage.tsx `ContractsTab`) needs the ~38 non-daily/non-chronicle quests grouped into
 * thematic chains instead of one long scroll.
 */
export interface QuestStrand {
  /** ID of the root quest (no `requires`) that anchors this strand — stable React key AND the
   *  lookup key for `questSpeaker()` below. */
  rootId: string;
  /** Strand header = the root quest's OWN name. Deliberately NOT a bespoke per-strand i18n key
   *  (Chef-Vorgabe: "Strang-Überschriften-Mechanik generisch halten") — the root quest's name is
   *  already fully localized (LocalizedString), so `tr(strand.rootName)` just works and the
   *  header stays correct if content-dev ever renames a root quest. */
  rootName: LocalizedString;
  /** Quests in this strand, kept in `content.quests` array order (already narratively ordered
   *  upstream by content-dev — block comments in packages/content/src/index.ts). */
  quests: QuestDef[];
}

/**
 * Derives quest strands from the `requires` graph of all non-daily, non-chronicle quests.
 *
 * The graph is a DAG, not a forest: several quests require TWO earlier quests from otherwise
 * separate chains (e.g. `q_skiller_1` requires `[q_miner_1, q_woodcutter_2]`, `q_fighter_2`
 * requires `[q_fighter_1, q_shaman_hunt]`). A plain "weakly connected components" pass therefore
 * merges almost the entire catalogue into one giant component once enough cross-links exist
 * (verified by tracing the full requires chain by hand) — not the readable grouping the Chef
 * asked for.
 *
 * Instead, each quest's strand is resolved via its PRIMARY parent only: `requires[0]`, followed
 * transitively up to a root quest (a quest with no `requires` at all). Root quests each start
 * their own strand. This is a pure function of `content.quests` — no hardcoded quest-ID table to
 * keep in sync as content-dev adds/removes quests, and it needs zero new i18n keys (see
 * `rootName` above).
 *
 * Result on the current catalogue (documented for the record, not enforced/tested here): 5
 * strands — "First Steps" (1 quest, q_first_steps), "Goblin Blood" (17 quests: the goblin/
 * fighter/crypt/blackthorn/slagpit/frost-hound combat spine, rooted at q_first_blood), "Into the
 * Wood" (3 quests: the woodcutting line), "Gatherer" (15 quests: the skiller/mining/wolf/roc/
 * gathering spine, rooted at q_gatherer), "Journeyman Smith" (2 quests: the smithing line).
 */
export function deriveQuestStrands(content: ContentDB): QuestStrand[] {
  const contracts = content.quests.filter(
    (q) => !q.daily && !q.id.startsWith(CHRONICLE_ID_PREFIX),
  );
  const byId = new Map(contracts.map((q) => [q.id, q]));

  const rootCache = new Map<string, string>();
  function resolveRoot(id: string, guard: Set<string>): string {
    const cached = rootCache.get(id);
    if (cached) return cached;
    if (guard.has(id)) return id; // defensive cycle guard — should never trigger on valid content
    guard.add(id);
    const quest = byId.get(id);
    const primaryParent = quest?.requires?.[0];
    const root =
      primaryParent && primaryParent !== id && byId.has(primaryParent)
        ? resolveRoot(primaryParent, guard)
        : id;
    rootCache.set(id, root);
    return root;
  }

  const rootOrder: string[] = []; // first-seen order while scanning contracts (= content order)
  const groups = new Map<string, QuestDef[]>();
  for (const quest of contracts) {
    const root = resolveRoot(quest.id, new Set());
    if (!groups.has(root)) {
      groups.set(root, []);
      rootOrder.push(root);
    }
    groups.get(root)!.push(quest);
  }

  return rootOrder.map((rootId) => {
    const quests = groups.get(rootId) ?? [];
    const rootQuest = byId.get(rootId);
    return {
      rootId,
      rootName: rootQuest ? rootQuest.name : { en: rootId, de: rootId },
      quests,
    };
  });
}

/** Questgeber (portrait + display-name key) for a strand's detail stage. */
export interface QuestSpeaker {
  /** Portrait asset ID, e.g. for `getPortrait()`. */
  portraitId: string;
  /** i18n key of the displayed speaker name (already-existing key, e.g. `npc.guide.name`). */
  nameKey: string;
}

const WARDEN_SPEAKER: QuestSpeaker = {
  // Welle QQ (Asset-Verdrahtung 2026-07-17): echtes Wächter-Porträt statt des Brenna-Platzhalters
  // — `npc_warden.png` ist jetzt gebunden (assets/portraits/). `nameKey` blieb schon immer korrekt
  // ("The Warden"/"Der Wächter"), nur das Bild war falsch.
  portraitId: "npc_warden",
  nameKey: "npc.guide.name",
};

const SLAYER_SPEAKER: QuestSpeaker = {
  portraitId: "slayermaster_brenna_ashwick",
  nameKey: "npc.slayer.name",
};

/**
 * Strand roots whose quest-giver is Brenna, speaking under her OWN name (`npc.slayer.name`)
 * instead of the generic Warden. Currently only `q_first_blood` — the full goblin/fighter/crypt/
 * blackthorn/slagpit/frost-hound combat spine, which is exactly the kind of "kill what I mark"
 * monster-hunting content her existing greeting lines (npc.slayer.greet1-3) already describe.
 */
const SLAYER_STRAND_ROOTS = new Set<string>(["q_first_blood"]);

/** Urga Schlackenfaust spricht den Schmiede-Strang (Lore-Bibel §3.5; CEO-Nachtrag zu Welle QQ:
 *  der fehlende Namens-Key `npc.smith.name` existiert jetzt ×7). */
const SMITH_SPEAKER: QuestSpeaker = {
  portraitId: "npc_urga",
  nameKey: "npc.smith.name",
};

const STRAND_SPEAKERS: Record<string, QuestSpeaker> = {
  q_smith_journeyman: SMITH_SPEAKER,
};

/**
 * Questgeber je Strang. Welle QQ (2026-07-17): `WARDEN_SPEAKER` zeigt sein echtes Porträt
 * (`npc_warden`); Slayer-Spine gehört Brenna, der Schmiede-Strang Urga (s. STRAND_SPEAKERS).
 * Alle übrigen Stränge erzählt der Wächter.
 */
export function questSpeaker(strandRootId: string): QuestSpeaker {
  if (SLAYER_STRAND_ROOTS.has(strandRootId)) return SLAYER_SPEAKER;
  return STRAND_SPEAKERS[strandRootId] ?? WARDEN_SPEAKER;
}

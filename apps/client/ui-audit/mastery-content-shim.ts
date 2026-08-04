// Dev-only content shim for the Meisterweihe screenshot tour (mastery-ceremony-shot.mjs):
// re-exports the REAL content catalog MINUS `cape_master_woodcutting`, so the "cape item doesn't
// exist (yet)" rendering branch of MasteryCeremony.tsx stays provably covered even now that
// content-dev has shipped all 20 real capes (design/master-capes-konzept.md) — that defensive
// branch (content lagging a fresh Level-99 skill) is still real: it's exactly what happens the
// moment a NEW skill is added to the game before its cape follows. Wired in ONLY via
// vite.tour.mastery.config.mjs's `resolve.alias` — the real app/dev-server (vite.tour.config.mjs)
// never sees this file. Not a source of truth for anything; delete freely if no longer needed.
import { content as real } from "../../../packages/content/src/index.ts";

const items = { ...real.items };
delete items.cape_master_woodcutting;

export const content = { ...real, items };

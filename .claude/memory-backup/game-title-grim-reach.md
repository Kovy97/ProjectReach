---
name: game-title-grim-reach
description: Spieltitel ist jetzt „Grim Reach" (vorher „Hearthforge Idle")
metadata:
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-Entscheidung (2026-06-28): Der **öffentliche Spieltitel ist jetzt „Grim Reach"**
(vorher „Hearthforge Idle"). Für Steam/Branding ab sofort „Grim Reach" verwenden.

- Steam-Asset-Prompt-Doc ist schon umgestellt: `design/chatgpt-steam-assets-prompts.txt`.
- **Noch NICHT umbenannt** (offen, auf Chef-Freigabe): in-game `app.title`, `onboarding.welcome.title`,
  `about.version/credits/copyright` (i18n en+de), `apps/client/package.json` (description), evtl.
  electron-builder `productName`/root-`name` (Artefakt-/.exe-Name).
- **Bewusst NICHT angefasst:** der interne pnpm-Workspace-Scope `@hearthforge/*` (nur Code, nicht
  user-facing) und vorerst der Studio-Name „Hearthforge Studio" (separate Entscheidung).

**Why:** Markenwechsel vor dem EA-Release. **How to apply:** Bei neuen user-facing Texten/Store-Assets
„Grim Reach" nutzen; den vollständigen In-Game-Rename erst nach Chef-OK ausrollen. Siehe [[ea-0.1-release-push]].

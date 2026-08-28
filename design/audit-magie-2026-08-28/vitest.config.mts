// Balance-Audit Magie 28.08.2026 (balance-designer). Mess-Skript, NICHT Teil der Suite.
// Welt-Auswahl per Env: AUDIT_TREE=head (Repo-Quellen) | old-<commit> (git-archive im Scratchpad).
// Kein Import aus "vitest/config": vitest liegt nur in packages/engine/node_modules — deshalb Alias.
const tree = process.env.AUDIT_TREE ?? "head";
const base =
  tree === "head"
    ? "G:/GameDev/packages"
    : `C:/Users/MSchu/AppData/Local/Temp/claude/G--GameDev/553d2095-3a73-4795-9782-0fe746a25f13/scratchpad/${tree}/packages`;
export default {
  resolve: {
    alias: {
      "@hearthforge/shared": `${base}/shared/src/index.ts`,
      "@hearthforge/content": `${base}/content/src/index.ts`,
      "@engine": `${base}/engine/src`,
      vitest: "G:/GameDev/packages/engine/node_modules/vitest/dist/index.js",
    },
  },
  test: { include: ["**/magie.audit.test.ts"], testTimeout: 3_600_000, hookTimeout: 600_000 },
};

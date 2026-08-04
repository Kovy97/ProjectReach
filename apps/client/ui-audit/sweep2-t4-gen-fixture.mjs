#!/usr/bin/env node
// Tester-Sweep 2, T4 "Der Rückkehrer" (2026-07-13) — Wegwerf-Skript.
// Baut aus dem echten v57-Vault-Fixture einen SYNTHETISCHEN v63-artigen Save mit Dungeon-Keys in
// Inventar + Bank + Rückkauf-Regal, um die v63→v64-Migration (Keys→Gold, dungeonsUnlocked,
// Rückkauf-Strip) über den echten UI-Import-Pfad zu prüfen. Nicht Teil des Produkts — nur für
// diesen Sweep-Lauf, Output landet im scratchpad.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "..", "..", "packages", "persistence", "fixtures", "save-compat", "v57-slot-4.json");
const OUT = process.argv[2] || join(__dirname, "sweep2-t4-synthetic-v63.json");

const save = JSON.parse(readFileSync(SRC, "utf-8"));
const s = save.state;

// Doku-Werte aus packages/content/src/index.ts (items, Stand 2026-07-13):
//   crypt_key=250, idolhall_key=1200, masters_mark=5000, warband_key=90, wildwood_key=320, highland_key=700
// Dungeon-Zuordnung aus packages/persistence/src/index.ts LEGACY_V63_KEY_TO_DUNGEONS.
const EXPECTED = {
  goldBefore: s.character.gold,
  refund: 3 * 250 /* crypt_key */ + 1 * 700 /* highland_key */ + 1 * 5000 /* masters_mark */
    + 2 * 90 /* warband_key (bank) */ + 5 * 1200 /* idolhall_key (bank) */,
  dungeonsUnlocked: ["crypt_depths", "highland_aerie", "wyvern_lair", "behind_the_throne", "goblin_warband", "idol_sanctum"],
  dungeonsNotUnlocked: ["wildwood_hunt"], // wildwood_key nur im Rückkauf-Regal, NICHT in Inventar/Bank
  removedItemIds: ["crypt_key", "highland_key", "masters_mark", "warband_key", "idolhall_key"],
};

// Inventar: 3 leere Slots mit Keys belegen.
const nullIdx = s.inventory.slots.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
if (nullIdx.length < 3) throw new Error("nicht genug leere Inventar-Slots im Quell-Fixture");
s.inventory.slots[nullIdx[0]] = { itemId: "crypt_key", qty: 3 };
s.inventory.slots[nullIdx[1]] = { itemId: "highland_key", qty: 1 };
s.inventory.slots[nullIdx[2]] = { itemId: "masters_mark", qty: 1 };

// Bank
s.bank = { ...(s.bank || {}), warband_key: 2, idolhall_key: 5 };

// Rückkauf-Regal: zusätzliche Key-Einträge, die NICHT über die Migration refundet werden (nur
// stillschweigend gestrippt — Vendor-Präzedenz, s. persistence/index.ts Kommentar "kein Verlust,
// Gold gab's schon beim Verkauf").
s.buyBack = [...(s.buyBack || []), { itemId: "wildwood_key", qty: 1, price: 160 }, { itemId: "idolhall_key", qty: 2, price: 900 }];

save.version = 63;
s.version = 63;

writeFileSync(OUT, JSON.stringify(save));
console.log(JSON.stringify({ ok: true, out: OUT, expected: EXPECTED }, null, 2));

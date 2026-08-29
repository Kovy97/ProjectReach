import { startHarness } from "./sim-harness.mjs";
const h = await startHarness({ port: 5485, fixture: "midgame", locale: "de", viewport: { width: 1920, height: 1080 } });
const { page } = h;
try {
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  const skip = page.locator(".guide-bubble-skip"); if (await skip.count()) { await skip.first().click(); }
  // Verzauberte Instanz eines raren Helms anlegen und anziehen (alle Skills 99, damit die Anforderung passt)
  await h.setState((state) => {
    for (const k of Object.keys(state.skills)) state.skills[k] = { xp: 13034431 };
    state.character.equipment.helmet = "iron_medhelm";
    state.character.equippedInstances.helmet = { instanceId: "inst_repro_1", baseItemId: "iron_medhelm", affixes: [] };
  });
  await page.waitForTimeout(2500);
  for (let i = 0; i < 3; i++) { const b = page.locator(".modal-overlay button, .update-notice button, .ds-close-button"); if (await b.count()) { await b.first().click({ force: true }).catch(() => {}); await page.waitForTimeout(400); } }
  await page.locator('[data-guide-id="topbar.character"]').first().click({ force: true });
  await page.waitForTimeout(1500);
  const toastsNow = async () => page.evaluate(() => Array.from(document.querySelectorAll(".toast, [class*=toast]")).map((e) => e.textContent?.trim().slice(0, 80)).filter(Boolean));
  const countRares = async () => page.evaluate(() => {
    const s = window.__hfDebug?.state; if (!s) return "no state";
    const out = {};
    const add = (id, q) => { if (!id) return; out[id] = (out[id] ?? 0) + q; };
    for (const sl of s.inventory.slots) if (sl) add(sl.itemId, sl.qty);
    for (const i of s.inventory.instances) add(i.baseItemId, 1);
    for (const id of Object.values(s.character.equipment)) add(id, 1);
    (s.equipKits ?? []).forEach((k, i) => { if (i === s.activeKit) return; for (const id of Object.values(k.equipment)) add(id, 1); });
    return { active: s.activeKit, medhelm: out.iron_medhelm ?? 0, kit0helm: s.equipKits?.[0]?.equipment?.helmet, charHelm: s.character.equipment.helmet, instKit0: !!s.equipKits?.[0]?.equippedInstances?.helmet };
  });
  console.log("vorher", JSON.stringify(await countRares()), "toasts", JSON.stringify(await toastsNow()));
  await page.locator(".eq-kit-btn").nth(1).click({ force: true });
  await page.waitForTimeout(2500);
  console.log("nach ->2", JSON.stringify(await countRares()), "toasts", JSON.stringify(await toastsNow()));
  await page.locator(".eq-kit-btn").nth(0).click({ force: true });
  await page.waitForTimeout(2500);
  console.log("nach ->1", JSON.stringify(await countRares()), "toasts", JSON.stringify(await toastsNow()));
  await page.screenshot({ path: "G:/GameDev/apps/client/ui-audit/shots-review-fixes/kit-discovery-repro.png" });
} finally { await h.close?.(); }

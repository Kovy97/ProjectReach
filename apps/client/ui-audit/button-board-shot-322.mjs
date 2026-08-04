import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, "button-board-322.html");
const url = "file:///" + filePath.replace(/\\/g, "/");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(300);

const full = join(__dirname, "shots-322", "board-full.png");
await page.screenshot({ path: full, fullPage: true });
console.log("full page:", full);

// also grab a viewport-sized shot of the top (header + reco + V0 + V1) for a quick look
const top = join(__dirname, "shots-322", "board-top.png");
await page.screenshot({ path: top, fullPage: false });
console.log("top viewport:", top);

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
await browser.close();

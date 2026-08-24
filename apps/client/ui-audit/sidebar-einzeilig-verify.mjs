/**
 * Chef-Entscheid 24.08.: Sidebar-Beschriftungen bleiben EINZEILIG, die Schrift schrumpft.
 * Dieser Lauf belegt es — bei genau den Breiten, bei denen der Chef-Fund "WOODCUTTI"/"NG"
 * reproduzierbar war (der Bruch haengt an der Sidebar-Breite, nicht an der Fensteraufloesung).
 *
 * Geprueft wird beides: dass NICHTS mehr zweizeilig ist (Zeilenzahl je Beschriftung ueber
 * Range.getClientRects) und dass nichts ueberlaeuft (Textbreite gegen den freien Platz).
 * Dazu die Screenshots, weil eine gruene Messung in diesem Projekt schon dreimal gelogen hat.
 *
 * Eigener Harness JE SPRACHE: seine Sprachfixierung laeuft als addInitScript bei jeder
 * Navigation und ueberschreibt ein spaeter per localStorage gesetztes Locale wieder. Ein
 * erster Anlauf wechselte deshalb gar nicht die Sprache und mass dreimal Englisch — gruen,
 * aber wertlos, denn Deutsch und Russisch brechen zuerst.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "shots-sidebar-einzeilig");
mkdirSync(OUT, { recursive: true });

const BREITEN = [240, 200, 170, 150, 130];
const SPRACHEN = ["en", "de", "ru"];

let fehler = 0;

for (const locale of SPRACHEN) {
  const h = await startHarness({ port: 5350, fixture: "midgame", locale });
  const { page } = h;
  try {
    for (const breite of BREITEN) {
      await page.evaluate((b) => localStorage.setItem("gr.sidebarWidth", String(b)), breite);
      await page.reload({ waitUntil: "networkidle" });
      // state "attached": unter der Icon-Rail-Schwelle sind die Beschriftungen bewusst
      // ausgeblendet — auf SICHTBAR zu warten liesse den Lauf dort faelschlich scheitern.
      await page.waitForSelector(".sb-skill-name", { state: "attached", timeout: 20000 });
      // Rundgang wegklicken: er legt seine Sprechblase ueber die Mitte der Leiste und
      // verdeckt ausgerechnet WOODCUTTING. Escape schliesst ihn (registerEscCloser("guide")).
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600); // rAF-Messung durchlaufen lassen

      const befund = await page.evaluate(() => {
        const raus = [];
        for (const n of document.querySelectorAll(".sb-skill-name")) {
          const stil = getComputedStyle(n);
          if (stil.display === "none" || stil.visibility === "hidden") continue;
          const bereich = document.createRange();
          bereich.selectNodeContents(n);
          const kaesten = bereich.getClientRects();
          const textbreite = bereich.getBoundingClientRect().width;
          const platz =
            n.clientWidth -
            parseFloat(stil.paddingLeft || "0") -
            parseFloat(stil.paddingRight || "0");
          raus.push({
            text: (n.textContent || "").trim(),
            zeilen: kaesten.length,
            px: Math.round(parseFloat(stil.fontSize) * 10) / 10,
            ueberlauf: Math.round((textbreite - platz) * 10) / 10,
          });
        }
        return raus;
      });

      const zweizeilig = befund.filter((b) => b.zeilen > 1);
      const ueber = befund.filter((b) => b.ueberlauf > 0.5);
      fehler += zweizeilig.length + ueber.length;
      const kleinste = befund.reduce(
        (a, b) => (b.px < a.px ? b : a),
        befund[0] ?? { px: 0, text: "—" },
      );

      console.log(
        `${locale} @${breite}px  sichtbar ${befund.length}  zweizeilig ${zweizeilig.length}  ` +
          `ueberlaufend ${ueber.length}  kleinste ${kleinste.px}px (${kleinste.text})`,
      );
      for (const b of [...zweizeilig, ...ueber]) {
        console.log(`   ! ${b.text}: ${b.zeilen} Zeilen, ${b.px}px, Ueberlauf ${b.ueberlauf}px`);
      }

      const leiste = await page.$(".sidebar");
      await leiste.screenshot({ path: join(OUT, `${locale}-${breite}px.png`) });
    }
  } finally {
    await h.stop();
  }
}

console.log(
  `\n${fehler === 0 ? "OK — nichts zweizeilig, nichts ueberlaufend." : `${fehler} Beanstandungen.`}`,
);
console.log(`Bilder: ${OUT}`);

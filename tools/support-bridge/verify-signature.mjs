/**
 * Beweist, dass die Discord-Signaturpruefung nicht nur ablehnt, sondern auch ANNIMMT.
 *
 * Ein Endpunkt, der jede Anfrage mit 401 beantwortet, sieht sicher aus und ist trotzdem kaputt —
 * deshalb wird hier ein echtes Ed25519-Schluesselpaar erzeugt, ein Discord-PING damit signiert
 * und gegen den lokal laufenden Worker geschickt. Erwartet wird `{"type":1}` (Discords PONG).
 *
 * Ablauf:
 *   node verify-signature.mjs --keygen     -> schreibt .dev.vars mit dem oeffentlichen Schluessel
 *   npx wrangler dev --local --port 8799   -> neu starten, damit er .dev.vars liest
 *   node verify-signature.mjs              -> sendet gueltig UND verfaelscht
 */
import { generateKeyPairSync, sign as edSign, createPrivateKey } from "node:crypto";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const PORT = process.env.PORT ?? "8799";
const KEYFILE = ".dev-signing-key.json";

if (process.argv.includes("--keygen")) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  // Discord liefert den oeffentlichen Schluessel als 32 Byte in Hex. Der DER-Export traegt
  // 12 Byte Vorspann, die abgeschnitten werden.
  const pubHex = publicKey.export({ type: "spki", format: "der" }).subarray(12).toString("hex");
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
  writeFileSync(KEYFILE, JSON.stringify({ pubHex, privPem }), "utf8");
  writeFileSync(".dev.vars", `DISCORD_PUBLIC_KEY=${pubHex}\nDISCORD_BOT_TOKEN=nicht-echt\nDISCORD_CHANNEL_ID=0\n`, "utf8");
  console.log("Schluesselpaar erzeugt, .dev.vars geschrieben.");
  console.log("Jetzt `npx wrangler dev --local --port " + PORT + "` NEU starten, dann dieses Skript ohne --keygen.");
  process.exit(0);
}

if (!existsSync(KEYFILE)) {
  console.error("Kein Schluessel da. Erst `node verify-signature.mjs --keygen` ausfuehren.");
  process.exit(1);
}
const { privPem } = JSON.parse(readFileSync(KEYFILE, "utf8"));
const priv = createPrivateKey(privPem);

async function schicke(body, { verfaelschen = false } = {}) {
  const ts = String(Math.floor(Date.now() / 1000));
  const sigBuf = edSign(null, Buffer.from(ts + body), priv);
  let sig = sigBuf.toString("hex");
  if (verfaelschen) sig = (sig[0] === "a" ? "b" : "a") + sig.slice(1);
  const res = await fetch(`http://127.0.0.1:${PORT}/interactions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": sig,
      "x-signature-timestamp": ts,
    },
    body,
  });
  return { status: res.status, text: await res.text() };
}

const ping = JSON.stringify({ type: 1 });
const gueltig = await schicke(ping);
const gefaelscht = await schicke(ping, { verfaelschen: true });

console.log("gueltige Signatur   ->", gueltig.status, gueltig.text);
console.log("verfaelschte Sig.   ->", gefaelscht.status, gefaelscht.text);

const ok = gueltig.status === 200 && gueltig.text.includes('"type":1') && gefaelscht.status === 401;
console.log(ok ? "\nOK: nimmt Echtes an, weist Gefaelschtes ab." : "\nFEHLER: so wuerde Discord den Endpunkt nicht akzeptieren.");
process.exit(ok ? 0 : 1);

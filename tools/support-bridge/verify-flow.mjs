/**
 * Prueft den eigentlichen Ablauf gegen den lokal laufenden Worker:
 *   `/reply` (signiert wie von Discord)  ->  Abruf durch das Spiel  ->  Text kommt an.
 *
 * Setzt voraus, dass `node verify-signature.mjs --keygen` gelaufen ist und ein Ticket in KV
 * liegt (siehe README bzw. `wrangler kv key put --binding TICKETS --local`).
 */
import { sign as edSign, createPrivateKey } from "node:crypto";
import { readFileSync } from "node:fs";

const PORT = process.env.PORT ?? "8799";
const TICKET = process.env.TICKET ?? "GR-TESTA-TESTB";
const { privPem } = JSON.parse(readFileSync(".dev-signing-key.json", "utf8"));
const priv = createPrivateKey(privPem);

async function interaktion(payload) {
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = edSign(null, Buffer.from(ts + body), priv).toString("hex");
  const res = await fetch(`http://127.0.0.1:${PORT}/interactions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": sig,
      "x-signature-timestamp": ts,
    },
    body,
  });
  return res.json();
}

const TEXT = "New Haven ist nicht weg, es steht jetzt oben unter Combat.";

console.log("1) Chef tippt /reply …");
const antwort = await interaktion({
  type: 2,
  data: { name: "reply", options: [{ name: "ticket", value: TICKET }, { name: "text", value: TEXT }] },
});
console.log("   Discord zeigt dem Chef:", antwort?.data?.content);

console.log("2) Spiel fragt nach …");
const poll = await (await fetch(`http://127.0.0.1:${PORT}/poll?tickets=${TICKET}&since=0`)).json();
const nachrichten = poll.messages?.[TICKET] ?? [];
console.log("   erhalten:", JSON.stringify(nachrichten));

console.log("3) Spiel fragt erneut, diesmal mit since=1 (schon gelesen) …");
const poll2 = await (await fetch(`http://127.0.0.1:${PORT}/poll?tickets=${TICKET}&since=1`)).json();
console.log("   erhalten:", JSON.stringify(poll2.messages?.[TICKET] ?? []));

console.log("4) unbekanntes Ticket …");
const fehl = await interaktion({
  type: 2,
  data: { name: "reply", options: [{ name: "ticket", value: "GR-GIBTS-NICHT" }, { name: "text", value: "hallo" }] },
});
console.log("   Discord zeigt dem Chef:", fehl?.data?.content);

const ok =
  nachrichten.length === 1 &&
  nachrichten[0].text === TEXT &&
  nachrichten[0].from === "dev" &&
  (poll2.messages?.[TICKET] ?? []).length === 0 &&
  String(fehl?.data?.content ?? "").includes("kenne ich nicht");

console.log(ok ? "\nOK: Antwort kommt an, wird nicht doppelt geliefert, Tippfehler werden erkannt." : "\nFEHLER im Ablauf.");
process.exit(ok ? 0 : 1);

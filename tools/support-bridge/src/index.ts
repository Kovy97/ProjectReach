/**
 * Grim Reach — Support-Bruecke zwischen Spiel und Discord.
 *
 * Warum es das gibt: Das Spiel laeuft auf dem PC des Spielers und hat keine offene Verbindung
 * zu uns. Discord kann dorthin nichts schicken. Ein Rueckkanal ist deshalb immer eine Frage des
 * Spiels ("hast du was fuer mich?") — dieser Worker ist die Stelle, die antwortet.
 *
 * Warum ein Cloudflare Worker und kein Server: Ein normaler Discord-Bot muss dauerhaft an
 * Discords Gateway haengen und braucht dafuer eine laufende Maschine. Slash-Befehle gehen den
 * umgekehrten Weg — Discord RUFT eine hinterlegte Adresse AN. Damit muss nichts lauschen, und
 * es laeuft nichts, solange niemand schreibt.
 *
 * Vier Wege:
 *   POST /report        Spiel meldet etwas. Legt Ticket an, postet nach Discord, oeffnet Thread.
 *   POST /interactions  Discord ruft an, wenn der Chef `/reply <ticket> <text>` tippt.
 *   GET  /poll          Spiel fragt: gibt es Neues fuer diese Tickets?
 *   POST /message       Spieler antwortet aus dem Spiel; landet im selben Discord-Thread.
 *
 * Alles unter `KV`. Kein Zustand im Worker selbst (Worker sind zustandslos und koennen jederzeit
 * neu starten).
 */

export interface Env {
  TICKETS: KVNamespace;
  DISCORD_BOT_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_CHANNEL_ID: string;
}

/** Wie lange ein Ticket lebt, bevor es von selbst verschwindet (Sekunden). */
const TICKET_TTL_S = 90 * 24 * 60 * 60;
/** Obergrenze fuer Freitext — schuetzt KV und Discord gleichermassen. */
const MAX_TEXT = 4000;
/** Anfragen je IP und Minute. Grosszuegig genug fuer den Minuten-Takt des Spiels. */
const RATE_LIMIT = 60;

interface TicketRecord {
  threadId: string | null;
  created: number;
  seq: number;
}

interface Nachricht {
  seq: number;
  from: "dev" | "player";
  text: string;
  at: number;
}

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

// ── Discord-Signatur (Ed25519) ────────────────────────────────────────────────
// Discord unterschreibt JEDEN Aufruf an /interactions. Ohne Pruefung koennte jeder beliebige
// Antworten einspeisen — die Pruefung ist hier keine Kuer, sondern die Tuer selbst.
function hexZuBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function signaturGueltig(req: Request, body: string, publicKeyHex: string): Promise<boolean> {
  const sig = req.headers.get("x-signature-ed25519");
  const ts = req.headers.get("x-signature-timestamp");
  if (!sig || !ts) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexZuBytes(publicKeyHex),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      hexZuBytes(sig),
      new TextEncoder().encode(ts + body),
    );
  } catch {
    return false;
  }
}

// ── Discord-API ───────────────────────────────────────────────────────────────
async function discord(env: Env, pfad: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://discord.com/api/v10${pfad}`, {
    ...init,
    headers: {
      authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

// ── Hilfen ────────────────────────────────────────────────────────────────────
function neueTicketNummer(): string {
  // 10 Zeichen aus einem Alphabet ohne verwechselbare Zeichen (kein 0/O, kein 1/I/L).
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  // Gruppiert, damit ein Spieler sie vorlesen kann: GR-XXXXX-XXXXX
  return `GR-${s.slice(0, 5)}-${s.slice(5)}`;
}

async function rateLimitUeberschritten(env: Env, req: Request): Promise<boolean> {
  const ip = req.headers.get("cf-connecting-ip") ?? "unbekannt";
  const fenster = Math.floor(Date.now() / 60000);
  const key = `rl:${ip}:${fenster}`;
  const aktuell = Number((await env.TICKETS.get(key)) ?? "0");
  if (aktuell >= RATE_LIMIT) return true;
  await env.TICKETS.put(key, String(aktuell + 1), { expirationTtl: 120 });
  return false;
}

async function ladeTicket(env: Env, ticket: string): Promise<TicketRecord | null> {
  const raw = await env.TICKETS.get(`ticket:${ticket}`);
  return raw ? (JSON.parse(raw) as TicketRecord) : null;
}

async function ladeNachrichten(env: Env, ticket: string): Promise<Nachricht[]> {
  const raw = await env.TICKETS.get(`msgs:${ticket}`);
  return raw ? (JSON.parse(raw) as Nachricht[]) : [];
}

async function haengeAn(env: Env, ticket: string, rec: TicketRecord, n: Omit<Nachricht, "seq">): Promise<void> {
  const liste = await ladeNachrichten(env, ticket);
  rec.seq += 1;
  liste.push({ ...n, seq: rec.seq });
  await env.TICKETS.put(`msgs:${ticket}`, JSON.stringify(liste), { expirationTtl: TICKET_TTL_S });
  await env.TICKETS.put(`ticket:${ticket}`, JSON.stringify(rec), { expirationTtl: TICKET_TTL_S });
}

// ── POST /report ──────────────────────────────────────────────────────────────
async function report(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => null)) as
    | { text?: string; meta?: Record<string, string> }
    | null;
  const text = (body?.text ?? "").slice(0, MAX_TEXT).trim();
  if (!text) return json({ error: "leerer Bericht" }, 400);

  const ticket = neueTicketNummer();
  const meta = body?.meta ?? {};
  const metaZeilen = Object.entries(meta)
    .slice(0, 20)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 200)}`)
    .join("\n");

  // Nachricht im Kanal anlegen — mit Bot-Token, weil nur darauf ein Thread eroeffnet werden kann.
  const msgRes = await discord(env, `/channels/${env.DISCORD_CHANNEL_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `**Bug Report** \`${ticket}\`\n>>> ${text.slice(0, 1500)}`,
      embeds: metaZeilen ? [{ description: "```\n" + metaZeilen.slice(0, 3900) + "\n```" }] : undefined,
    }),
  });
  if (!msgRes.ok) return json({ error: "Discord abgelehnt", status: msgRes.status }, 502);
  const msg = (await msgRes.json()) as { id: string };

  // Thread eroeffnen: hier fuehrt der Chef spaeter das Gespraech.
  const threadRes = await discord(env, `/channels/${env.DISCORD_CHANNEL_ID}/messages/${msg.id}/threads`, {
    method: "POST",
    body: JSON.stringify({ name: `${ticket}`, auto_archive_duration: 10080 }),
  });
  const threadId = threadRes.ok ? ((await threadRes.json()) as { id: string }).id : null;

  const rec: TicketRecord = { threadId, created: Date.now(), seq: 0 };
  await env.TICKETS.put(`ticket:${ticket}`, JSON.stringify(rec), { expirationTtl: TICKET_TTL_S });
  return json({ ticket });
}

// ── POST /interactions (Discord ruft an) ──────────────────────────────────────
async function interactions(req: Request, env: Env, rawBody: string): Promise<Response> {
  const data = JSON.parse(rawBody) as {
    type: number;
    data?: { name?: string; options?: Array<{ name: string; value: string }> };
  };

  // Typ 1 = PING. Discord prueft damit beim Einrichten, ob die Adresse antwortet.
  if (data.type === 1) return json({ type: 1 });

  if (data.type === 2 && data.data?.name === "reply") {
    const opts = Object.fromEntries((data.data.options ?? []).map((o) => [o.name, o.value]));
    const ticket = String(opts.ticket ?? "").trim().toUpperCase();
    const text = String(opts.text ?? "").slice(0, MAX_TEXT).trim();

    const rec = await ladeTicket(env, ticket);
    if (!rec) {
      return json({
        type: 4,
        data: { content: `Ticket \`${ticket}\` kenne ich nicht (Tippfehler, oder aelter als 90 Tage).`, flags: 64 },
      });
    }
    if (!text) return json({ type: 4, data: { content: "Leerer Text, nichts gesendet.", flags: 64 } });

    await haengeAn(env, ticket, rec, { from: "dev", text, at: Date.now() });
    return json({
      type: 4,
      data: { content: `Zugestellt an \`${ticket}\`. Der Spieler sieht es beim naechsten Abruf.`, flags: 64 },
    });
  }

  return json({ type: 4, data: { content: "Unbekannter Befehl.", flags: 64 } });
}

// ── GET /poll ─────────────────────────────────────────────────────────────────
async function poll(url: URL, env: Env): Promise<Response> {
  const tickets = (url.searchParams.get("tickets") ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20);
  const since = Number(url.searchParams.get("since") ?? "0");

  const out: Record<string, Nachricht[]> = {};
  for (const t of tickets) {
    const liste = await ladeNachrichten(env, t);
    const neu = liste.filter((n) => n.seq > since && n.from === "dev");
    if (neu.length) out[t] = neu;
  }
  return json({ messages: out });
}

// ── POST /message (Spieler antwortet) ─────────────────────────────────────────
async function message(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { ticket?: string; text?: string } | null;
  const ticket = String(body?.ticket ?? "").trim().toUpperCase();
  const text = String(body?.text ?? "").slice(0, MAX_TEXT).trim();
  if (!ticket || !text) return json({ error: "ticket und text noetig" }, 400);

  const rec = await ladeTicket(env, ticket);
  if (!rec) return json({ error: "unbekanntes Ticket" }, 404);

  await haengeAn(env, ticket, rec, { from: "player", text, at: Date.now() });
  if (rec.threadId) {
    await discord(env, `/channels/${rec.threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: `**Spieler:** ${text.slice(0, 1800)}` }),
    });
  }
  return json({ ok: true });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // /interactions bringt seine eigene, staerkere Pruefung mit (Signatur) und ist bewusst vom
    // IP-Zaehler ausgenommen: Discord ruft aus wenigen festen Adressen an.
    if (url.pathname === "/interactions" && req.method === "POST") {
      const rawBody = await req.text();
      if (!(await signaturGueltig(req, rawBody, env.DISCORD_PUBLIC_KEY))) {
        return new Response("ungueltige Signatur", { status: 401 });
      }
      return interactions(req, env, rawBody);
    }

    if (await rateLimitUeberschritten(env, req)) {
      return json({ error: "zu viele Anfragen" }, 429);
    }

    if (url.pathname === "/report" && req.method === "POST") return report(req, env);
    if (url.pathname === "/poll" && req.method === "GET") return poll(url, env);
    if (url.pathname === "/message" && req.method === "POST") return message(req, env);
    if (url.pathname === "/health") {
      // Meldet auch, ob die Signatur-Maschinerie ueberhaupt arbeitsfaehig ist. Ohne das faellt
      // ein fehlender Schluessel oder eine nicht verfuegbare Ed25519-Implementierung erst dann
      // auf, wenn Discord den Endpunkt ablehnt — und dort sieht man nur "ungueltige Signatur",
      // nie den Grund. Der Schluessel selbst wird NICHT ausgegeben.
      let ed = "ok";
      try {
        await crypto.subtle.importKey("raw", new Uint8Array(32), { name: "Ed25519" }, false, ["verify"]);
      } catch (e) {
        ed = e instanceof Error ? e.message : String(e);
      }
      return json({
        ok: true,
        publicKeyGesetzt: typeof env.DISCORD_PUBLIC_KEY === "string" && env.DISCORD_PUBLIC_KEY.length === 64,
        botTokenGesetzt: !!env.DISCORD_BOT_TOKEN,
        kanalGesetzt: !!env.DISCORD_CHANNEL_ID,
        ed25519: ed,
      });
    }

    return new Response("nicht gefunden", { status: 404 });
  },
};

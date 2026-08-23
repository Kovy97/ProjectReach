/**
 * Registriert den Slash-Befehl `/reply` bei Discord. Einmal ausfuehren, danach nur wieder,
 * wenn sich der Befehl aendert.
 *
 *   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... node register-commands.mjs
 *
 * DISCORD_GUILD_ID ist optional. MIT Guild-Id ist der Befehl SOFORT da (nur auf deinem Server) —
 * das ist der Weg zum Ausprobieren. OHNE Guild-Id wird er global registriert und braucht bis zu
 * einer Stunde, bis Discord ihn ueberall ausgerollt hat.
 */
const APP_ID = process.env.DISCORD_APP_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!APP_ID || !TOKEN) {
  console.error("DISCORD_APP_ID und DISCORD_BOT_TOKEN muessen gesetzt sein.");
  process.exit(1);
}

const befehl = {
  name: "reply",
  description: "Antwortet einem Spieler im Spiel",
  options: [
    {
      name: "ticket",
      description: "Ticket-Nummer aus dem Report, z. B. GR-ABCDE-FGHIJ",
      type: 3, // STRING
      required: true,
    },
    {
      name: "text",
      description: "Was der Spieler lesen soll",
      type: 3,
      required: true,
    },
  ],
};

const url = GUILD_ID
  ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

const res = await fetch(url, {
  method: "POST",
  headers: { authorization: `Bot ${TOKEN}`, "content-type": "application/json" },
  body: JSON.stringify(befehl),
});

if (!res.ok) {
  console.error("Discord hat abgelehnt:", res.status, await res.text());
  process.exit(1);
}
console.log(GUILD_ID ? "/reply auf dem Server registriert (sofort nutzbar)." : "/reply global registriert (bis zu 1 Stunde).");

const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

// Client erstellen (Bot-Objekt)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const zeitenDatei = './zeiten.json';

// Wenn Datei nicht existiert, erstellen
if (!fs.existsSync(zeitenDatei)) {
  fs.writeFileSync(zeitenDatei, JSON.stringify({}));
}

// Stempel-Daten laden
let zeiten = JSON.parse(fs.readFileSync(zeitenDatei));

client.once('ready', () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
});

// Nachrichten auswerten
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const username = message.author.username;
  const content = message.content.toLowerCase();

  // 🔹 EINSTEMPELN
  if (content === '!ein') {
    if (zeiten[userId]?.eingestempelt) {
      return message.reply('⛔ Du bist bereits eingestempelt.');
    }

    zeiten[userId] = {
      name: username,
      einstempel: Date.now(),
      ausgestempelt: false,
    };
    fs.writeFileSync(zeitenDatei, JSON.stringify(zeiten, null, 2));
    return message.reply(`🕒 ${username}, du hast dich **eingestempelt**.`);
  }

  // 🔹 AUSSTEMPELN
  if (content === '!aus') {
    if (!zeiten[userId]?.einstempel || zeiten[userId].ausgestempelt) {
      return message.reply('⛔ Du bist aktuell **nicht eingestempelt**.');
    }

    const diff = Date.now() - zeiten[userId].einstempel;
    const minuten = Math.floor(diff / 60000);

    zeiten[userId].ausgestempelt = true;
    zeiten[userId].arbeitszeit = minuten;
    fs.writeFileSync(zeitenDatei, JSON.stringify(zeiten, null, 2));

    return message.reply(
      `✅ ${username}, du hast dich **ausgestempelt**.\n🕒 Arbeitszeit: **${minuten} Minuten**.`
    );
  }

  // 🔹 STATUS
  if (content === '!status') {
    const data = zeiten[userId];
    if (!data || data.ausgestempelt)
      return message.reply('ℹ️ Du bist **nicht eingestempelt**.');

    const diff = Math.floor((Date.now() - data.einstempel) / 60000);
    return message.reply(`👮 Du bist seit **${diff} Minuten** im Dienst.`);
  }

  // 🔹 ADMIN-BEFEHL: Gesamtübersicht
  if (content === '!liste' && message.member.permissions.has('Administrator')) {
    let antwort = '📋 **Aktuelle Arbeitszeiten:**\n';
    for (const id in zeiten) {
      const user = zeiten[id];
      const zeit = user.arbeitszeit
        ? `${user.arbeitszeit} Min`
        : user.ausgestempelt
        ? 'ausgestempelt'
        : 'eingestempelt';
      antwort += `👤 ${user.name}: ${zeit}\n`;
    }
    return message.reply(antwort);
  }
});

client.login(process.env.TOKEN);

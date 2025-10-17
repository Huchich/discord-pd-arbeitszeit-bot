// === MODULE ===
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// === ENVIRONMENT VARIABLES ===
const TOKEN = process.env.TOKEN;         // Discord Bot Token
const CLIENT_ID = process.env.CLIENT_ID; // Bot Application ID
const ROLLENNAME = 'Im Dienst';          // Name der Rolle, die vergeben wird

// === ZEITEN DATEI ===
const zeitenDatei = './zeiten.json';
if (!fs.existsSync(zeitenDatei)) fs.writeFileSync(zeitenDatei, JSON.stringify({}));
let zeiten = JSON.parse(fs.readFileSync(zeitenDatei, 'utf8'));

// === CLIENT ===
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// === SLASH COMMANDS AUTOMATISCH REGISTRIEREN ===
const commands = [
  new SlashCommandBuilder().setName('ein').setDescription('Einstempeln – Beginn deiner Dienstzeit'),
  new SlashCommandBuilder().setName('aus').setDescription('Ausstempeln – Ende deiner Dienstzeit'),
  new SlashCommandBuilder().setName('status').setDescription('Zeigt deine aktuelle Dienstzeit an'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Zeigt das Dienstzeit-Leaderboard an'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('📡 Slash-Commands werden registriert...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Slash-Commands erfolgreich registriert!');
  } catch (error) {
    console.error(error);
  }
})();

// === READY EVENT ===
client.once('ready', () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
});

// === INTERACTION HANDLER ===
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, member } = interaction;

  // 🔹 EINSTEMPELN
  if (commandName === 'ein') {
    if (zeiten[user.id]?.eingestempelt) {
      return interaction.reply({ content: '⛔ Du bist bereits eingestempelt.', ephemeral: true });
    }

    // Rolle vergeben
    const rolle = interaction.guild.roles.cache.find(r => r.name === ROLLENNAME);
    if (rolle) {
      await member.roles.add(rolle).catch(err => console.error('Rolle konnte nicht vergeben werden:', err));
    }

    zeiten[user.id] = {
      name: user.username,
      einstempel: Date.now(),
      gesamtzeit: zeiten[user.id]?.gesamtzeit || 0,
      eingestempelt: true,
    };
    fs.writeFileSync(zeitenDatei, JSON.stringify(zeiten, null, 2));
    return interaction.reply(`🕒 ${user.username}, du bist jetzt **im Dienst**.`);
  }

  // 🔹 AUSSTEMPELN
  if (commandName === 'aus') {
    if (!zeiten[user.id]?.eingestempelt) {
      return interaction.reply({ content: '⛔ Du bist aktuell **nicht eingestempelt**.', ephemeral: true });
    }

    const diff = Date.now() - zeiten[user.id].einstempel;
    const minuten = Math.floor(diff / 60000);

    // Rolle entfernen
    const rolle = interaction.guild.roles.cache.find(r => r.name === ROLLENNAME);
    if (rolle) {
      await member.roles.remove(rolle).catch(err => console.error('Rolle konnte nicht entfernt werden:', err));
    }

    zeiten[user.id].gesamtzeit += minuten;
    zeiten[user.id].eingestempelt = false;
    fs.writeFileSync(zeitenDatei, JSON.stringify(zeiten, null, 2));

    return interaction.reply(`✅ ${user.username}, du hast dich **ausgestempelt**.\n🕒 Arbeitszeit: **${minuten} Minuten**.`);
  }

  // 🔹 STATUS
  if (commandName === 'status') {
    const data = zeiten[user.id];
    if (!data) return interaction.reply('ℹ️ Du hast noch keine erfasste Dienstzeit.');

    const aktuell = data.eingestempelt ? Math.floor((Date.now() - data.einstempel) / 60000) : 0;
    const gesamt = (data.gesamtzeit + aktuell).toLocaleString('de-DE');

    return interaction.reply(`👮 ${user.username}, du hast insgesamt **${gesamt} Minuten** Dienstzeit.`);
  }

  // 🔹 LEADERBOARD
  if (commandName === 'leaderboard') {
    const sortiert = Object.values(zeiten)
      .sort((a, b) => b.gesamtzeit - a.gesamtzeit)
      .slice(0, 10);

    if (sortiert.length === 0) return interaction.reply('🏆 Noch keine Daten im Leaderboard.');

    const embed = new EmbedBuilder()
      .setTitle('🏆 Polizei-Leaderboard')
      .setColor('#007bff')
      .setDescription(
        sortiert.map((p, i) => `**${i + 1}.** ${p.name} — ${p.gesamtzeit.toLocaleString('de-DE')} Min`).join('\n')
      )
      .setFooter({ text: 'Dienstzeit insgesamt' });

    return interaction.reply({ embeds: [embed] });
  }
});

// === LOGIN ===
client.login(TOKEN);


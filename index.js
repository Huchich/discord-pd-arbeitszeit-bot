// === MODULE ===
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises; // async fs
const path = require('path');

// === ENVIRONMENT VARIABLES ===
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const ROLLENNAME = 'Im Dienst';
const ZEITEN_DATEI = path.join(__dirname, 'zeiten.json');

// === CLIENT ===
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// === ZEITEN LADEN ===
let zeiten = {};
async function ladeZeiten() {
  try {
    const data = await fs.readFile(ZEITEN_DATEI, 'utf8');
    zeiten = JSON.parse(data);
  } catch {
    zeiten = {};
  }
}
async function speichereZeiten() {
  try {
    await fs.writeFile(ZEITEN_DATEI, JSON.stringify(zeiten, null, 2));
  } catch (err) {
    console.error('Fehler beim Speichern der Zeiten:', err);
  }
}

// === SLASH COMMANDS AUTOMATISCH REGISTRIEREN ===
async function registriereCommands() {
  const commands = [
    new SlashCommandBuilder().setName('ein').setDescription('Einstempeln – Beginn deiner Dienstzeit'),
    new SlashCommandBuilder().setName('aus').setDescription('Ausstempeln – Ende deiner Dienstzeit'),
    new SlashCommandBuilder().setName('status').setDescription('Zeigt deine aktuelle Dienstzeit an'),
    new SlashCommandBuilder().setName('leaderboard').setDescription('Zeigt das Dienstzeit-Leaderboard an'),
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('📡 Slash-Commands werden registriert...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Slash-Commands erfolgreich registriert!');
  } catch (err) {
    console.error('Fehler bei der Registrierung der Commands:', err);
  }
}

// === READY EVENT ===
client.once('ready', async () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
  await ladeZeiten();
  await registriereCommands();
});

// === INTERACTION HANDLER ===
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, member, guild } = interaction;

  try {
    await ladeZeiten(); // immer aktuelle Zeiten laden

    // 🔹 EINSTEMPELN
    if (commandName === 'ein') {
      if (zeiten[user.id]?.eingestempelt) {
        return interaction.reply({ content: '⛔ Du bist bereits eingestempelt.', ephemeral: true });
      }

      // Rolle vergeben
      const rolle = guild.roles.cache.find(r => r.name === ROLLENNAME);
      if (rolle) {
        try {
          await member.roles.add(rolle);
        } catch (err) {
          console.error('Rolle konnte nicht vergeben werden:', err);
        }
      }

      // Zeit speichern
      zeiten[user.id] = {
        name: user.username,
        einstempel: Date.now(),
        gesamtzeit: zeiten[user.id]?.gesamtzeit || 0,
        eingestempelt: true,
      };
      await speichereZeiten();

      return interaction.reply(`🕒 ${user.username}, du bist jetzt **im Dienst**.`);
    }

    // 🔹 AUSSTEMPELN
    if (commandName === 'aus') {
      const data = zeiten[user.id];
      if (!data?.eingestempelt) {
        return interaction.reply({ content: '⛔ Du bist aktuell **nicht eingestempelt**.', ephemeral: true });
      }

      const diff = Date.now() - data.einstempel;
      const minuten = Math.floor(diff / 60000);

      // Rolle entfernen
      const rolle = guild.roles.cache.find(r => r.name === ROLLENNAME);
      if (rolle) {
        try {
          await member.roles.remove(rolle);
        } catch (err) {
          console.error('Rolle konnte nicht entfernt werden:', err);
        }
      }

      // Zeit speichern
      zeiten[user.id].gesamtzeit += minuten;
      zeiten[user.id].eingestempelt = false;
      await speichereZeiten();

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

  } catch (err) {
    console.error('Fehler im Command-Handler:', err);
    try {
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ Es ist ein Fehler aufgetreten.', ephemeral: true });
      }
    } catch {}
  }
});

// === LOGIN ===
client.login(TOKEN);



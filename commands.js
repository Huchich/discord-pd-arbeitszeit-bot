const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('ein')
    .setDescription('Einstempeln – Beginn deiner Dienstzeit'),
  new SlashCommandBuilder()
    .setName('aus')
    .setDescription('Ausstempeln – Ende deiner Dienstzeit'),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Zeigt deine aktuelle Dienstzeit an'),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Zeigt das Dienstzeit-Leaderboard an'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('📡 Slash-Commands werden registriert...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log('✅ Erfolgreich registriert!');
  } catch (error) {
    console.error(error);
  }
})();

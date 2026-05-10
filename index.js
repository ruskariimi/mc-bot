require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const HOST = process.env.MC_HOST;
const PORT = parseInt(process.env.MC_PORT) || 25565;
const CHANNEL_ID = process.env.STATUS_CHANNEL_ID;
const INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 60000;

function buildEmbed(online, result = null) {
  if (online) {
    return new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🟢 Server Online')
      .addFields(
        { name: 'IP', value: HOST, inline: true },
        { name: 'Players', value: `${result.players.online} / ${result.players.max}`, inline: true },
        { name: 'Version', value: result.version.name_clean, inline: true }
      )
      .setFooter({ text: 'Last checked' })
      .setTimestamp();
  } else {
    return new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🔴 Server Offline')
      .setDescription(`Could not reach \`${HOST}:${PORT}\``)
      .setFooter({ text: 'Last checked' })
      .setTimestamp();
  }
}

async function checkAndUpdate(statusMessage) {
  try {
    const response = await fetch(`https://api.mcstatus.io/v2/status/java/${HOST}:${PORT}`);
    const result = await response.json();

    if (!result.online) throw new Error('Offline');

    await statusMessage.edit({ embeds: [buildEmbed(true, result)] });
  } catch {
    await statusMessage.edit({ embeds: [buildEmbed(false)] });
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);

  const messages = await channel.messages.fetch({ limit: 10 });
  let statusMessage = messages.find(m => m.author.id === client.user.id);

  if (!statusMessage) {
    statusMessage = await channel.send({ embeds: [buildEmbed(false)] });
  }

  await checkAndUpdate(statusMessage);
  setInterval(() => checkAndUpdate(statusMessage), INTERVAL);
});

client.login(process.env.DISCORD_TOKEN);
// bot.js — Discord bot that listens for real server events and logs them to MongoDB

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Log } = require('./models');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

async function addLog(category, action, actor, target, detail) {
  try {
    await Log.create({ category, action, actor: actor || '', target: target || '', detail: detail || '' });
  } catch (err) {
    console.error('Failed to save log:', err.message);
  }
}

function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log('⚠️  DISCORD_BOT_TOKEN not set — bot logging disabled.');
    return;
  }

  client.once('ready', () => {
    console.log(`🤖 Discord bot logged in as ${client.user.tag}`);
  });

  // ---------- Member logs ----------
  client.on('guildMemberAdd', member => {
    addLog('member', 'joined the server', member.user.tag, '', '');
  });
  client.on('guildMemberRemove', member => {
    addLog('member', 'left the server', member.user.tag, '', '');
  });

  // ---------- Message logs ----------
  client.on('messageDelete', message => {
    if (!message.author) return;
    addLog('message', 'deleted a message', message.author.tag, `#${message.channel.name}`, message.content?.slice(0, 200) || '');
  });
  client.on('messageUpdate', (oldMsg, newMsg) => {
    if (!newMsg.author || oldMsg.content === newMsg.content) return;
    addLog('message', 'edited a message', newMsg.author.tag, `#${newMsg.channel.name}`, `"${oldMsg.content?.slice(0, 100)}" → "${newMsg.content?.slice(0, 100)}"`);
  });

  // ---------- Voice logs ----------
  client.on('voiceStateUpdate', (oldState, newState) => {
    const tag = newState.member?.user?.tag || oldState.member?.user?.tag || 'Unknown';
    if (!oldState.channel && newState.channel) {
      addLog('voice', 'joined voice channel', tag, newState.channel.name, '');
    } else if (oldState.channel && !newState.channel) {
      addLog('voice', 'left voice channel', tag, oldState.channel.name, '');
    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      addLog('voice', 'switched voice channel', tag, `${oldState.channel.name} → ${newState.channel.name}`, '');
    }
  });

  // ---------- Channel logs ----------
  client.on('channelCreate', channel => {
    addLog('channel', 'created channel', '', channel.name || '', '');
  });
  client.on('channelDelete', channel => {
    addLog('channel', 'deleted channel', '', channel.name || '', '');
  });

  // ---------- Role logs ----------
  client.on('roleCreate', role => {
    addLog('role', 'created role', '', role.name, '');
  });
  client.on('roleDelete', role => {
    addLog('role', 'deleted role', '', role.name, '');
  });

  // ---------- Server logs ----------
  client.on('guildUpdate', (oldGuild, newGuild) => {
    if (oldGuild.name !== newGuild.name) {
      addLog('server', 'renamed server', '', '', `${oldGuild.name} → ${newGuild.name}`);
    }
  });

  // ---------- Mod logs ----------
  client.on('guildBanAdd', ban => {
    addLog('mod', 'banned a member', '', ban.user.tag, '');
  });
  client.on('guildBanRemove', ban => {
    addLog('mod', 'unbanned a member', '', ban.user.tag, '');
  });

  client.login(token).catch(err => {
    console.error('Discord bot login failed:', err.message);
  });
}

module.exports = { startBot };

import { ChannelType } from 'discord.js';

// The only listing permitted to be removed by this task.
// Protect other vehicle listings, channels, and messages.
const CHANNEL_ID = '1570875068819579071'; // musclecar
const VEHICLE = 'Vigero ZX';
const PREFIX = String.fromCharCode(96).repeat(3) + '\n' + VEHICLE + '\n';

export async function removeVigeroZX(guild) {
  try {
    const channel = await guild.channels.fetch(CHANNEL_ID).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      console.error('[VIGERO REMOVE] Nie znaleziono kanalu musclecar.');
      return { confirmed: false, deleted: 0, reason: 'channel_missing' };
    }
    const messages = await channel.messages.fetch({ limit: 100 });
    // Delete ONLY the bot-authored message(s) beginning with the exact model label.
    // Covers accidental duplicate listings, and is safe across restarts.
    const matches = messages.filter(m =>
      m.author.id === guild.client.user.id && m.content.startsWith(PREFIX)
    );
    let deleted = 0;
    for (const msg of matches.values()) {
      try {
        await msg.delete();
        deleted++;
        console.log('[VIGERO REMOVE] Usunieto wpis '+msg.id+' z '+CHANNEL_ID);
      } catch (e) {
        console.error('[VIGERO REMOVE] Blad '+msg.id+': '+e.message);
      }
    }
    const check = await channel.messages.fetch({ limit: 100, cache: false });
    const remaining = check.filter(m =>
      m.author.id === guild.client.user.id && m.content.startsWith(PREFIX)
    );
    const confirmed = remaining.size === 0;
    console.log('[VIGERO REMOVE] Wynik: '+JSON.stringify({
      vehicle: VEHICLE, channelId: CHANNEL_ID, deleted, remaining: remaining.size, confirmed
    }));
    return { confirmed, deleted, remaining: remaining.size };
  } catch (error) {
    console.error('[VIGERO REMOVE] '+error.message);
    return { confirmed: false, deleted: 0, reason: error.message };
  }
}

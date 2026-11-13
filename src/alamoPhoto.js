import { readFile } from 'node:fs/promises';
import { AttachmentBuilder, ChannelType } from 'discord.js';

const CHANNEL_ID = '1570875064482668581';
const MODEL = 'Alamo 2700LX';
const FILENAME = 'alamo-2700lx-user-photo.webp';
const ASSET = new URL('../assets/alamo_2700lx_user.webp', import.meta.url);
const HEADER = String.fromCharCode(96).repeat(3) + '\n' + MODEL + '\n';

/**
 * Replaces the image attached to the EXISTING vehicle listing.
 * Does not send any messages and does not create any channels.
 */
export async function ensureAlamoPhoto(guild) {
  const channel = await guild.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error('[ALAMO] Nie znaleziono istniejacego kanalu off-road.');
    return { success: false, reason: 'channel_not_found' };
  }

  const messages = await channel.messages.fetch({ limit: 100 });
  const listing = messages.find(message =>
    message.author.id === guild.client.user.id &&
    message.content.startsWith(HEADER)
  );

  if (!listing) {
    console.error('[ALAMO] Nie znaleziono istniejacego wpisu dla ' + MODEL + '. Niczego nie publikowano.');
    return { success: false, reason: 'listing_not_found' };
  }

  const attachments = [...listing.attachments.values()];
  if (attachments.length === 1 && attachments[0].name === FILENAME && !listing.embeds.length) {
    console.log('[ALAMO] Zdjecie od uzytkownika juz jest w istniejacym wpisie: ' + listing.id);
    return { success: true, alreadyDone: true, messageId: listing.id };
  }

  const imageBytes = await readFile(ASSET);
  const imageFile = new AttachmentBuilder(imageBytes, {
    name: FILENAME,
    description: 'Alamo 2700LX — zdjecie przeslane przez wlasciciela serwera'
  });

  // attachments: [] removes previous attachments; files uploads exactly the new image.
  // Keep vehicle title and current IC price exactly as before.
  await listing.edit({
    content: listing.content,
    // Discord API v10 wymaga podania nowego pliku również na liście attachments.
    attachments: [{ id: 0, filename: FILENAME }],
    files: [imageFile],
    embeds: [],
    allowedMentions: { parse: [] }
  });

  const updated = await channel.messages.fetch(listing.id);
  const mediaList = [...updated.attachments.values()].map(a => ({ name: a.name, size: a.size, contentType: a.contentType }));
  console.log('[ALAMO DEBUG] Zalaczniki po edycji: ' + JSON.stringify(mediaList) + '; embedy=' + updated.embeds.length);
  const success = updated.attachments.size === 1 &&
    [...updated.attachments.values()][0].name === FILENAME;
  if (!success) {
    console.error('[ALAMO] Nie udalo sie potwierdzic podmiany zalacznika w ' + listing.id);
    return { success: false, reason: 'attachment_not_confirmed', messageId: listing.id };
  }

  console.log('[ALAMO] PODMIENIONO ZDJECIE: ' + CHANNEL_ID + '/' + listing.id +
    ', załączniki=1, stara grafika usunieta, nazwa i cena bez zmian.');
  return { success: true, alreadyDone: false, messageId: listing.id };
}

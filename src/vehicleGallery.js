import { AttachmentBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import sharp from 'sharp';
import catalogue from '../data/product_gallery.json' with { type: 'json' };
import { detectChannelSlug } from './catalog.js';

const CATEGORY_NAME = '━━ 🚘・POJAZDY FRAKCYJNE ━━';
const GROUPS = [
  { slug: 'off-road', emoji: '🚙' },
  { slug: 'sedany', emoji: '🚘' },
  { slug: 'coupe', emoji: '🏎️' },
  { slug: 'musclecar', emoji: '🏁' },
  { slug: 'pojazdy-sportowe', emoji: '🏎️' },
  { slug: 'pojazdy-transportowe', emoji: '🚐' }
];
const ALLOW_BOT = [
  PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles
];
const codeFence = String.fromCharCode(96).repeat(3);
const titleOf = (name) => codeFence + '\n' + name + '\n' + codeFence;

function isGroup(channel, slug) {
  if (!channel || channel.type !== ChannelType.GuildText) return false;
  if (detectChannelSlug(channel.name) === slug) return true;
  const group = GROUPS.find(g => g.slug === slug);
  if (group && channel.name === group.emoji + '--' + slug) return true;
  if (slug !== 'pojazdy-transportowe') return false;
  return channel.name.split(/[|│｜]/u).at(-1).trim() === slug;
}
function validImage(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'dunb17ur4ymx4.cloudfront.net' &&
      (/^\/(wysiwyg|packages\/images)\//u.test(u.pathname));
  } catch { return false; }
}
async function getImage(product, url, index) {
  if (!validImage(url)) throw new Error('Nieznane zrodlo obrazu');
  const response = await fetch(url, { signal: AbortSignal.timeout(28000) });
  if (!response.ok) throw new Error('CDN status ' + response.status);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > 28_000_000) throw new Error('Plik zbyt duzy');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 28_000_000) throw new Error('Plik zbyt duzy');
  const jpeg = await sharp(bytes, { limitInputPixels: 60_000_000 })
    .rotate().resize({ width: 1400, height: 1000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  if (jpeg.length > 7_000_000) throw new Error('Za duzy zalacznik');
  return new AttachmentBuilder(jpeg, { name: 'vehicle-' + product.id + '-' + (index + 1) + '.jpg' });
}
async function makeAttachments(product) {
  const list = [...new Set(product.images || [])].slice(0, 3);
  if (!list.length) list.push(product.cover);
  const out = [];
  for (const [index, url] of list.entries()) {
    try { out.push(await getImage(product, url, index)); }
    catch (error) { console.warn('[ZDJECIE] ' + product.name + ': ' + error.message); }
  }
  if (!out.length && product.cover && !list.includes(product.cover)) {
    try { out.push(await getImage(product, product.cover, 0)); }
    catch (error) { console.warn('[ZDJECIE] Okladka ' + product.name + ': ' + error.message); }
  }
  return out;
}

export async function ensureVehicleGallery(guild) {
  const me = await guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    console.log('[POJAZDY] Brak Manage Channels. Zatrzymano.');
    return { ready: false, posted: 0, reason: 'Missing ManageChannels' };
  }
  const products = catalogue.products;
  if (products.length !== 53 || new Set(products.map(x => x.id)).size !== 53) {
    throw new Error('Zbior pojazdow wymaga weryfikacji');
  }
  let all = await guild.channels.fetch();
  let category = all.find(x => x?.type === ChannelType.GuildCategory &&
    (x.name === CATEGORY_NAME || /POJAZDY FRAKCYJNE/i.test(x.name)));
  if (!category) {
    category = await guild.channels.create({ name: CATEGORY_NAME,
      type: ChannelType.GuildCategory, reason: 'Katalog pojazdow DreamLife Frakcje' });
    console.log('[POJAZDY] Utworzono kategorie: ' + category.id);
  }
  all = await guild.channels.fetch();
  const mapping = new Map();
  for (const group of GROUPS) {
    let channel = all.find(x => isGroup(x, group.slug));
    if (!channel) {
      channel = await guild.channels.create({
        name: group.emoji + '│' + group.slug,
        type: ChannelType.GuildText, parent: category.id,
        topic: 'Katalog pojazdów • ' + group.slug + ' • Noisiak Store',
        permissionOverwrites: [{ id: guild.client.user.id, allow: ALLOW_BOT }],
        reason: 'Katalog samochodow frakcyjnych wedlug typu'
      });
      console.log('[POJAZDY] Kanal ' + group.slug + ' utworzony: ' + channel.id);
    } else {
      console.log('[POJAZDY] Uzywam istniejacego ' + channel.name);
    }
    if (channel.parentId === category.id && channel.name === group.emoji + '--' + group.slug) {
      channel = await channel.setName(group.emoji + '│' + group.slug,
        'Wyrownanie wygladu nowo utworzonych kanalow pojazdow');
      console.log('[POJAZDY] Poprawiono nazwe: ' + channel.name);
    }
    mapping.set(group.slug, channel);
  }

  let posted = 0, skipped = 0, failed = 0;
  for (const group of GROUPS) {
    const channel = mapping.get(group.slug);
    const groupProducts = products.filter(x => x.category === group.slug);
    const perms = channel.permissionsFor(me);
    if (!perms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory])) {
      failed += groupProducts.length;
      console.warn('[POJAZDY] Brak uprawnien w ' + channel.name);
      continue;
    }
    if (!perms.has(PermissionFlagsBits.AttachFiles)) {
      try {
        await channel.permissionOverwrites.edit(guild.client.user.id,
          { AttachFiles: true, SendMessages: true, ViewChannel: true,
            ReadMessageHistory: true, EmbedLinks: true },
          { reason: 'Zdjecia pojazdow w katalogu DreamLife' });
      } catch (error) {
        console.warn('[POJAZDY] Nie mozna wlaczyc zalacznikow: ' + error.message);
      }
    }

    let messages;
    try { messages = await channel.messages.fetch({ limit: 100 }); }
    catch (error) {
      failed += groupProducts.length;
      console.warn('[POJAZDY] Odczyt ' + channel.name + ': ' + error.message);
      continue;
    }
    const seen = new Set(messages
      .filter(x => x.author.id === guild.client.user.id)
      .map(x => x.content.trim()));

    for (const product of groupProducts) {
      const content = titleOf(product.name);
      if (seen.has(content.trim())) { skipped++; continue; }
      try {
        const files = await makeAttachments(product);
        if (files.length) {
          await channel.send({ content, files, allowedMentions: { parse: [] } });
        } else if (validImage(product.cover)) {
          const embed = new EmbedBuilder().setColor(0x2563eb)
            .setImage(product.cover).setURL(product.url);
          await channel.send({ content, embeds: [embed], allowedMentions: { parse: [] } });
        } else {
          throw new Error('Brak prawidlowej fotografii pojazdu');
        }
        seen.add(content.trim());
        posted++;
        console.log('[POJAZDY] ' + channel.name + ': ' + product.name +
          ' (' + files.length + ' zdjec)');
      } catch (error) {
        failed++;
        console.error('[POJAZDY] Blad ' + product.name + ': ' + error.message);
      }
    }
  }
  console.log('[POJAZDY] ZAKONCZONO: dodano=' + posted + ', pominieto=' +
    skipped + ', bledy=' + failed + ', razem=' + products.length);
  return { ready: failed === 0, posted, skipped, failed,
    channels: Object.fromEntries([...mapping].map(([slug,c]) => [slug,c.id])) };
}

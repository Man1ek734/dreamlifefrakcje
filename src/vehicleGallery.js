import { AttachmentBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import sharp from 'sharp';
import catalogue from '../data/product_gallery.json' with { type: 'json' };
import prices from '../data/prices_ic.json' with { type: 'json' };

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
const titleOf = (name, price) => codeFence + '\n' + name + '\nCena IC: ' + String.fromCharCode(36) + price.toLocaleString('en-US').replaceAll(',', ' ') + '\n' + codeFence;

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

// Pierwszy komplet szesciu kanalow, utworzony 13.11.2026.
// ZACHOWAJ: sa tu oryginalne galerie, nie wolno ich usuwac.
const KEEP = Object.freeze({
  'off-road': '1570875064482668581',
  'sedany': '1570875066906972180',
  'coupe': '1570875067813072946',
  'musclecar': '1570875068819579071',
  'pojazdy-sportowe': '1570875069821882661',
  'pojazdy-transportowe': '1570875070773985320'
});
const MANAGED_CATEGORY_ID = '1570875062335307786';
const KNOWN_EXTRA = new Set([
  '1570875566385659974', '1570875568084353086',
  '1570875570504597635', '1570875571968155759',
  '1570875572891033770', '1570875574354710620',
  '1570876068372418590', '1570876070176104509',
  '1570876073263239380', '1570876074408149054',
  '1570876075775631454', '1570876085460144149'
]);

function duplicateMadeByBot(channel) {
  if (channel?.type !== ChannelType.GuildText || channel.parentId !== MANAGED_CATEGORY_ID) {
    return false;
  }
  if (Object.values(KEEP).includes(channel.id)) return false;
  // Usuwamy tylko 12 udokumentowanych duplikatów utworzonych przez tę aplikację.
  // Nie dotykamy innych kanałów, nawet jeśli mają identyczną nazwę.
  return KNOWN_EXTRA.has(channel.id);
}

export async function ensureVehicleGallery(guild) {
  // Żadna sciezka w tej funkcji nie tworzy ani nie przesuwa kanalow.
  // Nigdy nie tworz nowych kategorii ani nowych kanalow.
  const me = await guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.ViewChannel)) {
    return { ready: false, posted: 0, updated: 0, deleted: 0, failed: 53,
      reason: 'No ViewChannel permission' };
  }

  const products = catalogue.products;
  if (products.length !== 53 || new Set(products.map(p => p.id)).size !== 53 ||
      products.some(p => !Number.isInteger(prices[p.name]) || prices[p.name] <= 0)) {
    throw new Error('Katalog albo cennik IC jest niekompletny');
  }

  const all = await guild.channels.fetch();
  let deleted = 0, deleteFailed = 0;
  for (const channel of all.values()) {
    if (!duplicateMadeByBot(channel)) continue;
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      console.log('[PORZADEK] Brak ManageChannels; pomijam usuniecie ' + channel.id);
      deleteFailed++;
      continue;
    }
    try {
      // Ochrona przed usunieciem pierwszego kompletu.
      if (Object.values(KEEP).includes(channel.id)) continue;
      await channel.delete('Usuniecie powielonego kanalu stworzonego przez bota');
      deleted++;
      console.log('[PORZADEK] Usunieto DUPLIKAT ' + channel.name + ' (' + channel.id + ')');
    } catch (e) {
      deleteFailed++;
      console.error('[PORZADEK] Nie mozna usunac ' + channel.id + ': ' + e.message);
    }
  }
  console.log('[PORZADEK] Usuniete duplikaty: ' + deleted +
    ', bledy: ' + deleteFailed + '. Tworzenie kanalow jest wylaczone.');

  let posted = 0, updated = 0, skipped = 0, failed = 0;
  for (const group of GROUPS) {
    const originalId = KEEP[group.slug];
    const channel = await guild.channels.fetch(originalId).catch(() => null);
    const selected = products.filter(p => p.category === group.slug);
    if (!channel || channel.type !== ChannelType.GuildText ||
        channel.parentId !== MANAGED_CATEGORY_ID) {
      console.error('[POJAZDY] Brak oryginalnego kanalu ' + group.slug +
        ' (' + originalId + '). Nie tworze nowego.');
      failed += selected.length;
      continue;
    }
    const permissions = channel.permissionsFor(me);
    if (!permissions?.has([PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory])) {
      console.error('[POJAZDY] Brak dostepu do kanalu ' + channel.id);
      failed += selected.length;
      continue;
    }

    let messages;
    try {
      messages = await channel.messages.fetch({ limit: 100 });
    } catch (error) {
      console.error('[POJAZDY] Nie mozna odczytac ' + channel.id + ': ' + error.message);
      failed += selected.length;
      continue;
    }
    const own = messages.filter(m => m.author.id === guild.client.user.id);

    for (const product of selected) {
      const price = prices[product.name];
      const desired = titleOf(product.name, price);
      const marker = codeFence + '\n' + product.name + '\n';
      const previous = own.find(m => m.content.startsWith(marker));
      if (previous) {
        if (previous.content.trim() === desired.trim()) { skipped++; continue; }
        try {
          // Edytowanie WYŁĄCZNIE tresci: istniejace zalaczniki (zdjecia) zostaja.
          await previous.edit({ content: desired, attachments: [...previous.attachments.values()].map(a => ({ id: a.id })), allowedMentions: { parse: [] } });
          updated++;
          console.log('[CENA IC] ' + product.name + ': $' + price + ' (edycja wpisu)');
        } catch (error) {
          failed++;
          console.error('[CENA IC] Nie udalo sie edytowac ' + product.name + ': ' + error.message);
        }
        continue;
      }

      // Wyjątkowo wyslij NOWY wpis do ORYGINALNEGO kanalu,
      // tylko gdy nie istnieje wpis o danym samochodzie.
      try {
        const files = await makeAttachments(product);
        if (files.length) {
          await channel.send({ content: desired, files, allowedMentions: { parse: [] } });
        } else if (validImage(product.cover)) {
          const embed = new EmbedBuilder().setColor(0x2563eb)
            .setImage(product.cover).setURL(product.url);
          await channel.send({ content: desired, embeds: [embed], allowedMentions: { parse: [] } });
        } else {
          throw new Error('Brak zdjecia pojazdu');
        }
        posted++;
        console.log('[POJAZDY] Brakujacy wpis: ' + product.name + ' -> ' + channel.id);
      } catch (error) {
        failed++;
        console.error('[POJAZDY] Blad dodawania ' + product.name + ': ' + error.message);
      }
    }
  }
  console.log('[POJAZDY] GOTOWE: usunieto-duplikatow=' + deleted +
    ', ceny-zmieniono=' + updated + ', nowo-wyslane=' + posted +
    ', pominiete=' + skipped + ', bledy=' + failed + ', bledy-usuwania=' + deleteFailed);
  return { ready: failed + deleteFailed === 0, deleted, updated, posted, skipped,
    failed: failed + deleteFailed, channels: KEEP };
}

import http from 'node:http';
import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js';
import { CHANNELS, MANAGED_SLUGS, makeReport } from './catalog.js';
import { ensureShop, handleTicketInteraction } from './tickets.js';
import { ensureVehicleGallery } from './vehicleGallery.js';
import { ensureAlamoPhoto } from './alamoPhoto.js';
import { auditVehicleImages } from './auditVehicleImages.js';

const apiUrl = 'https://discord.com/api/v10';
const token = process.env.DISCORD_BOT_TOKEN?.trim() || process.env.DISCORD_TOCKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();
const applicationId = process.env.DISCORD_APPLICATION_ID?.trim() || '1570864803789144213';
const mode = process.argv[2] || 'serve';
const port = Number(process.env.PORT || 3000);
const catalogCars = Object.values(CHANNELS).reduce((n,x) => n + x.vehicles.length, 0);
const state = {
  online: false, inGuild: false, shopReady: false, status: 'starting',
  error: null, lastCheck: null, mappedChannels: 0, panelChannelId: null
};
let syncing = false;

async function api(route, method = 'GET', body) {
  const res = await fetch(apiUrl + route, {
    method,
    headers: { Authorization: 'Bot ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error('Discord API HTTP ' + res.status + ' ' + method + ' ' + route);
  return res.status === 204 ? null : res.json();
}

async function inspectOnly() {
  if (!token || !guildId) throw new Error('Brakuje DISCORD_BOT_TOKEN lub DISCORD_GUILD_ID');
  const bot = await api('/users/@me');
  if (bot.id !== applicationId) throw new Error('Token innej aplikacji Discord: ' + bot.id);
  const report = makeReport(await api('/guilds/' + guildId + '/channels'));
  console.log('[KATALOG] ' + bot.username + ': ' + report.matches.length + ' kanalow. Bez zmian.');
  for (const c of report.matches) console.log('  ' + c.name + ': ' + c.cars + ' aut');
  if (mode === '--apply-emojis') {
    for (const c of report.matches.filter(x => x.suggestedName)) {
      await api('/channels/' + c.id, 'PATCH', { name: c.suggestedName });
      console.log('[EMOJI] ' + c.name + ' -> ' + c.suggestedName);
    }
  }
  return report;
}

async function start() {
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' || !['/', '/health'].includes(request.url)) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'
    });
    response.end(JSON.stringify({
      service: 'dreamlifefrakcje', ...state, catalogCars,
      shopAutoSetup: true, categoryNamesPreserved: true
    }));
  });
  server.listen(port, '0.0.0.0', () => {
    console.log('[HTTP] Ready on port ' + port);
  });

  if (!token || !guildId) {
    state.status = 'setup_required';
    state.error = 'Brakuje zmiennych tokenu lub ID serwera Discord.';
    console.log('[SETUP] ' + state.error);
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    presence: { status: 'online', activities: [] }
  });

  async function synchronize() {
    if (!client.isReady() || syncing) return;
    syncing = true;
    try {
      const guild = client.guilds.cache.get(guildId) ||
        await client.guilds.fetch(guildId);
      state.inGuild = true;
      const channels = await guild.channels.fetch();
      const report = makeReport(channels);
      state.mappedChannels = report.matches.length;
      state.lastCheck = new Date().toISOString();
      console.log('[KATALOG] ' + report.matches.length +
        ' / ' + MANAGED_SLUGS.length + ' kategorii aut — bez zmian.');

      const shop = await ensureShop(guild);
      state.shopReady = shop.ready;
      state.panelChannelId = shop.panelChannelId || null;
      state.error = shop.ready ? null : shop.reason;
      state.status = shop.ready ? 'ready' : 'missing_permissions';
      if (shop.ready) console.log('[SKLEP] Panel: https://discord.com/channels/' +
        guildId + '/' + shop.panelChannelId);

      const gallery = await ensureVehicleGallery(guild);
      state.galleryReady = gallery.ready;
      state.galleryPublished = gallery.posted;
      state.galleryFailed = gallery.failed || 0;
      console.log('[KATALOG] Udostepniono galerie pojazdow: ' +
        (gallery.posted + (gallery.updated || 0) + (gallery.skipped || 0)) + ' z 53 modeli.');

      const alamoPhoto = await ensureAlamoPhoto(guild);
      state.alamoPhotoUpdated = alamoPhoto.success;
      state.alamoPhotoMessageId = alamoPhoto.messageId || null;
      if (!state.imageAuditCompleted){
        state.imageAuditCompleted=true;
        await auditVehicleImages(guild);
      }
    } catch (error) {
      state.inGuild = false;
      state.shopReady = false;
      state.error = error.message;
      state.status = 'guild_access_required';
      console.error('[DOSTEP] ' + error.message +
        '. Sprawdz, czy bot zostal dodany na serwer oraz ma uprawnienia.');
    } finally {
      syncing = false;
    }
  }

  client.once(Events.ClientReady, async ready => {
    if (ready.user.id !== applicationId) {
      state.status = 'incorrect_bot_token';
      state.error = 'Token jest przypisany do innej aplikacji niz ' + applicationId;
      console.error('[TOKEN] ' + state.error);
      await client.destroy();
      return;
    }
    state.online = true;
    state.status = 'online';
    ready.user.setPresence({ status: 'online', activities: [] });
    console.log('[ONLINE] Zalogowano bota ' + ready.user.tag + ' (' + ready.user.id + ')');
    await synchronize();
  });

  client.on(Events.GuildCreate, async guild => {
    if (guild.id === guildId) await synchronize();
  });
  client.on(Events.InteractionCreate, async interaction => {
    await handleTicketInteraction(interaction, guildId);
  });
  client.on(Events.Error, error => console.error('[GATEWAY] ' + error.message));
  setInterval(synchronize, 2 * 60 * 1000).unref();

  try {
    await client.login(token);
  } catch (error) {
    state.status = 'login_failed';
    state.error = error.message;
    console.error('[LOGIN] ' + error.message);
  }
  process.once('SIGTERM', () => {
    client.destroy();
    server.close();
  });
}

if (mode === 'serve') {
  start().catch(error => { console.error('[ERROR] ' + error.message); process.exitCode = 1; });
} else {
  inspectOnly().catch(error => { console.error('[ERROR] ' + error.message); process.exitCode = 1; });
}

import http from 'node:http';
import { CHANNELS, MANAGED_SLUGS, makeReport } from './catalog.js';

const apiUrl = 'https://discord.com/api/v10';
const token = process.env.DISCORD_BOT_TOKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();
const applicationId = process.env.DISCORD_APPLICATION_ID?.trim() || '1570864803789144213';
const mode = process.argv[2] || 'serve';
const port = Number(process.env.PORT || 3000);
const totalCars = Object.values(CHANNELS).reduce((sum, group) => sum + group.vehicles.length, 0);
const state = { connected: false, lastCheck: null, error: null, channelCount: 0 };

async function api(route, method = 'GET', body) {
  const response = await fetch(apiUrl + route, {
    method,
    headers: {
      Authorization: 'Bot ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Discord API HTTP ' + response.status + ' (' + method + ' ' + route + ')');
  return response.status === 204 ? null : response.json();
}

async function inspect() {
  if (!token || !guildId) throw new Error('Ustaw DISCORD_BOT_TOKEN i DISCORD_GUILD_ID w Railway Variables');
  const bot = await api('/users/@me');
  if (bot.id !== applicationId) throw new Error('Podany token nie nalezy do aplikacji Discord ' + applicationId);
  const report = makeReport(await api('/guilds/' + guildId + '/channels'));
  state.connected = true;
  state.lastCheck = new Date().toISOString();
  state.error = null;
  state.channelCount = report.matches.length;
  console.log('[READ ONLY] Bot ' + bot.username + ', serwer ' + guildId);
  for (const item of report.matches) {
    console.log('  ' + item.name + ' — ' + item.cars + ' aut' +
      (item.suggestedName ? ' — opcjonalne emoji: ' + item.suggestedName : ''));
  }
  if (report.missing.length) console.log('[INFO] Nie znaleziono kanalow: ' + report.missing.join(', '));
  if (report.ambiguities.length) console.log('[INFO] Zduplikowane kanaly: ' + report.ambiguities.join(', '));
  return report;
}

async function runOnce() {
  const report = await inspect();
  if (mode !== '--apply-emojis') {
    console.log('[PODGLAD] Zero wiadomosci, zero zmian na Discordzie.');
    return;
  }
  // To jest jedyna operacja edytowania: WYLACZNIE pole name, WYLACZNIE zamiana emoji.
  for (const item of report.matches.filter(x => x.suggestedName)) {
    await api('/channels/' + item.id, 'PATCH', { name: item.suggestedName });
    console.log('[EMOJI] ' + item.name + ' -> ' + item.suggestedName);
  }
  console.log('[ZAKONCZONO] Nic nie opublikowano na serwerze.');
}

if (mode !== 'serve') {
  runOnce().catch(error => { console.error('[ERROR] ' + error.message); process.exitCode = 1; });
} else {
  http.createServer((request, response) => {
    if (request.method !== 'GET' || !['/', '/health'].includes(request.url)) {
      response.writeHead(404).end('Not Found');
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ service: 'dreamlifefrakcje',
      status: state.connected ? 'ready' : token && guildId ? 'checking' : 'setup_required',
      sendsMessages: false, changesChannels: false, catalogCars: totalCars,
      mappedChannels: state.channelCount, lastCheck: state.lastCheck, error: state.error }));
  }).listen(port, '0.0.0.0', () => {
    console.log('[START] Tryb tylko do odczytu. Port: ' + port + '. Wiadomosci: 0.');
    console.log('[CATALOG] ' + MANAGED_SLUGS.length + ' kanalow, ' + totalCars + ' pojazdow.');
    if (!token || !guildId) console.log('[SETUP] Brakuje DISCORD_BOT_TOKEN lub DISCORD_GUILD_ID.');
  });
  if (token && guildId) {
    const check = () => inspect().catch(error => {
      state.connected = false;
      state.error = error.message;
      console.error('[ERROR] ' + error.message);
    });
    check();
    setInterval(check, 30 * 60 * 1000).unref();
  }
}

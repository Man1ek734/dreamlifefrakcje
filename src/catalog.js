import catalog from '../data/vehicles.json' with { type: 'json' };

export const CATALOG = catalog;
export const CHANNELS = Object.freeze(catalog.categories);
export const MANAGED_SLUGS = Object.freeze([
  'off-road', 'sedany', 'coupe', 'musclecar', 'pojazdy-sportowe'
]);

export function detectChannelSlug(name) {
  if (typeof name !== 'string') return null;
  const end = name.split(/[|│｜]/u).at(-1).trim();
  const key = end.toLocaleLowerCase('pl-PL').replace(/[\s_]+/g, '-');
  return MANAGED_SLUGS.includes(key) ? key : null;
}

export function suggestEmojiOnlyName(name, slug) {
  if (!MANAGED_SLUGS.includes(slug)) return null;
  const separatorAt = Math.max(name.lastIndexOf('|'), name.lastIndexOf('│'), name.lastIndexOf('｜'));
  if (separatorAt < 0) return null;
  const prefix = name.slice(0, separatorAt);
  const match = /\p{Extended_Pictographic}(?:[\uFE0E\uFE0F\u200D]|\p{Extended_Pictographic})*/u.exec(prefix);
  if (!match) return null;
  const proposed = name.slice(0, match.index) + CHANNELS[slug].emoji + name.slice(match.index + match[0].length);
  return proposed === name ? null : proposed;
}

export function makeReport(channels) {
  const matches = [];
  const counts = new Map();
  for (const channel of channels) {
    if (channel.type !== 0) continue;
    const slug = detectChannelSlug(channel.name);
    if (!slug) continue;
    matches.push({ id: channel.id, slug, name: channel.name,
      cars: CHANNELS[slug].vehicles.length,
      suggestedName: suggestEmojiOnlyName(channel.name, slug) });
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }
  for (const item of matches) {
    if (counts.get(item.slug) !== 1) item.suggestedName = null;
  }
  return { matches, missing: MANAGED_SLUGS.filter(s => !counts.has(s)),
    ambiguities: [...counts].filter(([, n]) => n > 1).map(([slug]) => slug) };
}

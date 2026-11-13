import {
 ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder,
 MessageFlags, PermissionFlagsBits
} from 'discord.js';

const CATEGORY_NAME = '━━ 🛒・ZAKUPY ━━';
const CHANNEL_NAME = '📩│stwórz-ticket';
const OPEN_ID = 'dreamlife_shop_open_v1';
const CLOSE_ID = 'dreamlife_shop_close_v1';
const CONFIRM_ID = 'dreamlife_shop_confirm_close_v1';
const CANCEL_ID = 'dreamlife_shop_cancel_close_v1';
const ACTIVE = new Set();

const button = (id, label, style, emoji) =>
  new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setEmoji(emoji);

function panelPayload(client) {
  const avatar = client.user.displayAvatarURL({ extension: 'png', size: 256 });
  const embed = new EmbedBuilder()
    .setColor(0x2577ff)
    .setAuthor({ name: 'DREAMLIFE • FRAKCJE', iconURL: avatar })
    .setTitle('🛒 Centrum zakupów pojazdów')
    .setDescription([
      '**Pojazdy służbowe dla Twojej frakcji — w jednym miejscu.**',
      '',
      'Chcesz złożyć zamówienie lub zapytać o dostępność samochodu? Utwórz prywatne zgłoszenie.',
      '',
      '**Jak to działa?**',
      '① Kliknij **Stwórz ticket**.',
      '② Podaj nazwę frakcji i pojazd, który Cię interesuje.',
      '③ Obsługa skontaktuje się z Tobą w zgłoszeniu.',
      '',
      '🔒 Ticket jest widoczny wyłącznie dla Ciebie i uprawnionej obsługi.'
    ].join('\n'))
    .setThumbnail(avatar)
    .setFooter({ text: 'DreamLife Frakcje • Sklep pojazdów' });
  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        button(OPEN_ID, 'Stwórz ticket', ButtonStyle.Primary, '🎫')
      )
    ],
    allowedMentions: { parse: [] }
  };
}

function hasPanelButton(message) {
  return message.components?.some(row =>
    row.components?.some(component => component.customId === OPEN_ID)
  );
}

async function fetchChannels(guild) {
  return guild.channels.fetch();
}

function selectShopCategory(channels) {
  return channels.find(x => x?.type === ChannelType.GuildCategory && x.name === CATEGORY_NAME)
    || channels.find(x => x?.type === ChannelType.GuildCategory && /ZAKUPY/i.test(x.name));
}

function selectPanel(channels, categoryId) {
  return channels.find(x =>
    x?.type === ChannelType.GuildText && x.parentId === categoryId &&
    /stw[oó]rz[\s-]*ticket/i.test(x.name)
  );
}

export async function ensureShop(guild) {
  const me = await guild.members.fetchMe();
  const perms = me.permissions;
  const necessary = [
    ['ManageChannels', PermissionFlagsBits.ManageChannels],
    ['ViewChannel', PermissionFlagsBits.ViewChannel],
    ['SendMessages', PermissionFlagsBits.SendMessages],
    ['EmbedLinks', PermissionFlagsBits.EmbedLinks],
    ['ReadMessageHistory', PermissionFlagsBits.ReadMessageHistory]
  ];
  const missing = necessary.filter(([,flag]) => !perms.has(flag)).map(([name]) => name);
  if (missing.length) {
    console.log('[SKLEP] Brak uprawnien: ' + missing.join(', ') + '. Nie zmieniam serwera.');
    return { ready: false, reason: 'Missing permissions: ' + missing.join(', ') };
  }

  let channels = await fetchChannels(guild);
  let category = selectShopCategory(channels);
  if (!category) {
    category = await guild.channels.create({
      name: CATEGORY_NAME, type: ChannelType.GuildCategory,
      reason: 'DreamLife Frakcje — strefa zakupów'
    });
    console.log('[SKLEP] Utworzono kategorie: ' + category.id);
  }
  channels = await fetchChannels(guild);
  let panelChannel = selectPanel(channels, category.id);
  if (!panelChannel) {
    panelChannel = await guild.channels.create({
      name: CHANNEL_NAME, type: ChannelType.GuildText, parent: category.id,
      topic: 'DreamLife Frakcje — centrum zakupów pojazdów. Ticket utworzysz przyciskiem.',
      reason: 'DreamLife Frakcje — kanal do zamowien'
    });
    console.log('[SKLEP] Utworzono kanal: ' + panelChannel.id);
  }

  const channelPerms = panelChannel.permissionsFor(me);
  if (!channelPerms?.has([
    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory
  ])) {
    console.log('[SKLEP] Nie mam praw odczytu/wysylania w kanale: ' + panelChannel.id);
    return { ready: false, reason: 'Missing channel permissions', panelChannelId: panelChannel.id };
  }

  const messages = await panelChannel.messages.fetch({ limit: 100 });
  const existing = messages.find(m => m.author.id === guild.client.user.id && hasPanelButton(m));
  if (!existing) {
    const panel = await panelChannel.send(panelPayload(guild.client));
    console.log('[SKLEP] Opublikowano JEDEN panel ticketow: ' + panel.id);
  } else {
    console.log('[SKLEP] Panel juz istnieje: ' + existing.id + '. Nie wysylam kopii.');
  }
  return { ready: true, categoryId: category.id, panelChannelId: panelChannel.id };
}

function ticketOwner(channel) {
  const match = /^dlshop-owner:(\d{17,20});active$/u.exec(channel.topic || '');
  return match?.[1] || null;
}

function ticketEmbed(user) {
  return new EmbedBuilder().setColor(0x2577ff)
    .setTitle('🎫 Twoje zgłoszenie zakupowe')
    .setDescription([
      'Witaj, ' + user.toString() + '!',
      '',
      '**Wpisz w tym kanale:**',
      '• nazwę frakcji,',
      '• nazwę wybranego pojazdu,',
      '• dodatkowe pytania lub wymagania.',
      '',
      'Gdy obsługa odpowie, wszystkie ustalenia pozostaną w tym zgłoszeniu.'
    ].join('\n'))
    .setFooter({ text: 'DreamLife Frakcje • Dziękujemy za zgłoszenie' });
}

async function createTicket(interaction) {
  if (ACTIVE.has(interaction.user.id)) {
    return interaction.reply({ content: 'Twoje zgłoszenie jest już tworzone. Spróbuj za chwilę.', flags: MessageFlags.Ephemeral });
  }
  ACTIVE.add(interaction.user.id);
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const guild = interaction.guild;
    const channels = await fetchChannels(guild);
    const existing = channels.find(x =>
      x?.type === ChannelType.GuildText && ticketOwner(x) === interaction.user.id
    );
    if (existing) {
      return interaction.editReply({ content: 'Masz już otwarty ticket: <#' + existing.id + '>' });
    }

    const category = selectShopCategory(channels);
    if (!category) return interaction.editReply({ content: 'Panel zakupów nie jest jeszcze skonfigurowany.' });

    const userKey = interaction.user.id.slice(-7);
    const permissions = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id, allow: [
          PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks
        ]
      },
      { id: guild.client.user.id, allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels
      ] }
    ];
    const staffId = process.env.DISCORD_TICKET_STAFF_ROLE_ID?.trim();
    if (staffId && guild.roles.cache.has(staffId)) {
      permissions.push({
        id: staffId, allow: [
          PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }

    const ticket = await guild.channels.create({
      name: 'ticket-' + userKey,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: permissions,
      topic: 'dlshop-owner:' + interaction.user.id + ';active',
      reason: 'Ticket zakupowy DreamLife Frakcje'
    });
    await ticket.send({
      embeds: [ticketEmbed(interaction.user)],
      components: [
        new ActionRowBuilder().addComponents(
          button(CLOSE_ID, 'Zamknij ticket', ButtonStyle.Secondary, '🔒')
        )
      ],
      allowedMentions: { parse: [] }
    });
    console.log('[TICKET] Utworzono ticket ' + ticket.id + ' dla ' + interaction.user.id);
    return interaction.editReply({ content: '✅ Utworzyłem Twój prywatny ticket: <#' + ticket.id + '>' });
  } catch (error) {
    console.error('[TICKET] Blad tworzenia: ' + error.message);
    const msg = 'Nie udało się utworzyć ticketu. Zgłoś to administratorowi (uprawnienia bota).';
    if (interaction.deferred || interaction.replied) return interaction.editReply({ content: msg }).catch(() => {});
    return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
  } finally {
    ACTIVE.delete(interaction.user.id);
  }
}

async function closeTicket(interaction, confirm) {
  const channel = interaction.channel;
  const owner = ticketOwner(channel);
  if (!owner) return interaction.reply({ content: 'To nie jest aktywny ticket zakupowy.', flags: MessageFlags.Ephemeral });
  const isAuthorized = interaction.user.id === owner ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
  if (!isAuthorized) return interaction.reply({ content: 'Nie możesz zamknąć tego ticketu.', flags: MessageFlags.Ephemeral });

  if (!confirm) {
    return interaction.reply({
      content: 'Czy na pewno zamknąć ticket? Kanał zostanie usunięty.',
      flags: MessageFlags.Ephemeral,
      components: [new ActionRowBuilder().addComponents(
        button(CONFIRM_ID, 'Tak, zamknij', ButtonStyle.Danger, '✅'),
        button(CANCEL_ID, 'Anuluj', ButtonStyle.Secondary, '↩️')
      )]
    });
  }
  await interaction.update({ content: '✅ Ticket został zamknięty.', components: [] });
  await channel.delete('Ticket zamkniety na prosbe ' + interaction.user.id);
  console.log('[TICKET] Zamknieto ' + channel.id);
}

export async function handleTicketInteraction(interaction, targetGuildId) {
  if (!interaction.isButton()) return;
  if (interaction.guildId !== targetGuildId) return;
  try {
    switch (interaction.customId) {
      case OPEN_ID: return await createTicket(interaction);
      case CLOSE_ID: return await closeTicket(interaction, false);
      case CONFIRM_ID: return await closeTicket(interaction, true);
      case CANCEL_ID: return await interaction.update({ content: 'Anulowano zamknięcie ticketu.', components: [] });
      default: return;
    }
  } catch (err) {
    console.error('[TICKET] Blad interakcji: ' + err.message);
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({ content: 'Wystąpił błąd. Spróbuj ponownie.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
}

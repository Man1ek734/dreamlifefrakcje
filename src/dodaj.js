import {
  ApplicationCommandOptionType, ApplicationCommandType,
  ChannelType, MessageFlags, PermissionFlagsBits
} from 'discord.js';

const COMMAND_NAME = 'dodaj';
const SHOP_CATEGORY_ID = '1570871157870166179';
const TICKET_TOPIC = /^dlshop-owner:(\d{17,20});active(?:;number:\d+)?$/u;
const NAME = /^ticket-\d+$/u;

const COMMAND = {
  name: COMMAND_NAME,
  description: 'Dodaj osobę do aktualnego ticketu',
  type: ApplicationCommandType.ChatInput,
  options: [{
    name: 'osoba',
    description: 'Użytkownik, którego chcesz dodać do ticketu',
    type: ApplicationCommandOptionType.User,
    required: true
  }]
};

export function getTicketOwner(channel) {
  if (channel?.type !== ChannelType.GuildText ||
      channel.parentId !== SHOP_CATEGORY_ID || !NAME.test(channel.name)) return null;
  return TICKET_TOPIC.exec(channel.topic || '')?.[1] || null;
}

let commandRegistered = false;

export async function registerDodajCommand(guild) {
  if (commandRegistered) return;
  const existing = (await guild.commands.fetch()).find(cmd =>
    cmd.name === COMMAND_NAME && cmd.type === ApplicationCommandType.ChatInput
  );
  if (!existing) {
    await guild.commands.create(COMMAND);
    console.log('[DODAJ] Zarejestrowano komende /dodaj w serwerze '+guild.id);
  } else {
    const option = existing.options?.[0];
    const upToDate = existing.description === COMMAND.description &&
      existing.options?.length === 1 && option?.name === 'osoba' &&
      option?.type === ApplicationCommandOptionType.User && option?.required;
    if (!upToDate) {
      await existing.edit(COMMAND);
      console.log('[DODAJ] Zaktualizowano komende /dodaj');
    } else {
      console.log('[DODAJ] Komenda /dodaj jest juz zarejestrowana.');
    }
  }
  commandRegistered = true;
}

export async function handleDodajCommand(interaction, guildId) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== COMMAND_NAME) return;
  if (interaction.guildId !== guildId || !interaction.guild) {
    await interaction.reply({ content: 'Ta komenda jest dostępna tylko na serwerze DreamLife Frakcje.',
      flags: MessageFlags.Ephemeral });
    return;
  }
  const channel = interaction.channel;
  const ownerId = getTicketOwner(channel);
  if (!ownerId) {
    await interaction.reply({
      content: '❌ Komenda **/dodaj** działa tylko wewnątrz otwartego ticketu zakupowego.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const requester = await interaction.guild.members.fetch(interaction.user.id);
    const staffRole = process.env.DISCORD_TICKET_STAFF_ROLE_ID?.trim();
    const isStaff = Boolean(staffRole && requester.roles.cache.has(staffRole));
    const isManager = requester.permissionsIn(channel).has(
      PermissionFlagsBits.ManageChannels
    ) || requester.permissions.has(PermissionFlagsBits.Administrator);
    if (interaction.user.id !== ownerId && !isStaff && !isManager) {
      await interaction.editReply(
        '❌ Dodawać użytkowników mogą właściciel ticketu oraz obsługa.'
      );
      return;
    }

    const user = interaction.options.getUser('osoba', true);
    if (user.id === interaction.client.user.id) {
      await interaction.editReply('Bot ma już dostęp do tego ticketu.');
      return;
    }
    const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!targetMember) {
      await interaction.editReply('❌ Wybranej osoby nie ma na tym serwerze.');
      return;
    }
    const previous = channel.permissionOverwrites.cache.get(user.id);
    if (previous?.allow.has(PermissionFlagsBits.ViewChannel) &&
        previous.allow.has(PermissionFlagsBits.SendMessages) &&
        previous.allow.has(PermissionFlagsBits.ReadMessageHistory)) {
      await interaction.editReply('Ta osoba ma już dostęp do ticketu.');
      return;
    }

    // Explicit per-user overwrite preserves all existing ticket participants and staff role.
    await channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
      EmbedLinks: true, AttachFiles: true
    }, { reason: '/dodaj — dodał ' + interaction.user.id });
    await interaction.editReply({
      content: '✅ Dodano <@' + user.id + '> do <#' + channel.id + '>.' ,
      allowedMentions: { parse: [] }
    });
    console.log('[DODAJ] '+interaction.user.id+' dodal '+user.id+' do ticketu '+channel.id);
  } catch (error) {
    console.error('[DODAJ] '+error.message);
    await interaction.editReply('❌ Nie udało się dodać osoby. Sprawdź uprawnienia bota do zarządzania uprawnieniami kanału.');
  }
}

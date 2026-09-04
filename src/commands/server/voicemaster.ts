import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";
import {
  getVoicemasterData,
  updateVoicemasterData,
} from "../../database/helpers";
import {
  promiseChannel,
  promiseMember,
  promiseRole,
} from "../../utils/promise";

export async function checkIfVcOwner(message: Message): Promise<boolean> {
  const vc = message.member?.voice.channel;

  if (!vc) {
    await send(message, {
      embeds: [
        Embeds.warning(
          `${message.author}: You aren't in a **VoiceMaster Channel**.`,
        ),
      ],
    });
    return false;
  }

  const voicemasterData = await getVoicemasterData(message.guildId!, false);
  if (!voicemasterData) {
    await send(message, {
      embeds: [
        Embeds.warning(
          `${message.author}: The **VoiceMaster Feature** isn't setup.`,
        ),
      ],
    });
    return false;
  }

  const activeChannels = voicemasterData.active_channels || {};
  const channelData = activeChannels[vc.id];

  if (!channelData) {
    await send(message, {
      embeds: [
        Embeds.warning(
          `${message.author}: You aren't in a **VoiceMaster Channel**.`,
        ),
      ],
    });
    return false;
  }

  if (channelData.owner !== message.author.id) {
    await send(message, {
      embeds: [
        Embeds.warning(
          `${message.author}: You aren't **the owner** of this **VoiceMaster Channel**.`,
        ),
      ],
    });
    return false;
  }

  return true;
}

// reusable helper to generate the VoiceMaster interface payload
function buildInterfacePayload(client: evClient) {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${client.user?.username} VoiceMaster`,
      iconURL: client.user?.displayAvatarURL({ size: 512 }),
    })
    .setTitle("<:mictheme:1545027633828462673> VoiceMaster Interface")
    .setDescription(
      "Click the buttons below to manage your personal VoiceMaster Channel.\n\n" +
        "<:lock:1545027174401179738> **Lock** - Deny everyone from joining\n" +
        "<:unlock:1545027173021122571> **Unlock** - Allow everyone to join\n" +
        "<:eyeoff:1545019719545790534> **Hide** - Hide channel from the list\n" +
        "<:eye:1545019700579270736> **Unhide** - Reveal the channel\n" +
        "<:crown:1545027170555011122> **Claim** - Take ownership of an ownerless channel\n\n" +
        "<:pencil:1545027171829944360> **Rename** - Change the channel name\n" +
        "<:users:1545027168797720586> **Limit** - Set a user limit\n" +
        "<:useraccept:1545027167195242516> **Allow** - Grant a user access\n" +
        "<:userdenied:1545027165337423882> **Kick** - Remove and deny a user",
    )
    .setColor(Colours.theme);

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("vm_lock")
      .setEmoji("1545027174401179738")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vm_unlock")
      .setEmoji("1545027173021122571")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vm_hide")
      .setEmoji("1545019719545790534")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vm_unhide")
      .setEmoji("1545019700579270736")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vm_claim")
      .setEmoji("1545027170555011122")
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("vm_rename")
      .setEmoji("1545027171829944360")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vm_limit")
      .setEmoji("1545027168797720586")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vm_allow")
      .setEmoji("1545027167195242516")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vm_kick")
      .setEmoji("1545027165337423882")
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row1, row2] };
}

const command: Command = {
  name: "voicemaster",
  description: "Manage the servers VoiceMaster configuration.",

  aliases: ["vc", "vm", "voice"],

  guild_only: true,

  syntax: "(subcommand) (arguments)",
  example: "status Watching The Polar Express",

  cooldown: {
    limit: 2,
    duration: 5,
    type: "member",
  },

  subCommands: [
    {
      name: "setup",
      description: "Setup the VoiceMaster feature.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      requiredClientPermissions: [PermissionFlagsBits.Administrator],

      syntax: "(subcommand) (arguments)",
      example: "rename Watching The Polar Express",

      cooldown: {
        limit: 1,
        duration: 30,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const voicemasterData = await getVoicemasterData(
          message.guildId!,
          true,
        );
        if (!voicemasterData) return;

        const config = voicemasterData.configuration || {};

        const creationChannelId = config.creation_channel;
        const interfaceChannelId = config.interface_channel;
        const categoryId = config.category_id;

        const existingCreation = creationChannelId
          ? await promiseChannel(message.guild!, String(creationChannelId))
          : null;
        const existingInterface = interfaceChannelId
          ? await promiseChannel(message.guild!, String(interfaceChannelId))
          : null;
        let existingCategory = categoryId
          ? await promiseChannel(message.guild!, String(categoryId))
          : null;

        if (existingCreation && existingInterface) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: VoiceMaster is **already setup**: <#${existingCreation.id}>, <#${existingInterface.id}>.`,
              ),
            ],
          });
          return;
        }

        if (!existingCategory) {
          existingCategory = await message.guild!.channels.create({
            name: "VoiceMaster",
            type: ChannelType.GuildCategory,
          });
        }

        let newInterface = existingInterface;
        let newCreation = existingCreation;

        if (!newInterface) {
          newInterface = await message.guild!.channels.create({
            name: "interface",
            type: ChannelType.GuildText,
            parent: existingCategory.id,
            permissionOverwrites: [
              {
                id: message.guild!.roles.everyone.id,
                deny: [PermissionFlagsBits.SendMessages],
                allow: [PermissionFlagsBits.ViewChannel],
              },
            ],
          });

          // auto send the UI embed into the newly created interface channel
          if (newInterface.isTextBased()) {
            await newInterface.send(buildInterfacePayload(client));
          }
        }

        if (!newCreation) {
          newCreation = await message.guild!.channels.create({
            name: "Join to Create",
            type: ChannelType.GuildVoice,
            parent: existingCategory.id,
          });
        }

        const updatedConfig = {
          ...config,
          category_id: existingCategory.id,
          interface_channel: newInterface.id,
          creation_channel: newCreation.id,
        };

        await updateVoicemasterData(message.guildId!, {
          configuration: updatedConfig,
        });

        const actionStr =
          existingCreation || existingInterface ? "repaired" : "setup";

        await send(message, {
          embeds: [
            Embeds.approve(
              `${message.author}: Successfully **${actionStr}** VoiceMaster. Interface channel: <#${newInterface.id}>, Voice Channel: <#${newCreation.id}>.`,
            ),
          ],
        });
      },
    },
    {
      name: "claim",
      description: "Claim a VoiceMaster channel.",

      guild_only: true,

      cooldown: {
        limit: 2,
        duration: 15,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const vc = message.member?.voice.channel;

        const isSafe = await checkIfVcOwner(message);
        if (!isSafe || !vc) return;

        const voicemasterData = await getVoicemasterData(
          message.guildId!,
          false,
        );
        if (!voicemasterData) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: The **VoiceMaster Feature** isn't setup.`,
              ),
            ],
          });
          return;
        }

        const activeChannels = voicemasterData.active_channels || {};
        const channelData = activeChannels[vc.id];

        if (!channelData) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: You are not in a **VoiceMaster Channel**.`,
              ),
            ],
          });
          return;
        }
        if (channelData.owner === message.author.id) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: You **already own** this channel.`,
              ),
            ],
          });
          return;
        }

        if (channelData.owner && vc.members.has(channelData.owner)) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: The **owner** of this **VoiceMaster Channel** is still here.`,
              ),
            ],
          });
          return;
        }

        try {
          await vc.permissionOverwrites.edit(message.author.id, {
            ManageChannels: true,
            ManageRoles: true,
            MoveMembers: true,
            Connect: true,
            ViewChannel: true,
            MuteMembers: true,
            DeafenMembers: true,
          });
          activeChannels[vc.id].onwer = message.author.id;

          await updateVoicemasterData(message.guildId!, {
            active_channels: activeChannels,
          });

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: You are now the **owner** of <#${vc.id}>.`,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}`)],
          });
        }
      },
    },
    {
      name: "rename",
      description: "Rename your VoiceMaster Channel.",

      guild_only: true,

      cooldown: {
        limit: 1,
        duration: 60 * 5,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const vc = message.member?.voice.channel;

        const isSafe = await checkIfVcOwner(message);
        if (!isSafe || !vc) return;

        const name = args.join(" ");
        if (!name) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "voicemaster rename",
              ),
            ],
          });
          return;
        }

        try {
          await vc.edit({ name: name });
          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **renamed VoiceMaster Channel** to: \`${name}\`.`,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "limit",
      description:
        "Limit the amount of people allowed in your VoiceMaster Channel.",

      guild_only: true,

      cooldown: {
        limit: 1,
        duration: 30,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const vc = message.member?.voice.channel;

        const isSafe = await checkIfVcOwner(message);
        if (!isSafe || !vc) return;

        let limit: number | null = Number(args[0]);
        if (limit < 1) {
          limit = null;
        } else if (limit > 99) {
          limit = 99;
        }

        try {
          await vc.edit({ userLimit: limit || 0 });
          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **${limit ? "limited" : "reset"} VoiceMaster Channel users**${limit ? ` to: \`${limit}\`` : " **limit**"}.`,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "lock",
      description: "Lock your VoiceMaster Channel.",

      guild_only: true,

      cooldown: {
        limit: 1,
        duration: 15,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const vc = message.member?.voice.channel;

        const isSafe = await checkIfVcOwner(message);
        if (!isSafe || !vc) return;

        const voicemasterData = await getVoicemasterData(
          message.guildId!,
          true,
        );
        const activeChannels = voicemasterData?.active_channels!;
        const activeChannelData = activeChannels[vc.id]!;

        if (activeChannelData.locked) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: Your **VoiceMaster Channel** is **already locked**.`,
              ),
            ],
          });
          return;
        }

        try {
          await vc.permissionOverwrites.edit(message.guild!.roles.everyone.id, {
            Connect: false,
          });

          activeChannelData.locked = true;
          await updateVoicemasterData(message.guildId!, {
            active_channels: activeChannels,
          });

          await send(message, {
            embeds: [
              Embeds.custom(
                ":lock:",
                `${message.author}: Your **VoiceMaster Channel** has been **locked**.`,
                "#ffac33",
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "unlock",
      description: "Unlock your VoiceMaster Channel.",

      guild_only: true,

      cooldown: {
        limit: 1,
        duration: 15,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const vc = message.member?.voice.channel;

        const isSafe = await checkIfVcOwner(message);
        if (!isSafe || !vc) return;

        const voicemasterData = await getVoicemasterData(
          message.guildId!,
          true,
        );
        const activeChannels = voicemasterData?.active_channels!;
        const activeChannelData = activeChannels[vc.id]!;

        if (!activeChannelData.locked) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: Your **VoiceMaster Channel** is **not locked**.`,
              ),
            ],
          });
          return;
        }

        try {
          await vc.permissionOverwrites.edit(message.guild!.roles.everyone.id, {
            Connect: null,
          });

          activeChannelData.locked = false;
          await updateVoicemasterData(message.guildId!, {
            active_channels: activeChannels,
          });

          await send(message, {
            embeds: [
              Embeds.custom(
                ":lock:",
                `${message.author}: Your **VoiceMaster Channel** has been **unlocked**.`,
                "#ffac33",
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "hide",
      description: "Hide your VoiceMaster Channel from other members.",
      aliases: ["invisible"],

      guild_only: true,

      cooldown: {
        limit: 1,
        duration: 15,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const vc = message.member?.voice.channel;

        const isSafe = await checkIfVcOwner(message);
        if (isSafe || !vc) return;

        const voicemasterData = await getVoicemasterData(
          message.guildId!,
          true,
        );
        const activeChannels = voicemasterData?.active_channels || {};
        const activeChannelData = activeChannels[vc.id];

        if (activeChannelData.hidden) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: Your **VoiceMaster Channel** is **already hidden**.`,
              ),
            ],
          });
          return;
        }

        try {
          await vc.permissionOverwrites.edit(message.guild!.roles.everyone.id, {
            ViewChannel: false,
          });

          activeChannelData.hidden = true;

          await updateVoicemasterData(message.guildId!, {
            active_channels: activeChannels,
          });
          await send(message, {
            embeds: [
              Embeds.custom(
                "<:eyeoff:1545019719545790534>",
                `${message.author}: Your **VoiceMaster Channel** has been **hidden**.`,
                Colours.theme,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "unhide",
      description: "Unhide your VoiceMaster Channel.",
      aliases: ["show", "visible"],

      guild_only: true,

      cooldown: {
        limit: 1,
        duration: 15,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const vc = message.member?.voice.channel;

        const isSafe = await checkIfVcOwner(message);
        if (!isSafe || !vc) return;

        const voicemasterData = await getVoicemasterData(
          message.guildId!,
          false,
        );
        const activeChannels = voicemasterData?.active_channels || {};
        const activeChannelData = activeChannels[vc.id]!;

        if (!activeChannelData.hidden) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: Your **VoiceMaster Channel* is **already visible**.`,
              ),
            ],
          });
          return;
        }

        try {
          await vc.permissionOverwrites.edit(message.guild!.roles.everyone.id, {
            ViewChannel: null,
          });

          activeChannelData.hidden = false;
          await updateVoicemasterData(message.guildId!, {
            active_channels: activeChannels,
          });

          await send(message, {
            embeds: [
              Embeds.custom(
                "<:eye:1545019700579270736>",
                `${message.author}: Your **VoiceMaster Channel** is now **visible**.`,
                Colours.theme,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "allow",
      description: "Allow a member or role into your locked channel.",
      aliases: ["unkick", "unban"],

      guild_only: true,

      syntax: "(member)",
      example: "evade",

      cooldown: {
        limit: 2,
        duration: 5,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const vc = message.member?.voice.channel;

        const isSafe = await checkIfVcOwner(message);
        if (!isSafe || !vc) return;

        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "voicemaster allow",
              ),
            ],
          });
          return;
        }

        const targetArg = String(args[0]);
        let targetId: string | undefined;
        let targetName: string | undefined;

        const targetMember = await promiseMember(message.guild!, targetArg);
        if (targetMember) {
          targetId = targetMember.id;
          targetName = targetMember.user.username;
        } else {
          const targetRole = await promiseRole(message.guild!, targetArg, true);
          if (targetRole) {
            targetId = targetRole.id;
            targetName = targetRole.name;
          }
        }

        if (!targetId || !targetName) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I couldn't find a **member** or **role** matching \`${targetArg}\`. Try using its **ID** instead.`,
              ),
            ],
          });
          return;
        }

        try {
          await vc.permissionOverwrites.edit(targetId, {
            Connect: true,
            ViewChannel: true,
          });

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **allowed** **${targetName}** into your channel.`,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "kick",
      description: "Kick and deny a member from your channel.",
      aliases: ["unallow", "disallow", "ban"],

      guild_only: true,

      syntax: "(member)",
      example: "evade",

      cooldown: {
        limit: 2,
        duration: 5,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const vc = message.member?.voice.channel;

        const isSafe = await checkIfVcOwner(message);
        if (!isSafe || !vc) return;

        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "voicemaster kick",
              ),
            ],
          });
        }

        const targetArg = String(args[0]);
        const targetMember = await promiseMember(message.guild!, targetArg);

        if (!targetMember) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I couldn't find **a member** by: \`${targetArg}\`. Try using their **ID** instead.`,
              ),
            ],
          });
          return;
        }

        if (targetMember.id === message.author.id) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: You cannot **kick yourself** from your own channel.`,
              ),
            ],
          });
          return;
        }

        try {
          await vc.permissionOverwrites.edit(targetMember.id, {
            Connect: false,
          });

          if (targetMember.voice.channelId === vc.id) {
            await targetMember.voice.disconnect(
              `Kicked from VoiceMaster channel by ${message.author.username}`,
            );
          }

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **kicked** **${targetMember.user.username}** from your channel.`,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "interface",
      description: "Send the VoiceMaster interface menu to the channel.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      requiredClientPermissions: [PermissionFlagsBits.Administrator],

      cooldown: {
        limit: 1,
        duration: 10,
        type: "guild",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const payload = buildInterfacePayload(client);

        await send(message, payload);

        if (message.deletable) {
          await message.delete().catch(() => {});
        }
      },
    },
    {
      name: "category",
      description:
        "Change the category where VoiceMaster channels are created.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      requiredClientPermissions: [PermissionFlagsBits.Administrator],

      syntax: "(category)",
      example: "Voice Channels",

      cooldown: {
        limit: 1,
        duration: 15,
        type: "guild",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "voicemaster category",
              ),
            ],
          });
          return;
        }

        const voicemasterData = await getVoicemasterData(
          message.guildId!,
          false,
        );
        if (!voicemasterData) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: The **VoiceMaster Feature** isn't setup.`,
              ),
            ],
          });
          return;
        }

        const categoryArg = args.join(" ");
        const targetCategory = await promiseChannel(
          message.guild!,
          categoryArg,
        );

        if (
          !targetCategory ||
          targetCategory.type !== ChannelType.GuildCategory
        ) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I couldn't find a **category** matching \`${categoryArg}\`. Try using its **ID** instead.`,
              ),
            ],
          });
          return;
        }

        try {
          const config = voicemasterData.configuration || {};
          config.category_id = targetCategory.id;

          await updateVoicemasterData(message.guildId!, {
            configuration: config,
          });

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **changed VoiceMaster category** to: **${targetCategory.name}**.`,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
  ],

  execute: async (client: evClient, message: Message, args: string[]) => {
    await send(message, {
      embeds: [await Embeds.commandExample(message, client, command)],
    });
  },
} satisfies Command;

export default command;

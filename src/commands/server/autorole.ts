import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";
import { promiseRole } from "../../utils/promise";
import { getAutoroleData, updateAutoroleData } from "../../database/helpers";
import { Paginator, sendConfirmationView } from "../../utils/components";
import { checkRoleHierarchy } from "../../utils/permissions";

const command: Command = {
  name: "autorole",
  description: "Manage the server's automatically assigning roles.",

  aliases: ["aur", "autoroles"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
  requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

  syntax: "(subcommand) (arguments)",
  example: "add @September",

  cooldown: {
    limit: 2,
    duration: 5,
    type: "member",
  },

  subCommands: [
    {
      name: "add",
      description: "Add a role that will automatically be added to members.",

      aliases: ["new"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      syntax: "(role)",
      example: "@September",

      cooldown: {
        limit: 2,
        duration: 5,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "autorole add",
              ),
            ],
          });
          return;
        }

        const targetArg = args[0];
        let targetRole = await promiseRole(
          message.guild!,
          String(targetArg),
          false,
          true,
        );

        if (!targetRole) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I couldn't find **a role** by: \`${targetArg}\`. Try using its **ID** instead.`,
              ),
            ],
          });
          return;
        }

        const isSafe = await checkRoleHierarchy(message, targetRole, "manage");
        if (!isSafe) return;

        if (targetRole.permissions.has(PermissionFlagsBits.Administrator)) {
          const confirmed = await sendConfirmationView(
            message,
            `${message.author}: Are you sure you want to **add ${targetRole} to autoroles**? This role has the: **Administrator Permission**.`,
          );
          if (!confirmed) return;
        }

        const currentData = await getAutoroleData(message.guildId!, true);
        const roles = currentData?.roles || [];

        if (roles.includes(targetRole.id)) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: ${targetRole} is **already an autorole**.`,
              ),
            ],
          });
          return;
        }

        const newRoles = [...new Set([...roles, targetRole.id])];
        await updateAutoroleData(message.guildId!, { roles: newRoles });

        await send(message, {
          embeds: [
            Embeds.approve(
              `${message.author}: Successfully **added ${targetRole}** to autoroles.`,
            ),
          ],
        });
      },
    },
    {
      name: "remove",
      description: "Remove a role from autoroles.",

      aliases: ["trash"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      syntax: "(role)",
      example: "@September",

      cooldown: {
        limit: 2,
        duration: 5,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "autorole remove",
              ),
            ],
          });
          return;
        }

        const targetArg = args[0];
        let targetRole = await promiseRole(
          message.guild!,
          String(targetArg),
          false,
          true,
        );

        if (!targetRole) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I couldn't find **a role** by: \`${targetArg}\`. Try using its **ID** instead.`,
              ),
            ],
          });
          return;
        }

        const currentData = await getAutoroleData(message.guildId!, true);
        const roles = currentData?.roles || [];

        if (!roles.includes(targetRole.id)) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: ${targetRole} is **not an autorole**.`,
              ),
            ],
          });
          return;
        }

        const newRoles = roles.filter((id) => id !== targetRole.id);
        await updateAutoroleData(message.guildId!, { roles: newRoles });

        await send(message, {
          embeds: [
            Embeds.approve(
              `${message.author}: Successfully **removed ${targetRole}** from autoroles.`,
            ),
          ],
        });
      },
    },
    {
      name: "list",
      description: "View all of the autoroles in the server.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      cooldown: {
        limit: 1,
        duration: 30,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const data = await getAutoroleData(message.guildId!, false);
        const roles = data?.roles || [];

        if (!roles.length) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: There **aren't any autoroles** in the server.`,
              ),
            ],
          });
          return;
        }

        const paginator = new Paginator<string>({
          items: roles,
          itemsPerPage: 10,
          userId: message.author.id,
          colour: Colours.theme,
          author: {
            name: message.author.username,
            iconURL: message.author.displayAvatarURL({
              size: 512,
              extension: "png",
            }),
          },
          title: `Server Autoroles`,
          formatItem: (item, index) => {
            const paddedIndex = String(index + 1).padStart(2, "0");
            return `\`${paddedIndex}\` <@&${item}>`;
          },
          timeout: 30000,
        });

        await paginator.start(message);
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

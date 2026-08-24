import {
  PermissionFlagsBits,
  Role,
  type ColorResolvable,
  type Message,
  type RoleColorsResolvable,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, Emojis, send } from "../../utils/messaging";
import { promiseMember, promiseRole } from "../../utils/promise";
import type { inflateSync } from "bun";
import { Paginator, sendConfirmationView } from "../../utils/components";
import { checkRoleHierarchy } from "../../utils/permissions";

const hexRegex = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;

const command: Command = {
  name: "role",
  description: "Manage the servers roles.",

  aliases: ["r"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageRoles],
  requiredClientPermissions: [PermissionFlagsBits.ManageRoles],

  syntax: "(subcommands) (arguments)",
  example: "evade @Administrataor",

  cooldown: {
    limit: 2,
    duration: 5,
    type: "member",
  },

  subCommands: [
    {
      name: "list",
      description: "List all of the roles in the server.",

      guild_only: true,

      cooldown: {
        limit: 1,
        duration: 30,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const roles = Array.from(message.guild!.roles.cache.values())
          .filter((role) => role.id !== message.guild!.id)
          .sort((a, b) => b.position - a.position);

        if (roles.length === 0) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: There **aren't any roles** in this server.`,
              ),
            ],
          });
          return;
        }

        const paginator = new Paginator<Role>({
          items: roles,
          colour: Colours.theme,
          userId: message.author.id,
          author: {
            name: message.author.username,
            iconURL: message.author.displayAvatarURL({ size: 1024 }),
          },
          title: `Server Roles`,
          formatItem: (role, index) => {
            const paddedIndex = String(index + 1).padStart(2, "0");
            return `\`${paddedIndex}\` ${role.toString()}`;
          },
        });

        await paginator.start(message);
      },
    },
    {
      name: "delete",
      description: "Delete a role from the server.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageRoles],
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],

      syntax: "(role)",
      example: "@Administrataor",

      cooldown: {
        limit: 2,
        duration: 10,
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
                "role delete",
              ),
            ],
          });
          return;
        }

        let targetArg = args[0];
        let targetRole = await promiseRole(message.guild!, String(targetArg));

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

        const isSafe = await checkRoleHierarchy(message, targetRole, "delete");
        if (!isSafe) return;

        if (targetRole.members.size > 0) {
          const confirmed = await sendConfirmationView(
            message,
            `${message.author}: Are you sure you want to **delete ${targetRole}**? All members **will lose this role**.`,
          );
          if (!confirmed) return;
        }

        try {
          await targetRole.delete(
            `Deleted by ${message.author.username} (ID: ${message.author.id})`,
          );
          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **deleted role**: **${targetRole.name}**.`,
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
      name: "rename",
      description: "Rename a role in the server.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageRoles],
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],

      syntax: "(role) (name)",
      example: "Owner owner",

      cooldown: {
        limit: 2,
        duration: 10,
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
                "role create",
              ),
            ],
          });
          return;
        }

        let targetArg = args[0];
        let targetRole = await promiseRole(message.guild!, String(targetArg));

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

        const name = args.slice(1).join(" ") || null;
        if (!name) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "role rename",
              ),
            ],
          });
          return;
        }

        try {
          const oldName = targetRole.name;

          await targetRole.edit({ name: name });
          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **renamed ${oldName}** to: **${name}**.`,
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
      name: "create",
      description: "Create a role for the server.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageRoles],
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],

      syntax: "[name] [colour] [hoist]",
      example: "Owner #ffffff true",

      cooldown: {
        limit: 2,
        duration: 10,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        if (args.length === 0) {
          await send(message, {
            embeds: [await Embeds.commandExample(message, client, command)],
          });
          return;
        }

        const nameParts = [];
        let colour: RoleColorsResolvable | undefined;
        let hoist = false;

        for (const arg of args) {
          if (arg.toLowerCase() === "true") {
            hoist = true;
            continue;
          }

          if (arg.toLowerCase() === "false") {
            hoist = false;
            continue;
          }

          if (!colour && hexRegex.test(arg)) {
            const formattedHex = arg.startsWith("#") ? arg : `#${arg}`;
            colour = { primaryColor: formattedHex as ColorResolvable };
            continue;
          }

          nameParts.push(arg);
        }

        const name = nameParts.join(" ") || "new role";

        try {
          const newRole = await message.guild!.roles.create({
            name: name,
            colors: colour,
            hoist: hoist,
          });

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **created role**: ${newRole}.`,
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
    if (args.length === 0) {
      await send(message, {
        embeds: [await Embeds.commandExample(message, client, command)],
      });
      return;
    }

    let targetArg = args[0];
    let targetMember = await promiseMember(message.guild!, String(targetArg));

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

    let roleArgs = args.slice(1);
    const roles = [];

    for (const arg of roleArgs) {
      const attempt = await promiseRole(message.guild!, arg, true);
      if (attempt) {
        roles.push(attempt);
        continue;
      }
    }

    if (roles.length === 0) {
      await send(message, {
        embeds: [await Embeds.commandExample(message, client, command)],
      });
      return;
    }

    const toAdd: Role[] = [];
    const toRemove: Role[] = [];
    const toSkip: Role[] = [];

    const isOwner = message.author.id === message.guild!.ownerId;
    const execPosition = isOwner
      ? Infinity
      : message.member!.roles.highest.position;
    const botPosition = message.guild!.members.me!.roles.highest.position;

    for (const role of roles) {
      if (role.position >= execPosition || role.position >= botPosition) {
        toSkip.push(role);
        continue;
      }

      if (targetMember.roles.cache.has(role.id)) {
        toRemove.push(role);
        continue;
      } else {
        toAdd.push(role);
        continue;
      }
    }

    try {
      if (toAdd.length > 0) await targetMember.roles.add(toAdd);
      if (toRemove.length > 0) await targetMember.roles.remove(toRemove);

      const responseEmbeds = [];

      if (toAdd.length > 0 || toRemove.length > 0) {
        let emoji = Emojis.add;
        const summary = [];

        if (toAdd.length > 0) {
          summary.push(
            `**Added**: ${toAdd.map((r) => r.toString()).join(", ")}`,
          );
        }
        if (toRemove.length > 0) {
          summary.push(
            `**Added**: ${toRemove.map((r) => r.toString()).join(", ")}`,
          );
        }

        let final = "";
        const lastEntry = summary[summary.length - 1];

        if (lastEntry?.startsWith("**Removed**")) {
          final = `from ${targetMember}`;
        } else {
          final = `to ${targetMember}`;
        }

        if (summary[0]?.startsWith("**Removed**")) {
          emoji = Emojis.minus;
        }

        responseEmbeds.push(
          Embeds.custom(
            emoji,
            `${message.author}: ${summary.join(" - ")} ${final}.`,
            Colours.mathBlue,
          ),
        );
      }

      if (toSkip.length > 0) {
        responseEmbeds.push(
          Embeds.warning(
            `${message.author}: You or I **couldn't manage** these **roles**: \`${toSkip.map((r) => r.name).join(", ")}\``,
          ),
        );
      }

      if (responseEmbeds.length > 0) {
        await send(message, { embeds: responseEmbeds });
      }
    } catch (error) {
      await send(message, {
        embeds: [Embeds.deny(`${message.author}: ${error}.`)],
      });
    }
  },
} satisfies Command;

export default command;

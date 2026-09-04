import {
  GuildMember,
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
import {
  Paginator,
  sendCancellableTask,
  sendConfirmationView,
} from "../../utils/components";
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
                `${message.author}: There **aren't any roles** in the server.`,
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
            return `\`${paddedIndex}\` ${role}`;
          },
          timeout: 30000,
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

          await targetRole.edit({
            name: name,
            reason: `Edited by ${message.author.username} (ID: ${message.author.id})`,
          });
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
            reason: `Created by ${message.author.username} (ID: ${message.author.id})`,
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
    {
      name: "hoist",
      description: "Change a roles hoist.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageRoles],
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],

      syntax: "(role) [boolean]",
      example: "Owner true",

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
                "role hoist",
              ),
            ],
          });
          return;
        }

        const targetArg = args[0];
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

        const boolArg = args[1];
        let hoist = false;

        if (!boolArg) {
          hoist = !targetRole.hoist;
        } else if (boolArg?.toLowerCase() === "true") {
          hoist = true;
        } else if (boolArg?.toLowerCase() === "false") {
          hoist = false;
        }

        const isSafe = await checkRoleHierarchy(message, targetRole, "hoist");
        if (!isSafe) return;

        if (targetRole.hoist === hoist) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: ${targetRole}'s **hoist is already** set to: \`${hoist}\`.`,
              ),
            ],
          });
          return;
        }

        try {
          targetRole.edit({
            hoist: hoist,
            reason: `Edited by ${message.author.username} (ID: ${message.author.id})`,
          });
          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **set** ${targetRole}'s **hoist** to: \`${hoist}\`.`,
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
      name: "all",
      description: "Manage roles for every single member in the server.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],

      syntax: "[add|remove|toggle] (roles)",
      example: "remove @Winner @Premium",

      cooldown: {
        limit: 1,
        duration: 300,
        type: "guild",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(message, client, command, "role all"),
            ],
          });
          return;
        }

        let action = "toggle";
        if (["add", "remove", "toggle"].includes(args[0]!.toLowerCase())) {
          action = args[0]!.toLowerCase();
          args = args.slice(1);
        }

        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(message, client, command, "role all"),
            ],
          });
          return;
        }

        const targetRoles: Role[] = [];

        for (const arg of args) {
          const roleAttempt = await promiseRole(message.guild!, arg, true);
          if (
            roleAttempt &&
            !targetRoles.some((r) => r.id === roleAttempt.id)
          ) {
            targetRoles.push(roleAttempt);
          }
        }

        if (targetRoles.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(message, client, command, "role all"),
            ],
          });
          return;
        }

        const isOwner = message.author.id === message.guild!.ownerId;
        const execPosition = isOwner
          ? Infinity
          : message.member!.roles.highest.position;
        const botPosition = message.guild!.members.me!.roles.highest.position;

        const validRoles: Role[] = [];
        const toSkip: Role[] = [];

        for (const role of targetRoles) {
          if (role.position >= execPosition || role.position >= botPosition) {
            toSkip.push(role);
          } else {
            validRoles.push(role);
          }
        }

        if (validRoles.length === 0) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: You or I **couldn't manage** any of those **roles**.`,
              ),
            ],
          });
          return;
        }

        const allMembers = await message.guild!.members.fetch();
        const targets = allMembers.filter((member) => {
          for (const role of validRoles) {
            const hasRole = member.roles.cache.has(role.id);
            if (action === "add" && !hasRole) return true;
            if (action === "remove" && hasRole) return true;
            if (action === "toggle") return true;
          }
          return false;
        });

        if (targets.size === 0) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: **No members** need their roles updated.`,
              ),
            ],
          });
          return;
        }

        const confirmed = await sendConfirmationView(
          message,
          `${message.author}: Are you sure you want to **role everyone**? This will **add/remove the specified role(s) to every single member**.`,
        );
        if (!confirmed) return;

        const roleMentions = validRoles.map((r) => r.toString()).join(", ");
        const actionPresent =
          action === "add"
            ? "Adding"
            : action === "remove"
              ? "Removing"
              : "Toggling";

        const actionPast =
          action === "add"
            ? "Added"
            : action === "remove"
              ? "Removed"
              : "Toggled";

        const estimatedMs = targets.size * 1200;
        const finishTimestamp =
          Math.floor(Date.now() / 1000) + Math.ceil(estimatedMs / 1000) + 3;

        const initialEmbed = Embeds.approve(
          `${message.author}: ${actionPresent} ${roleMentions} for **${targets.size} members**. This will finish <t:${finishTimestamp}:R>.`,
        );

        const task = await sendCancellableTask(
          message,
          initialEmbed,
          estimatedMs + 300000,
          "mass role assignment",
        );

        const retryQueue: GuildMember[] = [];
        let successCount = 0;

        const processMember = async (member: GuildMember): Promise<boolean> => {
          const toAdd: Role[] = [];
          const toRemove: Role[] = [];

          for (const role of validRoles) {
            const hasRole = member.roles.cache.has(role.id);

            if (action === "add" && !hasRole) {
              toAdd.push(role);
            } else if (action === "remove" && hasRole) {
              toRemove.push(role);
            } else if (action === "toggle") {
              if (hasRole) toRemove.push(role);
              else toAdd.push(role);
            }
          }

          if (toAdd.length === 0 && toRemove.length === 0) return true;

          try {
            if (toAdd.length > 0) await member.roles.add(toAdd);
            if (toRemove.length > 0) await member.roles.remove(toRemove);
            return true;
          } catch (error) {
            return false;
          }
        };

        for (const member of targets.values()) {
          if (task.isCancelled()) break;

          const success = await processMember(member);
          if (success) {
            successCount++;
          } else {
            retryQueue.push(member);
          }
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }

        let finalFails = 0;
        if (retryQueue.length > 0 && !task.isCancelled()) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          for (const member of retryQueue) {
            if (task.isCancelled()) break;

            const success = await processMember(member);
            if (success) {
              successCount++;
            } else {
              finalFails++;
            }
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }

        task.stop();

        const responseEmbeds = [];

        if (task.isCancelled()) {
          responseEmbeds.push(
            Embeds.warning(
              `${message.author}: mass-role **cancelled**. ${actionPast} ${roleMentions} for **${successCount} / ${targets.size} members**.`,
            ),
          );
        } else {
          responseEmbeds.push(
            Embeds.approve(
              `${message.author}: Finished. **${actionPast}** ${roleMentions} for **${successCount} members**.`,
            ),
          );
        }

        if (finalFails > 0) {
          responseEmbeds.push(
            Embeds.warning(
              `Failed to update **${finalFails} members** due to strict API limits.`,
            ),
          );
        }

        if (toSkip.length > 0) {
          responseEmbeds.push(
            Embeds.warning(
              `Skipped roles due to hierarchy: \`${toSkip.map((r) => r.name).join(", ")}\``,
            ),
          );
        }

        await task.statusMessage.edit({
          embeds: responseEmbeds,
          components: [],
        });
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

    const targetMembers: GuildMember[] = [];
    const targetRoles: Role[] = [];

    for (const arg of args) {
      const memberAttempt = await promiseMember(message.guild!, arg);
      if (memberAttempt) {
        if (!targetMembers.some((m) => m.id === memberAttempt.id)) {
          targetMembers.push(memberAttempt);
        }
        continue;
      }

      const roleAttempt = await promiseRole(message.guild!, arg, true);
      if (roleAttempt) {
        if (!targetRoles.some((r) => r.id === roleAttempt.id)) {
          targetRoles.push(roleAttempt);
        }
        continue;
      }
    }

    if (targetMembers.length === 0 || targetRoles.length === 0) {
      if (!args[1]) {
        await send(message, {
          embeds: [await Embeds.commandExample(message, client, command)],
        });
        return;
      } else {
        await send(message, {
          embeds: [
            Embeds.eyeGlass(
              `${message.author}: I couldn't find **a role** by: \`${args[1]}\`. Try using its **ID** instead.`,
            ),
          ],
        });
        return;
      }
    }

    const isOwner = message.author.id === message.guild!.ownerId;
    const execPosition = isOwner
      ? Infinity
      : message.member!.roles.highest.position;
    const botPosition = message.guild!.members.me!.roles.highest.position;

    const toSkip: Role[] = [];
    const validRoles: Role[] = [];

    for (const role of targetRoles) {
      if (role.position >= execPosition || role.position >= botPosition) {
        toSkip.push(role);
      } else {
        validRoles.push(role);
      }
    }

    try {
      const memberResults: {
        member: GuildMember;
        added: Role[];
        removed: Role[];
      }[] = [];

      if (validRoles.length > 0) {
        for (const member of targetMembers) {
          const toAdd: Role[] = [];
          const toRemove: Role[] = [];

          for (const role of validRoles) {
            if (member.roles.cache.has(role.id)) {
              toRemove.push(role);
            } else {
              toAdd.push(role);
            }
          }

          memberResults.push({ member, added: toAdd, removed: toRemove });

          if (toAdd.length > 0)
            await member.roles.add(
              toAdd,
              `${message.author.username} (ID: ${message.author.id})`,
            );
          if (toRemove.length > 0)
            await member.roles.remove(
              toRemove,
              `${message.author.username} (ID: ${message.author.id})`,
            );
        }
      }

      const responseEmbeds = [];

      if (validRoles.length > 0) {
        const MAX_DETAILED_EMBEDS = 8;
        const displayResults = memberResults.slice(0, MAX_DETAILED_EMBEDS);
        const remainingCount = memberResults.length - MAX_DETAILED_EMBEDS;

        for (const result of displayResults) {
          const changes: string[] = [];

          if (result.added.length > 0) {
            changes.push(...result.added.map((r) => `+${r.toString()}`));
          }
          if (result.removed.length > 0) {
            changes.push(...result.removed.map((r) => `-${r.toString()}`));
          }

          const emoji = result.added.length > 0 ? Emojis.add : Emojis.minus;

          responseEmbeds.push(
            Embeds.custom(
              emoji,
              `${message.author}: Successfully **modified ${result.member.user.username}**'s roles: ${changes.join(", ")}.`,
              Colours.mathBlue,
            ),
          );
        }

        if (remainingCount > 0) {
          responseEmbeds.push(
            Embeds.custom(
              Emojis.add,
              `${message.author}: And managed roles for **${remainingCount} more member${remainingCount > 1 ? "s" : ""}**.`,
              Colours.mathBlue,
            ),
          );
        }
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

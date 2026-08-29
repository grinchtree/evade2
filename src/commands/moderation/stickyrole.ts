import {
  GuildMember,
  PermissionFlagsBits,
  Role,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, Emojis, send } from "../../utils/messaging";
import { promiseMember, promiseRole } from "../../utils/promise";
import { Paginator, sendConfirmationView } from "../../utils/components";
import {
  getMemberStickyRoles,
  addMemberStickyRoles,
  removeMemberStickyRoles,
  clearMemberStickyRoles,
} from "../../database/helpers";

const command: Command = {
  name: "stickyroles",
  description: "Manage sticky roles for a member.",

  aliases: ["stickyrole", "sr"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageRoles],
  requiredClientPermissions: [PermissionFlagsBits.ManageRoles],

  syntax: "(subcommands) (arguments)",
  example: "evade @VIP",

  cooldown: {
    limit: 2,
    duration: 5,
    type: "member",
  },

  subCommands: [
    {
      name: "list",
      description: "View all sticky roles for a member.",

      guild_only: true,

      syntax: "(member)",
      example: "evade",

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
                "stickyroles view",
              ),
            ],
          });
          return;
        }

        const targetMember = await promiseMember(message.guild!, args[0]);

        if (!targetMember) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I couldn't find that **member** in the server.`,
              ),
            ],
          });
          return;
        }

        const stickyRoleIds = await getMemberStickyRoles(
          targetMember.id,
          message.guild!.id,
        );

        if (stickyRoleIds.length === 0) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: **${targetMember.user.username}** doesn't have any **sticky roles**.`,
              ),
            ],
          });
          return;
        }

        const validRoles = stickyRoleIds
          .map((id) => message.guild!.roles.cache.get(id))
          .filter(Boolean) as Role[];

        validRoles.sort((a, b) => b.position - a.position);

        const paginator = new Paginator<Role>({
          items: validRoles,
          colour: Colours.theme,
          userId: message.author.id,
          author: {
            name: `${targetMember.user.username}'s Sticky Roles`,
            iconURL: targetMember.user.displayAvatarURL({ size: 1024 }),
          },
          title: `Sticky Roles`,
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
      name: "clear",
      description: "Clear all sticky roles from a member.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageRoles],
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],

      syntax: "(member)",
      example: "evade",

      cooldown: {
        limit: 1,
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
                "stickyroles clear",
              ),
            ],
          });
          return;
        }

        const targetMember = await promiseMember(message.guild!, args[0]!);

        if (!targetMember) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I couldn't find that **member** in the server.`,
              ),
            ],
          });
          return;
        }

        const currentRoles = await getMemberStickyRoles(
          targetMember.id,
          message.guild!.id,
        );

        if (currentRoles.length === 0) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: **${targetMember.user.username}** already has **no sticky roles**.`,
              ),
            ],
          });
          return;
        }

        const confirmed = await sendConfirmationView(
          message,
          `${message.author}: Are you sure you want to **clear all ${currentRoles.length} sticky roles** from ${targetMember}?`,
        );
        if (!confirmed) return;

        try {
          await clearMemberStickyRoles(targetMember.id, message.guild!.id);

          const rolesToRemove = currentRoles.filter((id) =>
            targetMember.roles.cache.has(id),
          );

          if (rolesToRemove.length > 0) {
            await targetMember.roles
              .remove(
                rolesToRemove,
                `Sticky roles cleared by ${message.author.username}`,
              )
              .catch(() => {});
          }

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **cleared all sticky roles** from **${targetMember.user.username}** and removed them.`,
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
      await send(message, {
        embeds: [await Embeds.commandExample(message, client, command)],
      });
      return;
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
          const currentStickyIds = await getMemberStickyRoles(
            member.id,
            message.guild!.id,
          );

          const toAdd: Role[] = [];
          const toRemove: Role[] = [];

          for (const role of validRoles) {
            if (currentStickyIds.includes(role.id)) {
              toRemove.push(role);
            } else {
              toAdd.push(role);
            }
          }

          memberResults.push({ member, added: toAdd, removed: toRemove });

          if (toAdd.length > 0) {
            await addMemberStickyRoles(
              member.id,
              message.guild!.id,
              toAdd.map((r) => r.id),
            );

            await member.roles
              .add(toAdd, `Sticky roles modified by ${message.author.username}`)
              .catch(() => {});
          }

          if (toRemove.length > 0) {
            await removeMemberStickyRoles(
              member.id,
              message.guild!.id,
              toRemove.map((r) => r.id),
            );

            await member.roles
              .remove(
                toRemove,
                `Sticky roles modified by ${message.author.username}`,
              )
              .catch(() => {});
          }
        }
      }

      const responseEmbeds = [];

      if (validRoles.length > 0) {
        const MAX_DETAILED_EMBEDS = 8;
        const displayResults = memberResults.slice(0, MAX_DETAILED_EMBEDS);
        const remainingCount = memberResults.length - MAX_DETAILED_EMBEDS;

        for (const result of displayResults) {
          let emoji = Emojis.add;
          const summary = [];

          if (result.added.length > 0) {
            summary.push(
              `**Sticky Added**: ${result.added.map((r) => r.toString()).join(", ")}`,
            );
          }
          if (result.removed.length > 0) {
            summary.push(
              `**Sticky Removed**: ${result.removed.map((r) => r.toString()).join(", ")}`,
            );
          }

          let final = "";
          const lastEntry = summary[summary.length - 1];

          if (lastEntry?.startsWith("**Sticky Removed**")) {
            final = `from ${result.member}`;
          } else {
            final = `to ${result.member}`;
          }

          if (summary[0]?.startsWith("**Sticky Removed**")) {
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

        if (remainingCount > 0) {
          responseEmbeds.push(
            Embeds.custom(
              Emojis.add,
              `${message.author}: And configured sticky roles for **${remainingCount} more member${remainingCount > 1 ? "s" : ""}**.`,
              Colours.mathBlue,
            ),
          );
        }
      }

      if (toSkip.length > 0) {
        responseEmbeds.push(
          Embeds.warning(
            `${message.author}: You or I **couldn't configure** these **roles** because of hierarchy: \`${toSkip.map((r) => r.name).join(", ")}\``,
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

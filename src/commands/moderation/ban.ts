import {
  GuildMember,
  PermissionFlagsBits,
  type Message,
  User,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import {
  promiseBanEntry,
  promiseMember,
  promiseUser,
} from "../../utils/promise";
import { stringToSeconds } from "../../utils/formatters";
import { checkHierarchy } from "../../utils/permissions";

const command: Command = {
  name: "ban",
  description: "Ban a member from the server.",

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.BanMembers],
  requiredClientPermissions: [PermissionFlagsBits.BanMembers],

  syntax: "(member) [history] [reason]",
  example: "evade 24h Sending malware links",

  cooldown: {
    limit: 3,
    duration: 10,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    // if no args are given, send the command example instead
    if (args.length === 0) {
      await send(message, {
        embeds: [await Embeds.commandExample(client, command)],
      });
      return;
    }

    // variables that will be later assigned to
    let target: User | GuildMember | undefined;
    let deleteMessageSeconds: number | undefined;
    const unbuiltReason = [];

    // assigning values to variables
    for (const arg of args) {
      if (!target) {
        let attempt: User | GuildMember | undefined = await promiseMember(
          message.guild!,
          arg,
        );
        // if the member wasn't found, try finding the user
        if (!attempt) {
          attempt = await promiseUser(client, arg);
        }

        // assign
        if (attempt) {
          target = attempt;
          continue;
        }
      }

      if (!deleteMessageSeconds) {
        const attempt = stringToSeconds(arg);
        if (attempt) {
          deleteMessageSeconds = attempt;
          continue;
        }
      }

      // all other invalid arguments are just used as the reason
      unbuiltReason.push(arg);
    }

    if (!target) {
      // if not target after trying to assign arguments, end command
      await send(message, {
        embeds: [
          Embeds.eyeGlass(
            `${message.author}: I **couldn't find anyone** by: \`${args[0]}\`.`,
          ),
        ],
      });
      return;
    }

    const reason = unbuiltReason.join(" ") || "No reason provided."; // build reason

    if (target instanceof GuildMember) {
      // if a member, check hierarchy
      const isSafe = await checkHierarchy(message, target, "ban");
      if (!isSafe) return; // not safe to ban target, end command
    }

    try {
      const banEntry = await promiseBanEntry(message.guild!, target.id);
      if (banEntry) {
        // if the target is already banned from the server, end command
        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: **${target.displayName}** is **already banned** from the server.`,
            ),
          ],
        });
        return;
      }

      // ban
      await message.guild!.bans.create(target, {
        reason: `${message.author.username} (ID: ${message.author.id}) / ${reason}`,
        deleteMessageSeconds: deleteMessageSeconds || 0,
      });

      // send success message
      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: **${target.displayName}** has been **banned** from the server.`,
          ),
        ],
      });
    } catch (error) {
      // most errors are automatically handled, this is down to http.
      await send(message, {
        embeds: [Embeds.deny(`${message.author}: ${error}.`)],
      });
    }
  },
} satisfies Command;

export default command;

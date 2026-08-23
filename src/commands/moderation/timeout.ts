import {
  GuildMember,
  PermissionFlagsBits,
  User,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { promiseMember } from "../../utils/promise";
import {
  clampNumber,
  stringFromSeconds,
  stringToSeconds,
} from "../../utils/formatters";
import { checkHierarchy } from "../../utils/permissions";

const command: Command = {
  name: "timeout",
  description: "Timeout a member from a given amount of time.",

  aliases: ["to"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],

  syntax: "(member) [duration] [reason]",
  example: "evade 5m Spamming",

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

    let targetArg = args[0];
    let targetMember: GuildMember | undefined = await promiseMember(
      message.guild!,
      String(targetArg),
    );
    let targetUser: User | undefined = targetMember?.user;

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

    const isSafe = await checkHierarchy(message, targetMember, "kick");
    if (!isSafe) return;

    let timeoutSeconds: number | undefined;
    let reasonArgs = args.slice(1);

    if (reasonArgs.length > 0) {
      const parsedSeconds = stringToSeconds(String(reasonArgs[0]));

      if (parsedSeconds) {
        timeoutSeconds = clampNumber(parsedSeconds, 5, 60 * 60 * 24 * 28 - 1);
        reasonArgs = reasonArgs.slice(1);
      }
    }

    const reason = reasonArgs.join(" ") || "No reason provided.";

    if (!timeoutSeconds) {
      timeoutSeconds = 60;
    }

    try {
      await targetMember.timeout(
        timeoutSeconds * 1000,
        `${message.author.username} (ID: ${message.author.id} / ${reason})`,
      );

      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: **${targetUser ? targetUser.username : targetMember.displayName}** was **timedout** for: \`${stringFromSeconds(timeoutSeconds)}\`.`,
          ),
        ],
      });
    } catch (error) {
      await send(message, {
        embeds: [Embeds.deny(`${message.author}: ${error}.`)],
      });
    }
  },
} satisfies Command;

export default command;

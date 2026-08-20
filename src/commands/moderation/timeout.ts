import { GuildMember, PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { checkHierarchy } from "../../utils/permissions";
import { promiseMember } from "../../utils/promise";
import {
  clampNumber,
  stringFromSeconds,
  stringToSeconds,
} from "../../utils/formatters";

const command: Command = {
  name: "timeout",
  description: "Timeout a member for a specified amount of time.",

  aliases: ["to"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],

  syntax: "(member) [duration] [reason]",
  example: "evade 30m",

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
    let target: GuildMember | undefined;
    let timeoutDuration: number | undefined;
    const unbuiltReason = [];

    // assigning values to variables
    for (const arg of args) {
      if (!target) {
        let attempt: GuildMember | undefined = await promiseMember(
          message.guild!,
          arg,
        );

        // assign
        if (attempt) {
          target = attempt;
          continue;
        }
      }

      if (!timeoutDuration) {
        const attempt = stringToSeconds(arg);
        if (attempt) {
          timeoutDuration = attempt;
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
            `${message.author}: I **couldn't find** a **member**** by: \`${args[0]}\`.`,
          ),
        ],
      });
      return;
    }

    const reason = unbuiltReason.join(" ") || "No reason provided."; // build reason

    const isSafe = await checkHierarchy(message, target, "timeout");
    if (!isSafe) return; // not safe to timeout target, end command

    try {
      // timeout
      if (!timeoutDuration) {
        // default to 60 seconds
        timeoutDuration = 60;
      }
      timeoutDuration = clampNumber(timeoutDuration, 5, 60 * 60 * 24 * 28);

      await target.timeout(
        timeoutDuration * 1000,
        `${message.author.username} (ID: ${message.author.id}) / ${reason}`,
      );

      // send success message
      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: **${target.displayName}** has been **timedout** for \`${stringFromSeconds(timeoutDuration)}\`.`,
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

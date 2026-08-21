import { GuildMember, PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { promiseMember } from "../../utils/promise";
import { checkHierarchy } from "../../utils/permissions";

const command: Command = {
  name: "kick",
  description: "Kick a member from the server.",

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.KickMembers],
  requiredClientPermissions: [PermissionFlagsBits.KickMembers],

  syntax: "(member) [reason]",
  example: "evade",

  cooldown: {
    limit: 3,
    duration: 10,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    // if no args are given, send the command example instead
    if (args.length === 0) {
      await send(message, {
        embeds: [await Embeds.commandExample(message, client, command)],
      });
      return;
    }

    // variables that will be later assigned to
    let target: GuildMember | undefined;
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

    const isSafe = await checkHierarchy(message, target, "kick");
    if (!isSafe) return; // not safe to kick target, end command

    try {
      // kick
      await target.kick(
        `${message.author.username} (ID: ${message.author.id}) / ${reason}`,
      );

      // send success message
      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: **${target.displayName}** has been **kicked** from the server.`,
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

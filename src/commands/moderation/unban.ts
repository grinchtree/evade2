import { PermissionFlagsBits, type Message, type User } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { promiseBanEntry, promiseUser } from "../../utils/promise";

const command: Command = {
  name: "unban",
  description: "Unban a banned member from the server.",

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.BanMembers],
  requiredClientPermissions: [PermissionFlagsBits.BanMembers],

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
    let target: User | undefined;
    const unbuiltReason = [];

    // assigning values to variables
    for (const arg of args) {
      if (!target) {
        let attempt: User | undefined = await promiseUser(client, arg);
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
            `${message.author}: I **couldn't find anyone** by: \`${args[0]}\`.`,
          ),
        ],
      });
      return;
    }

    const reason = unbuiltReason.join(" ") || "No reason provided."; // build reason

    try {
      const banEntry = await promiseBanEntry(message.guild!, target.id);
      if (!banEntry) {
        // if the target is not banned from the server, end command
        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: **${target.displayName}** is **not banned** from the server.`,
            ),
          ],
        });
        return;
      }

      // unban
      await message.guild!.bans.remove(
        target,
        `${message.author.username} (ID: ${message.author.id}) / ${reason}`,
      );

      // send success message
      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: **${target.displayName}** has been **unbanned** from the server.`,
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

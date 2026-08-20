import {
  GuildMember,
  PermissionFlagsBits,
  User,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { promiseMember, promiseUser } from "../../utils/promise";
import { clampNumber } from "../../utils/formatters";

const command: Command = {
  name: "purge",
  description: "Delete a large amount of messages at once.",

  aliases: ["c", "clear"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
  requiredClientPermissions: [PermissionFlagsBits.ManageMessages],

  syntax: "<amount> [user]",
  example: "30 evade",

  cooldown: {
    limit: 1,
    duration: 7,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    if (args.length === 0) {
      await send(message, {
        embeds: [await Embeds.commandExample(client, command)],
      });
      return;
    }

    let amount: number | undefined;
    let target: GuildMember | User | undefined;
    const unbuiltReason: string[] = [];

    // assigning values to variables
    for (const arg of args) {
      // safely parse strict numbers for the amount
      if (!amount && /^\d+$/.test(arg)) {
        amount = parseInt(arg, 10);
        continue; // skip adding this to the target check or reason
      }

      if (!target) {
        let attempt: GuildMember | User | undefined = await promiseMember(
          message.guild!,
          arg,
        );

        if (!attempt) {
          attempt = await promiseUser(client, arg);
        }

        if (attempt) {
          target = attempt;
          continue; // skip adding this to the reason
        }
      }

      // all other invalid arguments are just used as the reason
      unbuiltReason.push(arg);
    }

    // if no amount was found in the arguments, end the command
    if (!amount) {
      await send(message, {
        embeds: [
          Embeds.eyeGlass(
            `${message.author}: You must specify an **amount** of messages to purge.`,
          ),
        ],
      });
      return;
    }

    // Discord limits bulk deletions to 100 max
    amount = clampNumber(amount, 1, 100);
    const reason = unbuiltReason.join(" ") || "No reason provided.";

    // make sure this is a text channel that supports bulkDelete
    if (!message.channel.isTextBased() || message.channel.isDMBased()) return;

    try {
      // delete the user's command message so it doesn't mess up the count
      await message.delete().catch(() => null);

      let deletedCount = 0;

      if (target) {
        // if a target is specified, fetch messages and filter by that user
        const fetched = await message.channel.messages.fetch({ limit: amount });
        const targetMessages = fetched.filter(
          (m) => m.author.id === target?.id,
        );

        if (targetMessages.size === 0) {
          const msg = await message.channel.send({
            embeds: [
              Embeds.deny(
                `${message.author}: No recent messages found for that user.`,
              ),
            ],
          });
          setTimeout(() => msg.delete().catch(() => null), 5000);
          return;
        }

        // the 'true' argument tells discord to safely ignore messages older than 14 days
        const deleted = await message.channel.bulkDelete(targetMessages, true);
        deletedCount = deleted.size;
      } else {
        // if no target, just purge the last X amount of messages normally
        const deleted = await message.channel.bulkDelete(amount, true);
        deletedCount = deleted.size;
      }

      // send success message
      const successMsg = await message.channel.send({
        embeds: [
          Embeds.approve(
            `${message.author}: Successfully purged **${deletedCount} messages**${target ? ` from **${target.displayName}**` : ""}.`,
          ),
        ],
      });

      // auto-delete the success message after 5 seconds to keep chat clean
      setTimeout(() => successMsg.delete().catch(() => null), 5000);
    } catch (error) {
      await message.channel.send({
        embeds: [Embeds.deny(`${message.author}: ${error}`)],
      });
    }
  },
} satisfies Command;

export default command;

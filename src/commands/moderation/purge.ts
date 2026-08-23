import {
  GuildMember,
  PermissionFlagsBits,
  User,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { promiseMember, promiseUser } from "../../utils/promise";
import { clampNumber } from "../../utils/formatters";
import { Embeds, send } from "../../utils/messaging";

const command: Command = {
  name: "purge",
  description: "Delete a large amount of messages at once.",

  aliases: ["c", "clear"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
  requiredClientPermissions: [PermissionFlagsBits.ManageMessages],

  syntax: "[amount]",
  example: "30",

  cooldown: {
    limit: 1,
    duration: 5,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    let amount: number | undefined;
    let target: GuildMember | User | undefined;

    for (const arg of args) {
      if (!amount && /^\d+$/.test(arg)) {
        amount = parseInt(arg, 10);
        continue;
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
          continue;
        }
      }
    }

    if (!amount) amount = 30;
    amount = clampNumber(amount, 1, 100);

    if (!message.channel.isTextBased() || message.channel.isDMBased()) return;

    try {
      let deletedCount = 0;

      await message.delete().catch(() => null);

      if (target) {
        const fetched = await message.channel.messages.fetch({ limit: amount });
        const targetMessages = fetched.filter(
          (m) => m.author.id === target?.id,
        );

        if (targetMessages.size === 0) {
          const msg = await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I **couldn't find any messages** (try a bigger search?).`,
              ),
            ],
          });
          setTimeout(() => {
            msg.delete().catch(() => null);
          }, 5000);
          return;
        }

        const deleted = await message.channel.bulkDelete(targetMessages, true);
        deletedCount = deleted.size;
      } else {
        const deleted = await message.channel.bulkDelete(amount, true);
        deletedCount = deleted.size;
      }

      const targetName = target
        ? "user" in target
          ? target.user.username
          : target.username
        : "";

      const msg = await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: Successfully **purged ${deletedCount} ${deletedCount === 1 ? "message" : "messages"}**${target ? ` from **${targetName}**` : ""}.`,
          ),
        ],
      });
      setTimeout(() => {
        msg.delete().catch(() => null);
      }, 5000);
    } catch (error) {
      await send(message, {
        embeds: [
          Embeds.eyeGlass(
            `${message.author}: I **couldn't find any messages** (try a bigger search?).`,
          ),
        ],
      });
    }
  },
} satisfies Command;

export default command;

import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { promiseMember } from "../../utils/promise";

const command: Command = {
  name: "untimeout",
  description: "Remove a timeout from a member.",

  aliases: ["unto"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],

  syntax: "(member) [reason]",
  example: "evade",

  cooldown: {
    limit: 3,
    duration: 5,
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
    let targetMember = await promiseMember(message.guild!, String(targetArg));
    let targetUser = targetMember?.user;

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

    let reason = args.slice(1).join(" ") || "No reason provided.";

    try {
      if (!targetMember.isCommunicationDisabled()) {
        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: **${targetUser ? targetUser.username : targetMember.displayName}** is **not timedout**.`,
            ),
          ],
        });
        return;
      }

      await targetMember.timeout(
        null,
        `Untimedout by ${message.author.username} (ID: ${message.author.id}) / ${reason}`,
      );
      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: Successfully **removed timeout** from **${targetUser ? targetUser.username : targetMember.displayName}**.`,
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

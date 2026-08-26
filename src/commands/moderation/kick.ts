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
import { checkHierarchy } from "../../utils/permissions";
import { sendConfirmationView } from "../../utils/components";

const command: Command = {
  name: "kick",
  description: "Kick a member from the server.",

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.KickMembers],
  requiredClientPermissions: [PermissionFlagsBits.KickMembers],

  syntax: "(member) [reason]",
  example: "evade Annoying members",

  cooldown: {
    limit: 1,
    duration: 7,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    if (args.length === 0) {
      await send(message, {
        embeds: [await Embeds.commandExample(message, client, command)],
      });
      return;
    }

    const targetArg = args[0];
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

    if (targetMember.premiumSince) {
      const confirmed = await sendConfirmationView(
        message,
        `${message.author}: Are you sure you want to **ban ${targetMember}**? They are **boosting the server**.`,
      );
      if (!confirmed) return;
    }

    const isSafe = await checkHierarchy(message, targetMember, "kick");
    if (!isSafe) return;

    let reason = args.slice(1).join(" ") || "No reason provided.";

    try {
      await targetMember.kick(
        `Kicked by ${message.author.username} (ID: ${message.author.id}) / ${reason}`,
      );
      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: **${targetUser ? targetUser.username : targetMember.displayName}** has been **kicked** from the server.`,
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

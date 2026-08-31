import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { promiseMember } from "../../utils/promise";
import { checkHierarchy } from "../../utils/permissions";

const command: Command = {
  name: "nickname",
  description: "Manage a members nickname.",

  aliases: ["nick"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageNicknames],
  requiredClientPermissions: [PermissionFlagsBits.ManageNicknames],

  syntax: "(member) [nickname]",
  example: "evade Evade",

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

    const targetArg = args[0];
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

    const isSafe = await checkHierarchy(message, targetMember, "nickname");
    if (!isSafe) return;

    const nickname = args.slice(1).join(" ");

    try {
      await targetMember.edit({ nick: nickname || null });

      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: Successfully **${nickname ? "set" : "reset"} ${targetUser?.username ?? targetMember.displayName}**'s nickname${nickname ? ` to: \`${nickname}\`.` : "."}`,
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

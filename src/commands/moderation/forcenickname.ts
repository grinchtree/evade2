import { EmbedMediaFlags, PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { promiseMember } from "../../utils/promise";
import { getMemberData, updateMemberData } from "../../database/helpers";
import { checkHierarchy } from "../../utils/permissions";

const command: Command = {
  name: "forcenickname",
  description: "Force a members nickname.",

  aliases: ["fn"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageNicknames],
  requiredClientPermissions: [PermissionFlagsBits.ManageNicknames],

  syntax: "(member) [nickname]",
  example: "evade Evade",

  cooldown: {
    limit: 1,
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
    const memberData = await getMemberData(
      targetMember.id,
      message.guild!.id,
      true,
    );

    try {
      if (!nickname && !memberData?.forced_nickname) {
        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: **${targetUser?.username || targetMember.nickname}**'s nickname **isn't forced**.`,
            ),
          ],
        });
        return;
      }

      await updateMemberData(targetMember.id, message.guildId!, {
        forced_nickname: nickname,
      });

      await targetMember.edit({
        nick: nickname,
        reason: `Forced by ${message.author} (ID: ${message.author.id})`,
      });

      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: Successfully **${nickname ? "forced" : "reset"} ${targetUser?.username ?? targetMember.displayName}**'s nickname${nickname ? ` to: \`${nickname}\`.` : "."}`,
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

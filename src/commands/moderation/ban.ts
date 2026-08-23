import {
  GuildMember,
  InviteTargetUsersJobStatus,
  PermissionFlagsBits,
  User,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import {
  promiseBanEntry,
  promiseMember,
  promiseUser,
} from "../../utils/promise";
import { checkHierarchy } from "../../utils/permissions";
import {
  clampNumber,
  stringFromSeconds,
  stringToSeconds,
} from "../../utils/formatters";
import { sendConfirmationView } from "../../utils/components";

const command: Command = {
  name: "ban",
  description: "Ban a member from the server.",

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.BanMembers],
  requiredClientPermissions: [PermissionFlagsBits.BanMembers],

  syntax: "(member) [history] [reason]",
  example: "evade 7d Sending bypassed words",

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

    const targetArg = String(args[0]);
    let targetMember: GuildMember | undefined = await promiseMember(
      message.guild!,
      targetArg,
    );
    let targetUser: User | undefined = targetMember?.user;

    if (!targetUser) {
      targetUser = await promiseUser(client, targetArg);
    }
    if (!targetUser) {
      await send(message, {
        embeds: [
          Embeds.eyeGlass(
            `${message.author}: I couldn't **a user** by: \`${targetArg}\`. Try using their **ID** instead.`,
          ),
        ],
      });
      return;
    }

    if (targetMember?.premiumSince) {
      const confirmed = await sendConfirmationView(
        message,
        `${message.author}: Are you sure you want to **ban ${targetMember}**? They are **boosting the server**.`,
      );
      if (!confirmed) return;
    }

    if (targetMember) {
      const isSafe = await checkHierarchy(message, targetMember, "ban");
      if (!isSafe) return;
    }

    let deleteMessageSeconds = 0;
    let reasonArgs = args.slice(1);

    if (reasonArgs.length > 0) {
      const parsedSeconds = stringToSeconds(String(reasonArgs[0]));

      if (parsedSeconds) {
        deleteMessageSeconds = clampNumber(parsedSeconds, 0, 60 * 60 * 24 * 7);
        reasonArgs = reasonArgs.slice(1);
      }
    }

    const reason = reasonArgs.join(" ") || "No reason provided.";

    try {
      const banEntry = await promiseBanEntry(message.guild!, targetUser.id);
      if (banEntry) {
        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: **${targetUser.username}** is **already banned** from the server.`,
            ),
          ],
        });
        return;
      }

      await message.guild!.members.ban(targetUser.id, {
        deleteMessageSeconds,
        reason: `${message.author.username} (ID: ${message.author.id}) / ${reason}`,
      });

      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: **${targetUser.username}** has been **banned** from the server.`,
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

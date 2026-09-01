import { PermissionFlagsBits, User, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { promiseBanEntry, promiseUser } from "../../utils/promise";
import { getHardbanData } from "../../database/helpers";
import { sendConfirmationView } from "../../utils/components";

const command: Command = {
  name: "unban",
  description: "Unban a user from the server.",

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.BanMembers],
  requiredClientPermissions: [PermissionFlagsBits.BanMembers],

  syntax: "(member) [reason]",
  example: "evade Incorrect punishment",

  cooldown: {
    limit: 2,
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

    const targetArg = String(args[0]);
    let targetUser: User | undefined = await promiseUser(
      client,
      String(targetArg),
    );

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

    const reason = args.slice(1).join(" ") || "No reason provided.";

    try {
      const existingHardban = await getHardbanData(
        targetUser.id,
        message.guildId!,
      );

      if (existingHardban) {
        if (
          !message.member?.permissions.has(PermissionFlagsBits.Administrator)
        ) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: **${targetUser.username}** is **hardbanned** from the server. Only an **Administrator** can unban them.`,
              ),
            ],
          });
          return;
        }

        const confirmed = await sendConfirmationView(
          message,
          `${message.author}: Are you sure you want to **unban ${targetUser}**? They are **hardbanned from the server**.`,
        );
        if (!confirmed) return;
      }

      const banEntry = await promiseBanEntry(message.guild!, targetUser.id);
      if (!banEntry) {
        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: **${targetUser.username}** is **not banned** from the server.`,
            ),
          ],
        });
        return;
      }

      await message.guild!.members.unban(
        targetUser.id,
        `Unbanned by ${message.author.username} (ID: ${message.author.id}) / ${reason}`,
      );

      await send(message, {
        embeds: [
          Embeds.approve(
            `${message.author}: **${targetUser.username}** has been **unbanned** from the server.`,
          ),
        ],
      });
    } catch (error) {
      await send(message, {
        embeds: [
          Embeds.deny(`${message.author}: **Couldn't ban user**: ${error}.`),
        ],
      });
    }
  },
} satisfies Command;

export default command;

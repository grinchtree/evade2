import {
  GuildChannel,
  PermissionFlagsBits,
  ThreadChannel,
  type GuildBasedChannel,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { promiseChannel } from "../../utils/promise";
import { Embeds, send } from "../../utils/messaging";
import { ConfirmationView, sendConfirmationView } from "../../utils/components";

const command: Command = {
  name: "nuke",
  description: "Delete a channel and create a duplicate.",

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageChannels],
  requiredClientPermissions: [PermissionFlagsBits.ManageChannels],

  syntax: "[channel]",
  example: "",

  cooldown: {
    limit: 1,
    duration: 60,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    let channel: GuildChannel | undefined;

    if (args.length > 0) {
      const attempt = await promiseChannel(message.guild!, String(args[0]));

      if (attempt && !(attempt instanceof ThreadChannel)) {
        channel = attempt;
      }
    }

    if (!channel) {
      channel = message.channel as GuildChannel;
    }

    try {
      if (!channel.deletable) {
        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: I **don't have permission** to **delete** ${channel}.`,
            ),
          ],
        });
        return;
      }

      const confirmed = await sendConfirmationView(
        message,
        `${message.author}: Are you sure you want to **nuke ${channel}**? This will **permanently delete the channel**.`,
      );
      if (!confirmed) return;

      const clonedChannel = await channel.clone({
        position: channel.rawPosition,
        reason: `${message.author.username} (ID: ${message.author.id})`,
      });

      await channel.delete(
        `Nuked by ${message.author.username} (ID: ${message.author.id})`,
      );

      if (clonedChannel.isTextBased()) {
        await clonedChannel.send(
          `The previous channel was nuked by ${message.author}.`,
        );
      }
    } catch (error) {
      await send(message, {
        embeds: [Embeds.deny(`${message.author}: ${error}.`)],
      });
    }
  },
} satisfies Command;

export default command;

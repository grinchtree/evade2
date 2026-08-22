import {
  GuildChannel,
  PermissionFlagsBits,
  ThreadChannel,
  TextChannel,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";
import { promiseChannel } from "../../utils/promise";
import { sendConfirmationView } from "../../utils/components";

const command: Command = {
  name: "nuke",
  description: "Nuke a channel and replace it with a duplicate.",

  aliases: ["boom"],

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

    for (const arg of args) {
      if (!channel) {
        const attempt = await promiseChannel(message.guild!, arg);

        // ignore threads
        if (attempt instanceof ThreadChannel) {
          continue;
        }

        if (attempt) {
          channel = attempt as GuildChannel;
          continue;
        }
      }
    }

    // if no channel was found from arguments, use current channel
    if (!channel) {
      channel = message.channel as GuildChannel;
    }

    try {
      if (!channel.deletable) {
        // if the bot can't delete the channel, warn about it. usually because its a system channel.
        await send(message, {
          embeds: [
            Embeds.deny(
              `${message.author}: I **don't have permission** to nuke ${channel}.`,
            ),
          ],
        });
        return;
      }

      // 2 step
      const confirmed = await sendConfirmationView(
        message,
        `${message.author}: Are you sure you want to **nuke ${channel}**? This will **permanently delete the channel**.`,
      );
      if (!confirmed) return;

      // clone the channel
      const clonedChannel = await channel.clone({
        position: channel.rawPosition,
        reason: `Nuked by ${message.author.username} (ID: ${message.author.id})`,
      });

      // delete the original channel
      await channel.delete(
        `Nuked by ${message.author.username} (ID: ${message.author.id})`,
      );

      // send success message
      if (clonedChannel.isTextBased()) {
        const msg = await clonedChannel.send(
          `The previous channel was nuked by ${message.author}.`,
        );

        setTimeout(async () => {
          await msg.delete();
        }, 10000);
      }
    } catch (error) {
      await send(message, {
        embeds: [Embeds.deny(`${message.author}: ${error}.`)],
      });
    }
  },
} satisfies Command;

export default command;

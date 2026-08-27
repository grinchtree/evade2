import { EmbedBuilder, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";
import { getPrimaryImageColour } from "../../utils/image";

const command: Command = {
  name: "snipe",
  description: "Snipe a recently deleted message.",

  aliases: ["s"],

  guild_only: true,
  requiredUserPermissions: [],
  requiredClientPermissions: [],

  syntax: "[index]",
  example: "",

  cooldown: {
    limit: 2,
    duration: 5,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    if (message.channel.isDMBased()) return;

    let targetIndex = 0;
    if (args[0] && !isNaN(Number(args[0]))) {
      targetIndex = Number(args[0]) - 1;
    }

    const channelSnipes = client.messageSnipes.get(
      `${message.guildId}-${message.channelId}`,
    );

    if (!channelSnipes || channelSnipes.length === 0) {
      await send(message, {
        embeds: [
          Embeds.custom(
            ":mag:",
            `${message.author}: There hasn't been any snipes within the last **2 hours**.`,
            Colours.default,
          ),
        ],
      });
      return;
    }

    if (!channelSnipes[targetIndex]) {
      await send(message, {
        embeds: [
          Embeds.custom(
            ":mag:",
            `${message.author}: I couldn't find the snipes: \`${targetIndex + 1}\`.`,
            Colours.default,
          ),
        ],
      });
      return;
    }

    const snipe = channelSnipes[targetIndex];

    const diffInSeconds = Math.floor((Date.now() - snipe!.timestamp) / 1000);
    let timeAgo = "";

    if (diffInSeconds < 5) {
      timeAgo = "just now";
    } else if (diffInSeconds < 60) {
      timeAgo = `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      timeAgo = `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      timeAgo = `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      timeAgo = `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    const url = snipe!.author.displayAvatarURL({ size: 256, extension: "png" });
    const fcolour = await getPrimaryImageColour(url);
    const colour = fcolour !== null ? fcolour : 0x000000;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: snipe!.author.username || snipe!.author.displayName,
        iconURL: snipe!.author.displayAvatarURL(),
      })
      .setColor(colour)
      .setFooter({
        text: `deleted ${timeAgo} • snipe ${targetIndex + 1}/${channelSnipes.length}`,
      });

    if (snipe!.content) embed.setDescription(snipe!.content);
    if (snipe!.image) embed.setImage(snipe!.image);

    await send(message, { embeds: [embed] });
  },
} satisfies Command;

export default command;

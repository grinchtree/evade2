import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { promiseUser } from "../../utils/promise";
import { Embeds, send } from "../../utils/messaging";
import { EmbedBuilder } from "@discordjs/builders";
import { getPrimaryImageColour } from "../../utils/image";

const command: Command = {
  name: "banner",
  description: "View a users banner.",

  syntax: "[user]",
  example: "",

  cooldown: {
    limit: 2,
    duration: 10,
    type: "user",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    const targetArg = args[0];
    let targetUser = await promiseUser(
      client,
      targetArg || message.author.id,
      false,
      true,
    );

    if (!targetUser) {
      await send(message, {
        embeds: [
          Embeds.eyeGlass(
            `${message.author}: I couldn't find **a user** by: \`${targetArg}\`. Try using their **ID** instead.`,
          ),
        ],
      });
      return;
    }

    const url = targetUser.bannerURL({ size: 2048, extension: "png" });
    if (!url) {
      await send(message, {
        embeds: [
          Embeds.warning(
            `${message.author}: **${targetUser.username}** doesn't have a banner.`,
          ),
        ],
      });
      return;
    }

    const fcolour = await getPrimaryImageColour(url);
    const colour = fcolour !== null ? fcolour : 0x000000;

    const embed = new EmbedBuilder()
      .setTitle(`@${targetUser.username}'s Banner`)
      .setImage(url)
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ size: 512 }),
      })
      .setColor(colour);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("View Banner")
        .setStyle(ButtonStyle.Link)
        .setURL(url),
    );

    const msg = await send(message, { embeds: [embed], components: [row] });

    setTimeout(async () => {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("View Avatar")
          .setStyle(ButtonStyle.Link)
          .setURL(url)
          .setDisabled(true),
      );
      await msg.edit({ components: [row] });
    }, 30000);
  },
} satisfies Command;

export default command;

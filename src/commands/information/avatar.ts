import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { promiseUser } from "../../utils/promise";
import { Embeds, send } from "../../utils/messaging";
import { getPrimaryImageColour } from "../../utils/image";

const command: Command = {
  name: "avatar",
  description: "View a users avatar.",

  aliases: ["ava", "av", "pfp"],

  syntax: "[user]",
  example: "",

  cooldown: {
    limit: 2,
    duration: 5,
    type: "user",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    const targetArg = args[0];
    let targetUser = await promiseUser(client, targetArg || message.author.id);

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

    const url = targetUser.displayAvatarURL({ size: 2048, extension: "png" });
    const fcolour = await getPrimaryImageColour(url);
    const colour = fcolour !== null ? fcolour : 0x000000;

    const embed = new EmbedBuilder()
      .setTitle(`@${targetUser.username}'s Avatar`)
      .setImage(url)
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ size: 512 }),
      })
      .setColor(colour);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("View Avatar")
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

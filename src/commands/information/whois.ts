import {
  type Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { promiseMember, promiseUser } from "../../utils/promise";
import { Embeds, send } from "../../utils/messaging";
import { getPrimaryImageColour } from "../../utils/image";

const command: Command = {
  name: "whois",
  description: "View information about a user.",

  aliases: ["userid", "ui", "wi", "user"],

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

    let targetMember = await promiseMember(
      message.guild!,
      targetUser.id,
      false,
      true,
    );

    const dates = [
      `**Created**: <t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:D>`,
    ];

    let roleString = "";

    if (targetMember && targetMember.joinedAt) {
      dates.push(
        `**Joined**: <t:${Math.floor(targetMember.joinedAt.getTime() / 1000)}:D>`,
      );
      if (targetMember.premiumSince) {
        dates.push(
          `**Boosted**: <t:${Math.floor(targetMember.premiumSince.getTime() / 1000)}:D>`,
        );
      }

      const memberRoles = targetMember.roles.cache
        .filter((r) => r.id !== message.guild!.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => `<@&${r.id}>`);

      if (memberRoles.length > 13) {
        roleString = `${memberRoles.slice(0, 13).join(", ")}... and ${memberRoles.length - 13} more.`;
      } else if (memberRoles.length > 0) {
        roleString = memberRoles.join(", ");
      }
    }

    const avatarUrl = targetUser.displayAvatarURL({
      size: 2048,
      extension: "png",
    });
    const fcolour = await getPrimaryImageColour(avatarUrl);
    const colour = fcolour !== null ? fcolour : 0x000000;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("View Profile")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/users/${targetUser.id}`),

      new ButtonBuilder()
        .setLabel("View Avatar")
        .setStyle(ButtonStyle.Link)
        .setURL(avatarUrl),
    );

    const bannerUrl = targetUser.bannerURL({ size: 1024, extension: "png" });

    const mutualGuilds = client.guilds.cache.filter((guild) =>
      guild.members.cache.has(targetUser.id),
    );

    const embed = new EmbedBuilder()
      .setTitle(`@${targetUser.username}'s Profile`)
      .setThumbnail(avatarUrl)
      .setColor(colour)
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ size: 512 }),
      })
      .setFooter({
        text: `ID: ${targetUser.id}${mutualGuilds.size > 0 ? ` • ${mutualGuilds.size} mutual ${mutualGuilds.size === 1 ? "guild" : "guilds"}` : ""}`,
      });

    if (bannerUrl) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel("View Banner")
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl),
      );
      embed.setImage(bannerUrl);
    }

    embed.addFields({ name: "Dates", value: dates.join("\n") });

    if (roleString) {
      embed.addFields({ name: "Roles", value: roleString });
    }

    const msg = await send(message, { embeds: [embed], components: [row] });

    setTimeout(async () => {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("View Profile")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/users/${targetUser.id}`)
          .setDisabled(true),

        new ButtonBuilder()
          .setLabel("View Avatar")
          .setStyle(ButtonStyle.Link)
          .setURL(avatarUrl)
          .setDisabled(true),
      );

      if (bannerUrl) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel("View Banner")
            .setStyle(ButtonStyle.Link)
            .setURL(bannerUrl)
            .setDisabled(true),
        );
      }

      await msg.edit({ components: [row] });
    }, 30000);
  },
} satisfies Command;

export default command;

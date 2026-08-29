import { GuildMember, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";
import { Paginator } from "../../utils/components";

const command: Command = {
  name: "boosters",
  description: "List all of the server boosters.",

  aliases: ["boosts"],

  guild_only: true,

  cooldown: {
    limit: 1,
    duration: 15,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    const members = await message.guild!.members.fetch();

    const boosters = Array.from(members.values())
      .filter((member) => member.premiumSinceTimestamp !== null)
      .sort((a, b) => a.premiumSinceTimestamp! - b.premiumSinceTimestamp!);

    if (boosters.length === 0) {
      await send(message, {
        embeds: [
          Embeds.warning(
            `${message.author}: There **aren't any boosters** in the server.`,
          ),
        ],
      });
      return;
    }

    const paginator = new Paginator<GuildMember>({
      items: boosters,
      colour: Colours.theme,
      userId: message.author.id,
      author: {
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ size: 512 }),
      },
      title: "Server Boosters",
      formatItem: (member, index) => {
        const paddedIndex = String(index + 1).padStart(2, "0");
        const timestamp = Math.floor(member.premiumSinceTimestamp! / 1000);

        return `\`${paddedIndex}\` ${member.user} (<t:${timestamp}:R>>)`;
      },
    });

    await paginator.start(message);
  },
} satisfies Command;

export default command;

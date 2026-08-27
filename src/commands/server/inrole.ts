import { type Message, type GuildMember } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";
import { Paginator } from "../../utils/components";
import { promiseRole } from "../../utils/promise";

const command: Command = {
  name: "inrole",
  description: "List all of the members in a role.",

  guild_only: true,

  syntax: "(role)",
  example: "@Owner",

  cooldown: {
    limit: 1,
    duration: 30,
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
    const targetRole = await promiseRole(
      message.guild!,
      String(targetArg),
      false,
      true,
    );

    if (!targetRole) {
      await send(message, {
        embeds: [
          Embeds.eyeGlass(
            `${message.author}: I couldn't find **a role** by: \`${targetArg}\`. Try using its **ID** instead.`,
          ),
        ],
      });
      return;
    }

    await message.guild!.members.fetch();
    const members = Array.from(targetRole.members.values());

    if (members.length === 0) {
      await send(message, {
        embeds: [
          Embeds.eyeGlass(
            `${message.author}: There are **no members** with the ${targetRole} role.`,
          ),
        ],
      });
      return;
    }

    const paginator = new Paginator<GuildMember>({
      items: members,
      colour: targetRole.colors.primaryColor || Colours.theme,
      userId: message.author.id,
      author: {
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ size: 1024 }),
      },
      title: `Members in ${targetRole.name}`,
      formatItem: (member, index) => {
        const paddedIndex = String(index + 1).padStart(2, "0");
        return `\`${paddedIndex}\` ${member}`;
      },
      getSearchString: (member) => member.user.username,
      timeout: 30000,
    });

    await paginator.start(message);
  },
} satisfies Command;

export default command;

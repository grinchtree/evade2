import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";

const command: Command = {
  name: "clearsnipes",
  description: "Clears all snipes for the current server.",

  aliases: ["csnipes", "cs"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageMessages],

  syntax: "",
  example: "",

  cooldown: {
    limit: 2,
    duration: 10,
    type: "member",
  },

  execute: async (client: evClient, message: Message) => {
    if (!message.guildId) return;

    client.messageSnipes.deleteByNamespace(message.guildId);

    await send(message, {
      embeds: [
        Embeds.approve(
          `${message.author}: Cleared **all snipes** from within the last 2 hours.`,
        ),
      ],
    });
  },
} satisfies Command;

export default command;

import { type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";

const command: Command = {
  name: "roles",
  description: "List all of the roles in the server.",

  guild_only: true,

  cooldown: {
    limit: 1,
    duration: 30,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    const command = client.getCommand("role list");
    if (!command) return;
    await command.execute(client, message, args);
  },
} satisfies Command;

export default command;

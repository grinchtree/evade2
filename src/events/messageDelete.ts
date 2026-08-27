import { Events, Message } from "discord.js";
import type { Event } from "../interfaces/Event";
import type { evClient } from "../structs/Client";

const event: Event = {
  name: Events.MessageDelete,
  once: false,
  execute: async (message: Message, client: evClient) => {
    if (message.author?.bot) return;
    if (!message.guild) return;
    if (message.partial) return;

    const image = message.attachments.first()?.url || null;
    if (!message.content && !image) return;

    const key = `${message.guild.id}-${message.channelId}`;
    const currentSnipes = client.messageSnipes.get(key) || [];

    currentSnipes.unshift({
      content: message.content,
      author: message.author,
      image: image,
      timestamp: Date.now(),
    });

    client.messageSnipes.set(key, currentSnipes.slice(0, 50), message.guild.id);
  },
} satisfies Event;

export default event;

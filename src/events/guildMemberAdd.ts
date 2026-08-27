import { Events } from "discord.js";
import type { Event } from "../interfaces/Event";
import type { evClient } from "../structs/Client";
import type { GuildMember } from "discord.js";
import { getAutoroleData } from "../database/helpers";
import { logging } from "../utils/logging";

const event: Event = {
  name: Events.GuildMemberAdd,
  once: false,
  execute: async (member: GuildMember, client: evClient) => {
    const data = await getAutoroleData(member.guild.id, true);

    if (!data || !data.roles.length) return;

    const validRoles = data.roles.filter((roleId) => {
      const role = member.guild.roles.cache.get(roleId);
      return role && role.editable;
    });

    if (validRoles.length > 0) {
      try {
        await member.roles.add(validRoles, "Automatically assigned roles");
      } catch (error) {
        logging.error(String(error));
      }
    }
  },
} satisfies Event;

export default event;

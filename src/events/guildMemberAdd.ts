import { Events } from "discord.js";
import type { Event } from "../interfaces/Event";
import type { evClient } from "../structs/Client";
import type { GuildMember } from "discord.js";
import {
  getAutoroleData,
  getHardbanData,
  getMemberStickyRoles,
} from "../database/helpers";
import { logging } from "../utils/logging";

const event: Event = {
  name: Events.GuildMemberAdd,
  execute: async (member: GuildMember, client: evClient) => {
    const existingHardban = await getHardbanData(member.guild.id, member.id);
    if (!existingHardban) {
      await member.guild.members.ban(member.id, {
        reason: `Enforcing hardban`,
      });
    }

    // fetch both datasets simultaneously to speed up execution
    const [autoroleData, stickyRoleIds] = await Promise.all([
      getAutoroleData(member.guild.id, true),
      getMemberStickyRoles(member.id, member.guild.id),
    ]);

    const rolesToAdd = new Set<string>();

    if (autoroleData?.roles) {
      for (const id of autoroleData.roles) rolesToAdd.add(id);
    }
    for (const id of stickyRoleIds) {
      rolesToAdd.add(id);
    }

    if (rolesToAdd.size === 0) return;

    // ensure we don't try to add roles higher than the bot
    const botPosition = member.guild.members.me?.roles.highest.position;

    if (botPosition === undefined) return;

    const validRoles = Array.from(rolesToAdd).filter((roleId) => {
      const role = member.guild.roles.cache.get(roleId);
      return role && role.position < botPosition;
    });

    if (validRoles.length === 0) return;

    try {
      await member.roles.add(
        validRoles,
        "Enforcing autoroles and sticky roles",
      );
    } catch (error: any) {
      logging.error(
        `failed to assign roles to ${member.user.username} in ${member.guild.name}: ${error.message || error}`,
      );
    }
  },
} satisfies Event;

export default event;

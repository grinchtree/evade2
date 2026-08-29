import { Events } from "discord.js";
import type { Event } from "../interfaces/Event";
import type { evClient } from "../structs/Client";
import type { GuildMember } from "discord.js";
import { getMemberStickyRoles } from "../database/helpers";
import { logging } from "../utils/logging";

const event: Event = {
  name: Events.GuildMemberUpdate,
  execute: async (
    oldMember: GuildMember,
    newMember: GuildMember,
    client: evClient,
  ) => {
    // catch any roles that were manually stripped from the user
    const removedRoles = oldMember.roles.cache.filter(
      (role) => !newMember.roles.cache.has(role.id),
    );

    if (removedRoles.size > 0) {
      const stickyRoleIds = await getMemberStickyRoles(
        newMember.id,
        newMember.guild.id,
      );

      if (stickyRoleIds.length === 0) return;

      const rolesToRestore = removedRoles.filter((role) =>
        stickyRoleIds.includes(role.id),
      );

      if (rolesToRestore.size > 0) {
        try {
          await newMember.roles.add(rolesToRestore, "enforcing sticky roles");
        } catch (error: any) {
          logging.error(
            `failed to enforce sticky roles for ${newMember.user.username} in ${newMember.guild.name}: ${error.message || error}`,
          );
        }
      }
    }
  },
} satisfies Event;

export default event;

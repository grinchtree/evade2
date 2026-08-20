import type { GuildMember, Message, Role } from "discord.js";
import { Embeds, send } from "./messaging";

export interface HierarchyOptions {
  allowOnExecutor?: boolean;
  allowOnGuildOwner?: boolean;
  allowOnBot?: boolean;
}

export interface RoleHierarchyOptions {
  allowManaged?: boolean;
  allowBotRole?: boolean;
  allowEveryone?: boolean;
}

// make sure users and the bot have permission to moderate a target member
export async function checkHierarchy(
  message: Message,
  target: GuildMember,
  action: string,
  options: HierarchyOptions = {},
): Promise<boolean> {
  if (!message.guild || !message.member) return false;

  const exec = message.member;
  const bot = message.guild.members.me;

  if (!bot) return false;

  const allowOnExec = options.allowOnExecutor ?? false;
  const allowOnGuildOwner = options.allowOnGuildOwner ?? false;
  const allowOnBot = options.allowOnBot ?? false;

  // prevent the user from targeting themselves
  if (!allowOnExec && target.id === exec.id) {
    await send(message, {
      embeds: [
        Embeds.deny(`${message.author}: You **can't ${action} yourself**.`),
      ],
    });
    return false;
  }

  // stop the bot from trying to moderate itself
  if (!allowOnBot && target.id === bot.id) {
    await send(message, {
      embeds: [Embeds.deny(`${message.author}: I **can't ${action} myself**.`)],
    });
    return false;
  }

  // stop anyone from moderating the server owner (unless explicitly permitted)
  if (!allowOnGuildOwner && target.id === message.guild.ownerId) {
    await send(message, {
      embeds: [
        Embeds.deny(
          `${message.author}: You **can't ${action}** the **server owner**.`,
        ),
      ],
    });
    return false;
  }

  // executor needs a higher role than the target (unless they own the server)
  if (exec.id !== message.guild.ownerId) {
    if (target.roles.highest.position >= exec.roles.highest.position) {
      const comparison =
        target.roles.highest.position === exec.roles.highest.position
          ? "equal to"
          : "higher than";

      await send(message, {
        embeds: [
          Embeds.deny(
            `${message.author}: You **can't ${action}** someone who is **${comparison} you**.`,
          ),
        ],
      });
      return false;
    }
  }

  // the bot needs a higher role than the target.
  // (we skip this check if the target is the owner, because if they made it past
  // the owner check above, it means allowOnGuildOwner is true and we want it to run).
  if (target.id !== message.guild.ownerId) {
    if (target.roles.highest.position >= bot.roles.highest.position) {
      const comparison =
        target.roles.highest.position === bot.roles.highest.position
          ? "equal to"
          : "higher than";

      await send(message, {
        embeds: [
          Embeds.deny(
            `${message.author}: I **can't ${action}** someone who is **${comparison} me**.`,
          ),
        ],
      });
      return false;
    }
  }

  return true;
}

// make sure users and the bot have permission to modify a specific role
export async function checkRoleHierarchy(
  message: Message,
  targetRole: Role,
  action: string,
  options: RoleHierarchyOptions = {},
): Promise<boolean> {
  if (!message.guild || !message.member) return false;

  const exec = message.member;
  const bot = message.guild.members.me;

  if (!bot) return false;

  const allowManaged = options.allowManaged ?? false;
  const allowBot = options.allowBotRole ?? false;
  const allowEveryone = options.allowEveryone ?? false;

  // trying to modify the default @everyone role usually breaks discord api calls
  if (!allowEveryone && targetRole.id === message.guild.id) {
    await send(message, {
      embeds: [
        Embeds.deny(
          `${message.author}: You **can't ${action}** the **@everyone** role.`,
        ),
      ],
    });
    return false;
  }

  // prevent the bot from trying to modify its own dedicated integration role
  if (!allowBot && targetRole.tags?.botId === bot.id) {
    await send(message, {
      embeds: [
        Embeds.deny(
          `${message.author}: I **cannot ${action} my own bot role** (${targetRole.toString()}).`,
        ),
      ],
    });
    return false;
  }

  // ignore roles managed by discord or other bots (like nitro booster roles)
  if (!allowManaged && targetRole.managed) {
    await send(message, {
      embeds: [
        Embeds.deny(
          `${message.author}: You **can't ${action}** an **integrated or managed role** (${targetRole.toString()}).`,
        ),
      ],
    });
    return false;
  }

  // executor's highest role must be above the target role (unless they own the server)
  if (exec.id !== message.guild.ownerId) {
    if (targetRole.position >= exec.roles.highest.position) {
      const comparison =
        targetRole.position === exec.roles.highest.position
          ? "equal to"
          : "higher than";

      await send(message, {
        embeds: [
          Embeds.deny(
            `${message.author}: You **can't ${action}** a role that is **${comparison} you**.`,
          ),
        ],
      });
      return false;
    }
  }

  // the bot's highest role also needs to be above the target role
  if (targetRole.position >= bot.roles.highest.position) {
    const comparison =
      targetRole.position === bot.roles.highest.position
        ? "equal to"
        : "higher than";

    await send(message, {
      embeds: [
        Embeds.deny(
          `${message.author}: I **can't ${action}** a role that is **${comparison} me**.`,
        ),
      ],
    });
    return false;
  }

  return true;
}

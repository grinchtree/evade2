import {
  PermissionFlagsBits,
  type GuildMember,
  type Message,
  type Role,
} from "discord.js";
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

  // executor needs a higher role than the target
  // (skipped if executor owns the server OR is explicitly permitted to target themselves)
  const isPermittedSelf = allowOnExec && target.id === exec.id;

  if (exec.id !== message.guild.ownerId && !isPermittedSelf) {
    const execPosDiff = exec.roles.highest.comparePositionTo(
      target.roles.highest,
    );

    if (execPosDiff <= 0) {
      const comparison = execPosDiff === 0 ? "equal to" : "higher than";

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

  // the bot needs a higher role than the target
  // (skipped if target is the owner and permitted OR target is the bot and permitted)
  const isPermittedOwner =
    allowOnGuildOwner && target.id === message.guild.ownerId;
  const isPermittedBot = allowOnBot && target.id === bot.id;

  if (!isPermittedOwner && !isPermittedBot) {
    const botPosDiff = bot.roles.highest.comparePositionTo(
      target.roles.highest,
    );
    const isTimeoutAdmin =
      action === "timeout" &&
      target.permissions.has(PermissionFlagsBits.Administrator);

    // trigger if the bot is lower/equal, OR if it's an admin timeout attempt
    if (botPosDiff <= 0 || isTimeoutAdmin) {
      // if target is strictly higher in the role list, use "higher than".
      // if target is equal, OR if they are lower but have Admin immunity, use "equal to".
      const comparison = botPosDiff < 0 ? "higher than" : "equal to";

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

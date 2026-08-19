import type { GuildMember, Message, Role } from "discord.js";
import { Embeds, send } from "./messaging";

interface HierarchyOptions {
  allowOnExecutor?: boolean;
  allowOnGuildOwner?: boolean;
  allowOnBot?: boolean;
}

// make sure users and the bot have permission to moderate a target
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

  // nobody gets to moderate the server owner
  if (!allowOnGuildOwner && target.id === message.guild.ownerId) {
    await send(message, {
      embeds: [
        Embeds.deny(
          `${message.author} You **can't ${action}** the **server owner**.`,
        ),
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

  // the bot also needs to be higher in the role hierarchy
  if (
    target.id === message.guild.ownerId ||
    target.roles.highest.position >= bot.roles.highest.position
  ) {
    const comparison =
      target.roles.highest.position === bot.roles.highest.position
        ? "equal to"
        : "higher than";

    await send(message, {
      embeds: [
        Embeds.deny(
          `${message.author}: I **can't ${action}** someone who is **${comparison} me**`,
        ),
      ],
    });
    return false;
  }

  return true;
}

export async function checkRoleHierarchy(
  message: Message,
  targetRole: Role,
  action: string,
): Promise<boolean> {
  if (!message.guild || !message.member) return false;

  const exec = message.member;
  const bot = message.guild.members.me;

  if (!bot) return false;

  // prevent the bot from trying to modify its own dedicated role
  if (targetRole.tags?.botId === bot.id) {
    await send(message, {
      embeds: [
        Embeds.deny(
          `${message.author}: I **cannot ${action} my own bot role** (${targetRole.toString()}).`,
        ),
      ],
    });
    return false;
  }

  // ignore roles managed by discord or integrations (like nitro booster or other bots)
  if (targetRole.managed) {
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

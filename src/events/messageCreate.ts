import { Collection, Events, Message, PermissionFlagsBits } from "discord.js";
import type { evClient } from "../structs/Client";
import type { Event } from "../interfaces/Event";
import { config } from "../../config";
import type { Command } from "../interfaces/Command";
import { formatPermissions } from "../utils/formatters";
import { Colours, Embeds, Emojis, send } from "../utils/messaging";
import { logging } from "../utils/logging";
import {
  getDisabledCommandData,
  getPrefixData,
  getUserData,
  getGuildData,
} from "../database/helpers";

const event: Event = {
  name: Events.MessageCreate,
  execute: async (message: Message, client: evClient) => {
    // ignore other bots immediately to save unnecessary database queries
    if (message.author.bot) return;

    // fetch user data for personal prefix, and guild data for server prefix
    const userData = await getUserData(message.author.id, false);
    const personalPrefix = userData?.personal_prefix;

    const serverPrefix = message.guild
      ? await getPrefixData(message.guild.id)
      : config.prefix;

    // determine which prefix was used (prioritizing the personal one)
    let usedPrefix = "";
    if (personalPrefix && message.content.startsWith(personalPrefix)) {
      usedPrefix = personalPrefix;
    } else if (message.content.startsWith(serverPrefix)) {
      usedPrefix = serverPrefix;
    } else {
      return; // ignore messages that don't start with a valid prefix
    }

    // split the message into the command name and its arguments based on the exact prefix used
    const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
    let commandName = args.shift()?.toLowerCase();

    if (client.commandCaseSensitive === true && commandName) {
      // Re-grab the original casing if the bot is case sensitive
      commandName = message.content
        .slice(usedPrefix.length)
        .trim()
        .split(/ +/)[0];
    }

    if (!commandName) return;

    // resolve custom server aliases first
    if (message.guildId) {
      const guildData = await getGuildData(message.guildId, false);
      const customAliases = guildData?.preferences?.aliases || {};

      // if the user typed a custom alias, silently swap it to the real command name
      if (customAliases[commandName.toLowerCase()]) {
        commandName = customAliases[commandName.toLowerCase()];
      }
    }

    const disabledData = await getDisabledCommandData(message.guildId!);
    const currentDisabled = disabledData?.command_names || [];
    if (currentDisabled.includes(commandName!.toLowerCase())) return;

    // look for the root command or its alias
    const parentCommand =
      client.commands.get(commandName!.toLowerCase()) ||
      client.commands.get(
        client.commandAliases.get(commandName!.toLowerCase()) as string,
      );

    if (!parentCommand) return;

    let currentCommand = parentCommand;
    const invokedCommandNames = [currentCommand.name];

    // walk down the command tree to find the exact subcommand invoked
    while (args.length > 0 && currentCommand.subCommands) {
      const nextArg = args[0]?.toLowerCase();

      // prevent infinite loops if an argument is somehow falsy/empty
      if (!nextArg) {
        args.shift();
        continue;
      }

      const childCommand = currentCommand.subCommands.find(
        (c: Command) =>
          c.name === nextArg || (c.aliases && c.aliases.includes(nextArg)),
      );

      if (childCommand) {
        currentCommand = childCommand;
        invokedCommandNames.push(nextArg);
        args.shift();
      } else {
        break;
      }
    }

    const invokedPathStr = invokedCommandNames.join(" ");

    // prevent server-only commands from running in dms
    if (currentCommand.guild_only && !message.guild) return;

    // check if the user has the required permissions to run this
    if (currentCommand.requiredUserPermissions && message.member) {
      const missingPerms = message.member.permissions.missing(
        currentCommand.requiredUserPermissions,
      );

      if (missingPerms.length > 0) {
        const formatted = formatPermissions(missingPerms);
        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: You're **missing** the permissions: \`${formatted}\`.`,
            ),
          ],
        });
        return;
      }
    }

    // check if the bot has the permissions it needs to execute the command (always requiring embed links)
    if (message.guild?.members.me) {
      const requiredClientPerms = currentCommand.requiredClientPermissions
        ? [
            ...currentCommand.requiredClientPermissions,
            PermissionFlagsBits.EmbedLinks,
          ]
        : [PermissionFlagsBits.EmbedLinks];

      const missingPerms =
        message.guild.members.me.permissions.missing(requiredClientPerms);

      if (missingPerms.length > 0) {
        const formatted = formatPermissions(missingPerms);

        // if we are missing embed links, we must fall back to plain text because our embed will fail to send
        if (missingPerms.includes("EmbedLinks")) {
          // bypass the custom send wrapper to ensure this sends purely as string content
          await send(message, {
            content: `⚠️ ${message.author}: I'm **missing** the permissions: \`${formatted}\`.`,
          }).catch(() => {}); // silently fail if we don't even have send messages perms
          return;
        }

        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: I'm **missing** the permissions: \`${formatted}\`.`,
            ),
          ],
        });
        return;
      }
    }

    // --- FINAL DATABASE CHECKS ---

    // check if the command is restricted to premium users
    if (currentCommand.requiresUserPremium) {
      // Auto-create is set to true here so they have a profile if they eventually upgrade
      const premiumUserData = await getUserData(message.author.id, true);

      if (!premiumUserData?.premium) {
        await send(message, {
          embeds: [
            Embeds.eyeGlass(
              `${message.author}: The **${invokedPathStr}** command is restricted to **Premium** users.`,
            ),
          ],
        });
        return;
      }
    }

    // handle command rate limiting
    if (currentCommand.cooldown) {
      if (!client.cooldowns.has(invokedPathStr)) {
        client.cooldowns.set(invokedPathStr, new Collection());
      }

      const now = Date.now();
      const timestamps = client.cooldowns.get(invokedPathStr)!;

      const { duration, limit, type } = currentCommand.cooldown;
      const cooldownAmount = duration * 1000;

      // figure out who or what we are rate limiting based on the cooldown type
      let targetId = message.author.id;
      switch (type) {
        case "member":
          targetId = `${message.guild?.id}-${message.author.id}`;
          break;
        case "guild":
          targetId = message.guild?.id || message.author.id;
          break;
        case "channel":
          targetId = message.channel.id;
          break;
        case "global":
          targetId = "global";
          break;
      }

      const cooldownData = timestamps.get(targetId);
      if (cooldownData) {
        if (now < cooldownData.expiredAt) {
          if (cooldownData.count >= limit) {
            const timeLeft = ((cooldownData.expiredAt - now) / 1000).toFixed(1);
            await send(message, {
              embeds: [
                Embeds.custom(
                  Emojis.cooldown,
                  `${message.author}: **${invokedPathStr}** is on cooldown. Try again in **${timeLeft}s**.`,
                  Colours.iceBlue,
                ),
              ],
            });
            return;
          } else {
            cooldownData.count++;
          }
        } else {
          timestamps.set(targetId, {
            count: 1,
            expiredAt: now + cooldownAmount,
          });
          setTimeout(() => timestamps.delete(targetId), cooldownAmount);
        }
      } else {
        timestamps.set(targetId, { count: 1, expiredAt: now + cooldownAmount });
        setTimeout(() => timestamps.delete(targetId), cooldownAmount);
      }
    }

    // run the command, catching any unexpected crashes
    try {
      await currentCommand.execute(client, message, args);
    } catch (error) {
      logging.error(`Failed to execute command '${invokedPathStr}' @ ${error}`);
      await send(message, {
        embeds: [
          Embeds.deny(
            `${message.author}: **${invokedPathStr}** encountered an error: ${error}.`,
          ),
        ],
      });
    }
  },
} satisfies Event;

export default event;

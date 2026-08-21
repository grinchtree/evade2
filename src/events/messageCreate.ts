import { Collection, Emoji, Events, Message } from "discord.js";
import type { evClient } from "../structs/Client";
import type { Event } from "../interfaces/Event";
import { config } from "../../config";
import type { Command } from "../interfaces/Command";
import { formatPermissions } from "../utils/formatters";
import { Colours, Embeds, Emojis, send } from "../utils/messaging";
import { logging } from "../utils/logging";
import { getDisabledCommandData, getPrefixData } from "../database/helpers";

const event: Event = {
  name: Events.MessageCreate,
  execute: async (message: Message, client: evClient) => {
    const prefix = message.guild
      ? await getPrefixData(message.guild.id)
      : config.prefix;

    // ignore other bots and messages that don't start with our prefix
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    // split the message into the command name and its arguments
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    let commandName = args.shift()?.toLowerCase();
    if (client.commandCaseSensitive === true) {
      commandName = args.shift();
    }

    if (!commandName) return;

    const disabledData = await getDisabledCommandData(message.guildId!);
    const currentDisabled = disabledData?.command_names || [];
    if (currentDisabled.includes(commandName)) return;

    // look for the root command or its alias
    const parentCommand =
      client.commands.get(commandName) ||
      client.commands.get(client.commandAliases.get(commandName) as string);

    if (!parentCommand) return;

    let currentCommand = parentCommand;
    const invokedCommandNames = [currentCommand.name];

    // walk down the command tree to find the exact subcommand invoked
    while (args.length > 0 && currentCommand.subCommands) {
      const nextArg = args[0]?.toLowerCase();
      if (!nextArg) continue;

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
              `${message.author}: I'm **missing** permissions: \`${formatted}\`.`,
            ),
          ],
        });
        return;
      }
    }

    // check if the bot has the permissions it needs to execute the command
    if (currentCommand.requiredClientPermissions && message.guild?.members.me) {
      const missingPerms = message.guild.members.me.permissions.missing(
        currentCommand.requiredClientPermissions,
      );

      if (missingPerms.length > 0) {
        const formatted = formatPermissions(missingPerms);
        await send(message, {
          embeds: [
            Embeds.warning(
              `${message.author}: I'm **missing** permissions: \`${formatted}\`.`,
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

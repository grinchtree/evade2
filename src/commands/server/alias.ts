import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { getGuildData, updateGuildData } from "../../database/helpers";
import { Colours, Embeds, send } from "../../utils/messaging";
import { Paginator } from "../../utils/components";

const command: Command = {
  name: "alias",
  description: "Manage the servers custom command aliases.",

  aliases: ["aliases", "commandalias"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.Administrator],

  syntax: "(type) [alias] [command]",
  example: "add b ban",

  cooldown: {
    limit: 2,
    duration: 5,
    type: "member",
  },

  subCommands: [
    {
      name: "list",
      description: "List all custom command aliases in the server.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],

      execute: async (client: evClient, message: Message, args: string[]) => {
        const guildData = await getGuildData(message.guildId!, true);
        const aliases = guildData?.preferences?.aliases || {};
        const aliasKeys = Object.keys(aliases);

        if (aliasKeys.length === 0) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: There **aren't any custom aliases** set in the server.`,
              ),
            ],
          });
          return;
        }

        const aliasEntries = aliasKeys.map(
          (key) => `**${key}** -> \`${aliases[key]}\``,
        );

        const paginator = new Paginator<string>({
          items: aliasEntries,
          colour: Colours.theme,
          userId: message.author.id,
          author: {
            name: message.author.username,
            iconURL: message.author.displayAvatarURL({ size: 512 }),
          },
          title: `Custom Command Aliases`,
          formatItem: (item, index) => {
            const paddedIndex = String(index + 1).padStart(2, "0");
            return `\`${paddedIndex}\` ${item}`;
          },
          timeout: 30000,
        });

        await paginator.start(message);
      },
    },
    {
      name: "add",
      description: "Create a new command alias.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],

      syntax: "(alias) (command)",
      example: "b ban",

      execute: async (client: evClient, message: Message, args: string[]) => {
        const newAlias = args[0]?.toLowerCase();
        const targetCommandName = args[1]?.toLowerCase();

        if (!newAlias || !targetCommandName) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "alias add",
              ),
            ],
          });
          return;
        }

        if (newAlias.length > 15) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: The alias **can't be longer** than **15 characters**.`,
              ),
            ],
          });
          return;
        }

        const rootCommand =
          client.commands.get(targetCommandName) ||
          client.commands.get(
            client.commandAliases.get(targetCommandName) as string,
          );

        if (!rootCommand) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: The command \`${targetCommandName}\` **does not exist**.`,
              ),
            ],
          });
          return;
        }

        if (
          client.commands.has(newAlias) ||
          client.commandAliases.has(newAlias)
        ) {
          await send(message, {
            embeds: [
              Embeds.deny(
                `${message.author}: You can't use \`${newAlias}\` as an alias **already exists** for a **default command**.`,
              ),
            ],
          });
          return;
        }

        const guildData = await getGuildData(message.guildId!, true);
        const currentPrefrences = guildData?.preferences || {};
        const currentAliases = currentPrefrences.aliases || {};

        if (Object.keys(currentAliases).length >= 50) {
          await send(message, {
            embeds: [
              Embeds.deny(
                `${message.author}: You can't **add any more aliases**, the limit **per-server** is **50**.`,
              ),
            ],
          });
          return;
        }

        const updatedAliases = {
          ...currentAliases,
          [newAlias]: rootCommand.name,
        };

        await updateGuildData(message.guildId!, {
          preferences: { ...currentPrefrences, aliases: updatedAliases },
        });

        await send(message, {
          embeds: [
            Embeds.approve(
              `${message.author}: Successfully added \`${newAlias}\` as an alias for **${rootCommand.name}**.`,
            ),
          ],
        });
      },
    },
    {
      name: "remove",
      description: "Delete a custom alias.",

      syntax: "(alias)",
      example: "b",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],

      execute: async (client: evClient, message: Message, args: string[]) => {
        const targetAlias = args[0]?.toLowerCase();

        if (!targetAlias) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "alias remove",
              ),
            ],
          });
          return;
        }

        const guildData = await getGuildData(message.guildId!, true);
        const currentPreferences = guildData?.preferences || {};
        const currentAliases = currentPreferences.aliases || {};

        if (!currentAliases[targetAlias]) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: The alias \`${targetAlias}\` **doesn't exist**.`,
              ),
            ],
          });
          return;
        }

        delete currentAliases[targetAlias];

        await updateGuildData(message.guildId!, {
          preferences: { ...currentPreferences, aliases: currentAliases },
        });

        await send(message, {
          embeds: [
            Embeds.approve(
              `${message.author}: Successfully **removed** \`${targetAlias}\` as an alias.`,
            ),
          ],
        });
      },
    },
  ],

  execute: async (client: evClient, message: Message, args: string[]) => {
    await send(message, {
      embeds: [await Embeds.commandExample(message, client, command)],
    });
  },
} satisfies Command;

export default command;

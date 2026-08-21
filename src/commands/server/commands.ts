import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";
import { Paginator } from "../../utils/views";
import {
  getDisabledCommandData,
  getPrefixData,
  updateDisabledCommandData,
} from "../../database/helpers";

const command: Command = {
  name: "commands",
  description: "Manage the servers commands.",

  syntax: "(subcommand) (arguments)",
  example: "disable ban",

  subCommands: [
    {
      name: "disable",
      description: "Disable a command from evade",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      requiredClientPermissions: [PermissionFlagsBits.Administrator],

      syntax: "(command)",
      example: "ban",

      subCommands: [
        {
          name: "list",
          description: "View a list of all disabled commands in this server",

          guild_only: true,
          requiredUserPermissions: [PermissionFlagsBits.Administrator],
          requiredClientPermissions: [PermissionFlagsBits.Administrator],

          syntax: "",
          example: "",
          execute: async (
            client: evClient,
            message: Message,
            args: string[],
          ) => {
            // fetch the disabled commands for this server
            const disabledData = await getDisabledCommandData(message.guildId!);
            const disabledCommands = disabledData?.command_names || [];

            // if there are no disabled commands, let the user know and exit
            if (disabledCommands.length === 0) {
              await send(message, {
                embeds: [
                  Embeds.approve(
                    `${message.author}: There are **no disabled commands** in this server.`,
                  ),
                ],
              });
              return;
            }

            // sort the command names alphabetically
            const sortedCommands = [...disabledCommands].sort((a, b) =>
              a.localeCompare(b),
            );

            // initialize the paginator with our sorted strings
            const paginator = new Paginator<string>({
              items: sortedCommands,
              colour: Colours.theme,
              userId: message.author.id,
              author: {
                name: message.author.username,
                iconURL: message.author.displayAvatarURL({ size: 1024 }),
              },
              title: "Disabled Commands",

              // format each row as `01` **commandname**
              formatItem: (item, index) => {
                const paddedIndex = String(index + 1).padStart(2, "0");
                return `\`${paddedIndex}\` **${item}**`;
              },
            });

            // start the paginator
            await paginator.start(message);
          },
        },
      ],

      execute: async (client: evClient, message: Message, args: string[]) => {
        // if no arguments are provided, show the command usage example
        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "commands disable",
              ),
            ],
          });
          return;
        }

        const targetName = args[0]?.toLowerCase();

        // find the target command by its name or one of its aliases
        const targetCommand =
          client.commands.get(targetName || "") ||
          client.commands.find((c) => c.aliases?.includes(targetName || ""));

        // if the command doesn't exist, let the user know
        if (!targetCommand) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I **couldn't find a command** by: \`${targetName}\`.`,
              ),
            ],
          });
          return;
        }

        // safeguard: prevent users from disabling the command manager itself
        if (["commands"].includes(targetCommand.name)) {
          await send(message, {
            embeds: [
              Embeds.deny(
                `${message.author}: You **can't disable** the command: \`commands\`.`,
              ),
            ],
          });
          return;
        }

        // fetch the current list of disabled commands for this server
        const disabledData = await getDisabledCommandData(message.guildId!);
        const currentDisabled = disabledData?.command_names || [];

        // check if the command is already disabled to prevent duplicates
        if (currentDisabled.includes(targetCommand.name)) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: **${targetCommand.name}** is **already disabled**.`,
              ),
            ],
          });
          return;
        }

        // append the new command to the list and save it to the database
        const newDisabledList = [...currentDisabled, targetCommand.name];
        await updateDisabledCommandData(message.guildId!, {
          command_names: newDisabledList,
        });

        // confirm the action was successful
        await send(message, {
          embeds: [
            Embeds.approve(
              `${message.author}: Successfully **disabled** the command: \`${targetCommand.name}\`.`,
            ),
          ],
        });
      },
    },
    {
      name: "enable",
      description: "Enable a previously disabled command",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      requiredClientPermissions: [PermissionFlagsBits.Administrator],

      syntax: "(command)",
      example: "ban",
      execute: async (client: evClient, message: Message, args: string[]) => {
        // if no arguments are provided, show the command usage example
        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "commands enable",
              ),
            ],
          });
          return;
        }

        const targetName = args[0]?.toLowerCase();

        // find the target command by its name or one of its aliases
        const targetCommand =
          client.commands.get(targetName || "") ||
          client.commands.find((c) => c.aliases?.includes(targetName || ""));

        // if the command doesn't exist, let the user know
        if (!targetCommand) {
          await send(message, {
            embeds: [
              Embeds.eyeGlass(
                `${message.author}: I **couldn't find a command** by: \`${targetName}\`.`,
              ),
            ],
          });
          return;
        }

        // fetch the current list of disabled commands for this server
        const disabledData = await getDisabledCommandData(message.guildId!);
        const currentDisabled = disabledData?.command_names || [];

        // verify the command is actually disabled before trying to enable it
        if (!currentDisabled.includes(targetCommand.name)) {
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: **${targetCommand.name}** is **not disabled**.`,
              ),
            ],
          });
          return;
        }

        // filter the command out of the array and save the updated list to the database
        const newDisabledList = currentDisabled.filter(
          (cmd) => cmd !== targetCommand.name,
        );

        await updateDisabledCommandData(message.guildId!, {
          command_names: newDisabledList,
        });

        // confirm the action was successful
        await send(message, {
          embeds: [
            Embeds.approve(
              `${message.author}: Successfully **enabled** the command: \`${targetCommand.name}\`.`,
            ),
          ],
        });
      },
    },
  ],

  execute: async (client: evClient, message: Message, args: string[]) => {
    const commands = Array.from(client.commands.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const prefix = await getPrefixData(message.guildId!);

    const paginator = new Paginator<Command>({
      items: commands,
      colour: Colours.theme,
      userId: message.author.id,
      itemsPerPage: 1,
      author: {
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ size: 1024 }),
      },

      // added search capability by telling the paginator to search by command name
      getSearchString: (item) => item.name,

      formatItem: (item, index) => {
        const codeblock = "```";

        let result = `## **Command: ${item.name}**\n`;
        if (item.description) result += `${item.description}\n`;

        result += `${codeblock}Syntax: ${prefix}${item.name} ${item.syntax || "(none)"}\n`;
        result += `Example: ${prefix}${item.name} ${item.example || ""}${codeblock}`;

        // append aliases if they exist
        if (item.aliases && item.aliases.length > 0) {
          const formattedAliases = item.aliases
            .map((a) => `\`${a}\``)
            .join(", ");
          result += `\n**Aliases:** ${formattedAliases}`;
        }

        return result;
      },
    });

    await paginator.start(message);
  },
} satisfies Command;

export default command;

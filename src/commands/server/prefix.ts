import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";
import {
  getUserData,
  setPrefixData,
  updateUserData,
} from "../../database/helpers";
import { config } from "../../../config";

const command: Command = {
  name: "prefix",
  description: "Manage the servers prefix.",

  syntax: "(subcommand) (arguments)",
  example: "set ?",

  subCommands: [
    {
      name: "self",
      description: "Manage your personal global prefix.",

      syntax: "(type) [prefix]",
      example: "set ?",
      requiresUserPremium: true,

      cooldown: {
        limit: 2,
        duration: 5,
        type: "user",
      },

      subCommands: [
        {
          name: "set",
          description: "Set the servers prefix.",

          requiresUserPremium: true,

          syntax: "(prefix)",
          example: "?",

          cooldown: {
            limit: 1,
            duration: 30,
            type: "user",
          },

          execute: async (
            client: evClient,
            message: Message,
            args: string[],
          ) => {
            // if no args are given, send the command example instead
            if (args.length === 0) {
              await send(message, {
                embeds: [
                  await Embeds.commandExample(
                    message,
                    client,
                    command,
                    "prefix self set",
                  ),
                ],
              });
              return;
            }

            const prefix = args[0]; // getting the provided prefix
            const userData = await getUserData(message.author.id, true);

            if (userData?.personal_prefix == prefix) {
              // if prefix is already the one that was given, end command
              await send(message, {
                embeds: [
                  Embeds.warning(
                    `${message.author}: Your personal prefix is **already set** to: \`${prefix}\`.`,
                  ),
                ],
              });
              return;
            }

            if (prefix!.length > 5) {
              // if provided prefix is too long, end command
              await send(message, {
                embeds: [
                  Embeds.warning(
                    `${message.author}: Your personal prefix **can't be longer** than **5 characters**.`,
                  ),
                ],
              });
              return;
            }

            await updateUserData(message.author.id, {
              personal_prefix: prefix,
            });

            // send success message
            await send(message, {
              embeds: [
                Embeds.approve(
                  `${message.author}: Successfully **set your personal prefix** to: \`${prefix}\`.`,
                ),
              ],
            });
          },
        },
        {
          name: "reset",
          description: "Reset your personal prefix back to default.",

          requiresUserPremium: true,

          cooldown: {
            limit: 1,
            duration: 30,
            type: "user",
          },

          execute: async (
            client: evClient,
            message: Message,
            args: string[],
          ) => {
            const userData = await getUserData(message.author.id, true);

            if (userData?.personal_prefix === config.prefix) {
              // if prefix is already default, end command
              await send(message, {
                embeds: [
                  Embeds.warning(
                    `${message.author}: Your personal prefix is **already set** to: \`${config.prefix}\`.`,
                  ),
                ],
              });
              return;
            }
            await updateUserData(message.author.id, {
              personal_prefix: config.prefix,
            }); // set server prefix

            // send success message
            await send(message, {
              embeds: [
                Embeds.approve(
                  `${message.author}: Successfully **set your personal prefix** to: \`${config.prefix}\`.`,
                ),
              ],
            });
          },
        },
      ],

      execute: async (client: evClient, message: Message, args: string[]) => {
        await send(message, {
          embeds: [
            await Embeds.commandExample(
              message,
              client,
              command,
              "prefix self",
            ),
          ],
        });
        return;
      },
    },
    {
      name: "set",
      description: "Set the servers prefix.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      syntax: "(prefix)",
      example: "?",

      cooldown: {
        limit: 1,
        duration: 30,
        type: "guild",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        // if no args are given, send the command example instead
        if (args.length === 0) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "prefix set",
              ),
            ],
          });
          return;
        }

        const prefix = args[0]; // getting the provided prefix
        if (message.content.startsWith(prefix!)) {
          // if prefix is already the one that was given, end command
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: The prefix is **already set** to: \`${prefix}\`.`,
              ),
            ],
          });
          return;
        }

        if (prefix!.length > 5) {
          // if provided prefix is too long, end command
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: The servers prefix **can't be longer** than **5 characters**.`,
              ),
            ],
          });
          return;
        }

        // send success message
        await setPrefixData(message.guildId!, prefix!);
        await send(message, {
          embeds: [
            Embeds.approve(
              `${message.author}: Successfully **set server prefix** to: \`${prefix}\`.`,
            ),
          ],
        });
      },
    },
    {
      name: "reset",
      description: "Reset the servers prefix back to default.",

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      cooldown: {
        limit: 1,
        duration: 30,
        type: "guild",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        if (message.content.startsWith(config.prefix)) {
          // if prefix is already default, end command
          await send(message, {
            embeds: [
              Embeds.warning(
                `${message.author}: The prefix is **already set** to: \`${config.prefix}\`.`,
              ),
            ],
          });
          return;
        }
        await setPrefixData(message.guildId!, ","); // set server prefix
        // send success message
        await send(message, {
          embeds: [
            Embeds.approve(
              `${message.author}: Successfully **set server prefix** to: \`${config.prefix}\`.`,
            ),
          ],
        });
      },
    },
  ],

  execute: async (client: evClient, message: Message, args: string[]) => {
    const prefix = message.content.charAt(0);
    await send(message, {
      embeds: [
        Embeds.custom(
          "",
          `${message.author}: The **current prefix** is: \`${prefix}\`.`,
          Colours.theme,
        ),
      ],
    });
  },
} satisfies Command;

export default command;

import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";

const command: Command = {
  name: "server",
  description: "Manage and customize the server's appearance.",

  aliases: ["guild"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
  requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

  syntax: "(subcommand) (arguments)",
  example: "rename Barf Gag FanClub",

  cooldown: {
    limit: 2,
    duration: 5,
    type: "member",
  },

  subCommands: [
    {
      name: "rename",
      description: "Change the server's name.",
      aliases: ["name"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      syntax: "(name)",
      example: "Barf Gag FanClub",

      cooldown: {
        limit: 2,
        duration: 30,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const newName = args.join(" ");

        if (!newName) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "server rename",
              ),
            ],
          });
          return;
        }

        try {
          await message.guild!.setName(newName);

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **renamed server** to: \`${newName}\`.`,
              ),
            ],
          });
        } catch (error: any) {
          await send(message, {
            embeds: [
              Embeds.deny(`${message.author}: ${error.message || error}.`),
            ],
          });
        }
      },
    },
    {
      name: "icon",
      description: "Customize the server's icon.",
      aliases: ["logo", "pfp"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      syntax: "(image)",
      example: "image.png",

      cooldown: {
        limit: 2,
        duration: 60,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const isReset = args[0]?.toLowerCase() === "reset";
        const attachment = message.attachments.first();
        let image: string | null = null;

        if (!isReset) {
          if (attachment) {
            if (attachment.contentType?.startsWith("image/")) {
              image = attachment.url;
            }
          } else if (args[0]) {
            const urlRegex = /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;
            if (urlRegex.test(args[0])) {
              image = args[0];
            }
          }
        }

        if (!isReset && !image) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "server icon",
              ),
            ],
          });
          return;
        }

        try {
          await message.guild!.setIcon(image);

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully ${isReset ? "reset" : "updated"} **server icon**.`,
              ),
            ],
          });
        } catch (error: any) {
          if (
            error.message?.includes("too fast") ||
            error.message?.includes("rate limit")
          ) {
            await send(message, {
              embeds: [
                Embeds.deny(
                  `${message.author}: You're changing the server icon **too fast**. Try again later.`,
                ),
              ],
            });
            return;
          }
          await send(message, {
            embeds: [
              Embeds.deny(`${message.author}: ${error.message || error}.`),
            ],
          });
        }
      },
    },
    {
      name: "banner",
      description: "Customize the server's banner (Requires Boost Level 2).",
      aliases: ["ban", "bg"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      syntax: "(image)",
      example: "image.png",

      cooldown: {
        limit: 2,
        duration: 60,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const isReset = args[0]?.toLowerCase() === "reset";
        const attachment = message.attachments.first();
        let image: string | null = null;

        if (!isReset) {
          if (attachment) {
            if (attachment.contentType?.startsWith("image/")) {
              image = attachment.url;
            }
          } else if (args[0]) {
            const urlRegex = /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;
            if (urlRegex.test(args[0])) {
              image = args[0];
            }
          }
        }

        if (!isReset && !image) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "server banner",
              ),
            ],
          });
          return;
        }

        try {
          await message.guild!.setBanner(image);

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully ${isReset ? "reset" : "updated"} **server banner**.`,
              ),
            ],
          });
        } catch (error: any) {
          if (
            error.message?.includes("too fast") ||
            error.message?.includes("rate limit")
          ) {
            await send(message, {
              embeds: [
                Embeds.deny(
                  `${message.author}: You're changing the server banner **too fast**. Try again later.`,
                ),
              ],
            });
            return;
          }
          await send(message, {
            embeds: [
              Embeds.deny(`${message.author}: ${error.message || error}.`),
            ],
          });
        }
      },
    },
    {
      name: "splash",
      description:
        "Customize the server's invite splash background (Requires Boost Level 1).",
      aliases: ["invitesplash"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      syntax: "(image)",
      example: "image.png",

      cooldown: {
        limit: 2,
        duration: 60,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const isReset = args[0]?.toLowerCase() === "reset";
        const attachment = message.attachments.first();
        let image: string | null = null;

        if (!isReset) {
          if (attachment) {
            if (attachment.contentType?.startsWith("image/")) {
              image = attachment.url;
            }
          } else if (args[0]) {
            const urlRegex = /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;
            if (urlRegex.test(args[0])) {
              image = args[0];
            }
          }
        }

        if (!isReset && !image) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "server splash",
              ),
            ],
          });
          return;
        }

        try {
          await message.guild!.setSplash(image);

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully ${isReset ? "reset" : "updated"} **server invite splash**.`,
              ),
            ],
          });
        } catch (error: any) {
          if (
            error.message?.includes("too fast") ||
            error.message?.includes("rate limit")
          ) {
            await send(message, {
              embeds: [
                Embeds.deny(
                  `${message.author}: You're changing the invite splash **too fast**. Try again later.`,
                ),
              ],
            });
            return;
          }
          await send(message, {
            embeds: [
              Embeds.deny(`${message.author}: ${error.message || error}.`),
            ],
          });
        }
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

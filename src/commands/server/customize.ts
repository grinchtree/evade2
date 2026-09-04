import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";

const command: Command = {
  name: "customize",
  description: "Customize the bot to match your servers aesthetic.",

  aliases: ["customise", "custom", "appearance"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.Administrator],
  requiredClientPermissions: [PermissionFlagsBits.Administrator],

  syntax: "(subcommand) (arguments)",
  example: "avatar image.png",

  cooldown: {
    limit: 2,
    duration: 5,
    type: "member",
  },

  subCommands: [
    {
      name: "avatar",
      description: "Customize the bot's server-avatar.",

      aliases: ["av", "ava", "pfp"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      requiredClientPermissions: [PermissionFlagsBits.Administrator],

      syntax: "(image)",
      example: "image.png",

      cooldown: {
        limit: 2,
        duration: 120,
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
            } else if (args[0]) {
              const urlRegex =
                /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;
              if (urlRegex.test(args[0])) {
                image = args[0];
              }
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
                "customize avatar",
              ),
            ],
          });
          return;
        }

        try {
          await message.guild!.members.editMe({
            avatar: image,
          });

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully ${isReset ? "reset" : "updated"} **server avatar**.`,
              ),
            ],
          });
        } catch (error: any) {
          if (error.message?.includes("avatar too fast")) {
            await send(message, {
              embeds: [
                Embeds.deny(
                  `${message.author}: You're changing the server avatar **too fast**. Try again later.`,
                ),
              ],
            });
            return;
          }
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "banner",
      description: "Customize the bot's server-banner.",

      aliases: ["bnr", "ban"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      requiredClientPermissions: [PermissionFlagsBits.Administrator],

      syntax: "(image)",
      example: "image.png",

      cooldown: {
        limit: 2,
        duration: 120,
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
            } else if (args[0]) {
              const urlRegex =
                /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;
              if (urlRegex.test(args[0])) {
                image = args[0];
              }
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
                "customize banner",
              ),
            ],
          });
          return;
        }

        try {
          await message.guild!.members.editMe({
            banner: image,
          });

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully ${isReset ? "reset" : "updated"} **server banner**. You might have to **restart your Discord to see the change**.`,
              ),
            ],
          });
        } catch (error: any) {
          if (error.message?.includes("avatar too fast")) {
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
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
        }
      },
    },
    {
      name: "bio",
      description: "Customize the bot's server-bio.",

      aliases: ["aboutme", "desc"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.Administrator],
      requiredClientPermissions: [PermissionFlagsBits.Administrator],

      syntax: "(text)",
      example: "We love evade!",

      cooldown: {
        limit: 2,
        duration: 120,
        type: "member",
      },

      execute: async (client: evClient, message: Message, args: string[]) => {
        const isReset = args[0]?.toLowerCase() === "reset";
        const rawBio = args.join(" ");

        if (!isReset && !rawBio) {
          await send(message, {
            embeds: [
              await Embeds.commandExample(
                message,
                client,
                command,
                "customize bio",
              ),
            ],
          });
          return;
        }

        let finalBio = null;

        if (!isReset) {
          const formattedBio = rawBio.replace(/\\n/g, "\n");

          finalBio = `${formattedBio}\n\n> **https://discord.gg/evadebot**`;
        }

        try {
          await (message.guild!.members as any).editMe({
            bio: finalBio,
          });

          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully ${isReset ? "reset" : "updated"} **server bio**.`,
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
                  `${message.author}: You're changing the server bio **too fast**. Try again later.`,
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

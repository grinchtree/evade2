import { PermissionFlagsBits, type Message } from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Embeds, send } from "../../utils/messaging";

const command: Command = {
  name: "server",
  description: "Manage the server.",

  aliases: ["guild"],

  guild_only: true,
  requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
  requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

  syntax: "(subcommand) (argument)",
  example: "rename Evade's Awesome Server",

  subCommands: [
    {
      name: "rename",
      description: "Rename the server.",

      aliases: ["name"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      syntax: "(name)",
      example: "Evade's Awesome Server",

      execute: async (client: evClient, message: Message, args: string[]) => {
        // if no args are given, send the command example instead
        if (args.length === 0) {
          await send(message, {
            embeds: [await Embeds.commandExample(message, client, command)],
          });
          return;
        }

        let unbuiltName: string[] = [];

        for (const arg of args) {
          // building name
          unbuiltName.push(arg);
        }

        const name = unbuiltName.join(" ");

        try {
          // editing server name
          await message.guild!.edit({ name: name });

          // send success message
          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **renamed server** to: \`${name}\`.`,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
          });
          return;
        }
      },
    },
    {
      name: "icon",
      description: "Change the server's icon",

      aliases: ["image", "picture", "pfp"],

      guild_only: true,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.ManageGuild],

      syntax: "(attachment)",
      example: "https://pfp.com/img.png",

      execute: async (client: evClient, message: Message, args: string[]) => {
        const attachment = message.attachments.first(); // getting the first provided attachment

        const iconInput = attachment ? attachment.url : args[0]; // if attachment exists, use that, else use first argument

        if (!iconInput) {
          // if args[0] and attachment doesn't exist, end command
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
          // set icon
          await message.guild!.setIcon(iconInput);

          // send success message
          await send(message, {
            embeds: [
              Embeds.approve(
                `${message.author}: Successfully **updated the server icon**.`,
              ),
            ],
          });
        } catch (error) {
          await send(message, {
            embeds: [Embeds.deny(`${message.author}: ${error}.`)],
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

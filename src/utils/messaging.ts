import {
  EmbedBuilder,
  MessagePayload,
  type ColorResolvable,
  type Message,
  type MessageCreateOptions,
} from "discord.js";
import type { Command } from "../interfaces/Command";
import type { evClient } from "../structs/Client";
import { config } from "../../config";
import { getPrefixData } from "../database/helpers";

// standard hex colours used across the bot
export class Colours {
  static readonly theme: ColorResolvable = "#c3a1ed";

  static readonly default: ColorResolvable = "#8899a6";
  static readonly discordDefault: ColorResolvable = "#99aab5";

  static readonly approved: ColorResolvable = "#8fe286";
  static readonly warning: ColorResolvable = "#ff9000";
  static readonly deny: ColorResolvable = "#dd6d6d";

  static readonly mathBlue: ColorResolvable = "#79a4ff";

  static readonly iceBlue: ColorResolvable = "#92b4ef";
}

// frequently used custom and default emojis
export class Emojis {
  static readonly evade = "<:evade:1537119874747465898>";

  static readonly approved = "<:approved:1533284888541794395>";
  static readonly warning = "<:warning:1533285334777991288>";
  static readonly deny = "<:deny:1533284798402007160>";

  static readonly add = "<:add:1525657465390235819>";
  static readonly minus = "<:minus:1525657455818969160>";

  static readonly cooldown = "<:cooldown:1533313606278578417>";

  static readonly mag = ":mag:";
  static readonly fetch = "<a:fetch:1538161008252551269>";
}

// shortcuts for building styled embeds quickly
export class Embeds {
  static base(colour: ColorResolvable): EmbedBuilder {
    return new EmbedBuilder().setColor(colour);
  }

  // preset response templates
  static approve(description: string): EmbedBuilder {
    return this.base(Colours.approved).setDescription(
      `${Emojis.approved} ${description}`,
    );
  }

  static warning(description: string): EmbedBuilder {
    return this.base(Colours.warning).setDescription(
      `${Emojis.warning} ${description}`,
    );
  }

  static deny(description: string): EmbedBuilder {
    return this.base(Colours.deny).setDescription(
      `${Emojis.deny} ${description}`,
    );
  }

  static eyeGlass(description: string): EmbedBuilder {
    return this.base(Colours.default).setDescription(
      `${Emojis.mag} ${description}`,
    );
  }

  static fetch(description: string): EmbedBuilder {
    return this.base(Colours.theme).setDescription(
      `${Emojis.fetch} ${description}`,
    );
  }

  // for when the presets don't quite fit
  static custom(
    emoji: string,
    description: string,
    colour: ColorResolvable,
  ): EmbedBuilder {
    return this.base(colour).setDescription(`${emoji} ${description}`);
  }

  // automatically generates a help menu for a given command
  static async commandExample(
    message: Message,
    client: evClient,
    command: Command,
    invokedPath?: string,
  ): Promise<EmbedBuilder> {
    const prefix = message.guild
      ? await getPrefixData(message.guild.id)
      : config.prefix;

    const codeblock = "```";

    let targetCommand = command;
    const pathString = invokedPath ?? command.name;

    // split the path to figure out if they asked for a subcommand (e.g. "config prefix")
    const subcommands = pathString.split(" ").slice(1);

    // walk down the subcommand tree to find the right details
    for (const sub of subcommands) {
      const child = targetCommand.subCommands?.find(
        (c) => c.name === sub.toLowerCase(),
      );
      if (!child) break;

      targetCommand = {
        ...targetCommand,
        ...child,
        description: child.description,
        syntax: child.syntax,
        example: child.example,
      };
    }

    const syntax = targetCommand.syntax ?? "(none)";
    const example = targetCommand.example ?? "";
    const descriptionText = targetCommand.description
      ? `${targetCommand.description}\n`
      : "";

    // piece it all together in a nice codeblock format
    const description = `${descriptionText}${codeblock}Syntax: ${prefix}${pathString} ${syntax}\nExample: ${prefix}${pathString} ${example}${codeblock}`;

    const embed = new EmbedBuilder()
      .setTitle(`Command: ${pathString}`)
      .setColor(Colours.theme)
      .setAuthor({
        name: client.user?.username ?? "evade",
        iconURL: client.user?.displayAvatarURL(),
      })
      .setDescription(description);

    return embed;
  }
}

// smart send function that handles both dms and server channels seamlessly
export async function send(
  message: Message,
  payload: string | MessagePayload | MessageCreateOptions,
  asReply: boolean = false,
): Promise<Message> {
  if (message.channel.isDMBased()) {
    return await message.reply(payload);
  }
  if (asReply) {
    return await message.reply(payload);
  }
  return await message.channel.send(payload);
}

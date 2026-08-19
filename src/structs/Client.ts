import { Client, Collection, type ClientOptions } from "discord.js";
import type { Command } from "../interfaces/Command";
import { logging } from "../utils/logging";

export class evClient extends Client {
  // store commands, aliases, and cooldown limits in memory
  public commands: Collection<string, Command> = new Collection();
  public commandAliases: Collection<string, string> = new Collection();
  public cooldowns: Collection<
    string,
    Collection<string, { count: number; expiredAt: number }>
  > = new Collection();

  // client settings
  public commandCaseSensitive: boolean = false;

  constructor(options: ClientOptions) {
    super(options);
  }

  // fetch a command by name, resolving aliases and subcommands
  public getCommand(name: string): Command | undefined {
    const query = name.toLowerCase().trim();
    const parts = query.split(" "); // split the query to check for subcommands

    let baseName = parts[0];
    if (!baseName) {
      return undefined;
    }

    // resolve any root-level aliases first
    const rootAlias = this.commandAliases.get(baseName);
    if (rootAlias) {
      baseName = rootAlias;
    }

    const parentCommand = this.commands.get(baseName);
    if (!parentCommand) return undefined;

    // if the command has multiple arguments, check if the second is a subcommand
    if (parts.length > 1 && parentCommand.subCommands) {
      const subName = parts[1];

      const childCommand = parentCommand.subCommands.find(
        (child) =>
          child.name === subName ||
          child.subCommands?.some((sub) => sub.name === subName),
      );

      if (childCommand) return childCommand;
    }

    return parentCommand;
  }

  public startTime: number | undefined;

  // log in to discord and track when the bot started
  public async start(token: string) {
    this.startTime = performance.now();
    await this.login(token).catch((error) => {
      logging.error(error);
      process.exit();
    });
  }
}

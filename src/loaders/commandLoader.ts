import { join } from "node:path";
import type { Command } from "../interfaces/Command";
import type { evClient } from "../structs/Client";
import { logging } from "../utils/logging";
import { loadFiles } from "./fileLoader";

export async function loadCommands(client: evClient) {
  const startTime = performance.now();

  // clearing any previous entries
  client.commands.clear();
  client.commandAliases.clear();

  const commandsPath = join(process.cwd(), "src", "commands");
  const files = await loadFiles(commandsPath);

  let commandCount = 0;

  for (const file of files) {
    const commandModule = await import(file);
    const command: Command = commandModule.default;

    if (!command || !command.name || !command.execute) {
      logging.warn(`The command '${file} is missing a required argument.`);
      continue;
    }

    client.commands.set(command.name, command);
    commandCount++;

    if (command.aliases && Array.isArray(command.aliases)) {
      command.aliases.forEach((alias) =>
        client.commandAliases.set(alias, command.name),
      );
    }
  }

  const timeTaken = Math.round(performance.now() - startTime);
  logging.info(`Loaded ${commandCount} commands in ${timeTaken}ms.`);
}

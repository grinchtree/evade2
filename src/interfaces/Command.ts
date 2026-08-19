import type { Client, Message, PermissionResolvable } from "discord.js";
import type { Cooldown } from "./Cooldown";

export interface Command {
  name: string;
  description?: string;
  aliases?: string[];

  subCommands?: Command[];

  syntax?: string;
  example?: string;

  guild_only?: boolean;
  requiredUserPermissions?: PermissionResolvable[];
  requiredClientPermissions?: PermissionResolvable[];
  cooldown?: Cooldown;

  execute(
    client: Client,
    message: Message,
    args: string[],
  ): void | Promise<void>;
}

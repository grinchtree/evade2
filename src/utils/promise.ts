import {
  AutoModerationActionExecution,
  type Guild,
  type GuildBan,
  type GuildBasedChannel,
  type GuildMember,
  type Message,
  type Role,
  type User,
} from "discord.js";
import type { evClient } from "../structs/Client";
import { Embeds, send } from "./messaging";

// match discord mentions (like <@123>) and raw snowflake ids
const mentionRegex = /^<@!?&?#?(\d{17,19})>$/;
const idRegex = /^\d{17,19}$/;

// try to resolve a member in the server by mention, id, or name
export async function promiseMember(
  guild: Guild,
  input: string,
  fuzzy: boolean = false,
  forceFetch: boolean = false,
): Promise<GuildMember | undefined> {
  if (!input) return undefined;

  // check if they used a mention
  const mentionMatch = input.match(mentionRegex);
  if (mentionMatch?.[1])
    return guild.members
      .fetch({ user: mentionMatch[1], force: forceFetch })
      .catch(() => undefined);

  // check if it's just a raw id
  if (idRegex.test(input))
    return guild.members
      .fetch({ user: input, force: forceFetch })
      .catch(() => undefined);

  const query = input.toLowerCase();

  // fall back to checking the cache for names
  if (fuzzy && !forceFetch) {
    const cached = guild.members.cache.find(
      (mem) =>
        mem.user.username.toLowerCase().includes(query) ||
        mem.displayName.toLowerCase().includes(query) ||
        mem.user.tag.toLowerCase().includes(query),
    );

    if (cached) return cached;
  }

  // last resort: query the api directly
  return guild.members
    .fetch({ query: input, limit: 1 })
    .then((results) => results.first())
    .catch(() => undefined);
}

// fetch a global user by mention, id, or name
export async function promiseUser(
  client: evClient,
  input: string,
  fuzzy: boolean = false,
  forceFetch: boolean = false,
): Promise<User | undefined> {
  if (!input) return undefined;

  const mentionMatch = input.match(mentionRegex);
  if (mentionMatch?.[1])
    return client.users
      .fetch(mentionMatch[1], { force: forceFetch })
      .catch(() => undefined);

  if (idRegex.test(input))
    return client.users
      .fetch(input, { force: forceFetch })
      .catch(() => undefined);

  const query = input.toLowerCase();
  const isMatch = (str: string) =>
    fuzzy ? str.toLowerCase().includes(query) : str.toLowerCase() === query;

  return client.users.cache.find((u) => isMatch(u.username) || isMatch(u.tag));
}

// find a channel in the server
export async function promiseChannel(
  guild: Guild,
  input: string,
  fuzzy: boolean = false,
  forceFetch: boolean = false,
): Promise<GuildBasedChannel | undefined> {
  if (!input) return undefined;

  const mentionMatch = input.match(mentionRegex);
  if (mentionMatch?.[1])
    return guild.channels
      .fetch(mentionMatch[1], { force: forceFetch })
      .catch(() => undefined) as Promise<GuildBasedChannel | undefined>;

  if (idRegex.test(input))
    return guild.channels
      .fetch(input, { force: forceFetch })
      .catch(() => undefined) as Promise<GuildBasedChannel | undefined>;

  if (forceFetch) await guild.channels.fetch().catch(() => null);

  const query = input.toLowerCase();
  const isMatch = (str: string) =>
    fuzzy ? str.toLowerCase().includes(query) : str.toLowerCase() === query;

  return guild.channels.cache.find((c) => isMatch(c.name));
}

// look up a role by mention, id, or name
export async function promiseRole(
  guild: Guild,
  input: string,
  fuzzy: boolean = false,
  forceFetch: boolean = false,
): Promise<Role | undefined> {
  if (!input) return undefined;

  const mentionMatch = input.match(mentionRegex);
  if (mentionMatch?.[1])
    return guild.roles
      .fetch(mentionMatch[1], { force: forceFetch })
      .catch(() => undefined) as Promise<Role | undefined>;

  if (idRegex.test(input))
    return guild.roles
      .fetch(input, { force: forceFetch })
      .catch(() => undefined) as Promise<Role | undefined>;

  if (forceFetch)
    await guild.roles.fetch(undefined, { force: true }).catch(() => null);

  const query = input.toLowerCase();
  const isMatch = (str: string) =>
    fuzzy ? str.toLowerCase().includes(query) : str.toLowerCase() === query;

  return guild.roles.cache.find((r) => isMatch(r.name));
}

// find a server (guild) by id or name
export async function parseGuild(
  client: evClient,
  input: string,
  fuzzy: boolean = false,
  forceFetch: boolean = false,
): Promise<Guild | undefined> {
  if (!input) return undefined;

  if (idRegex.test(input))
    return client.guilds
      .fetch({ guild: input, force: forceFetch })
      .catch(() => undefined);

  if (forceFetch) await client.guilds.fetch().catch(() => null);

  const query = input.toLowerCase();
  const isMatch = (str: string) =>
    fuzzy ? str.toLowerCase().includes(query) : str.toLowerCase() === query;

  return client.guilds.cache.find((g) => isMatch(g.name));
}

// search the server's ban list for a specific user
export async function promiseBanEntry(
  guild: Guild,
  input: string,
  limit: number = 1000,
  fuzzy: boolean = false,
  forceFetch: boolean = false,
): Promise<GuildBan | undefined> {
  if (!input) return undefined;

  if (idRegex.test(input)) {
    return guild.bans
      .fetch({ user: input, force: forceFetch, cache: !forceFetch })
      .catch(() => undefined);
  }

  try {
    const bans = await guild.bans.fetch({ limit, cache: false });
    const query = input.toLowerCase();
    const isMatch = (str: string) =>
      fuzzy ? str.toLowerCase().includes(query) : str.toLowerCase() === query;

    return bans.find(
      (ban) => isMatch(ban.user.username) || isMatch(ban.user.tag),
    );
  } catch {
    return undefined;
  }
}

// simple wait function
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

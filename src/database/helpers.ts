import { supabase } from "./database";
import { DatabaseCache } from "./cache";
import { logging } from "../utils/logging";
import type { Message } from "discord.js";
import { send, Embeds } from "../utils/messaging";
import type {
  UserData,
  GuildData,
  MemberData,
  CaseData,
  HardbanData,
  AntinukeData,
  PrefixData,
  WarningData,
  DisabledCommandData,
} from "../interfaces/Data";

// data caches (allowing nulls so we don't spam the db for things we already know don't exist)
const guildsCache = new DatabaseCache<GuildData | null>(1000, 600000);
const usersCache = new DatabaseCache<UserData | null>(2000, 600000);
const membersCache = new DatabaseCache<MemberData | null>(5000, 300000);
const casesCache = new DatabaseCache<CaseData | null>(1000, 300000);
const hardbanCache = new DatabaseCache<HardbanData | null>(1000, 260000);
const antinukeCache = new DatabaseCache<AntinukeData | null>(1000, 260000);
const prefixCache = new DatabaseCache<PrefixData>(1000, 260000);
const warningsCache = new DatabaseCache<WarningData[]>(1000, 300000);
const disabledCommandsCache = new DatabaseCache<DisabledCommandData>(
  1000,
  300000,
);

// --- GUILD DATA ---

export async function getGuildData(
  id: string,
  autoCreate: boolean = true,
): Promise<GuildData | null> {
  return guildsCache.getOrFetch(id, async () => {
    const { data } = await supabase
      .from("guilds")
      .select("*")
      .eq("id", id)
      .single();

    if (data) return data;

    // create a new profile if they don't have one and autocreate is on
    if (autoCreate) {
      const newGuild: GuildData = { id, premium: false, preferences: {} };
      await supabase.from("guilds").insert(newGuild);
      return newGuild;
    }

    return null;
  });
}

export async function updateGuildData(
  id: string,
  data: Partial<GuildData>,
): Promise<void> {
  await supabase.from("guilds").update(data).eq("id", id);

  // fetch the latest version and update our cache silently
  const current = await getGuildData(id, false);
  if (current) guildsCache.set(id, { ...current, ...data });
}

export async function deleteGuildData(id: string): Promise<void> {
  await supabase.from("guilds").delete().eq("id", id);
  guildsCache.delete(id);
}

export async function dumpGuildData(id: string): Promise<void> {
  guildsCache.delete(id);
}

// --- PREFIX DATA ---

export async function getPrefixData(id: string): Promise<string> {
  return prefixCache
    .getOrFetch(id, async () => {
      const guild = await getGuildData(id, true);
      const prefix = guild?.preferences?.prefix || ",";

      // getOrFetch handles the cache setting automatically, we just return the object it expects
      return { id, prefix } as PrefixData;
    })
    .then((res) => res.prefix);
}

export async function setPrefixData(
  id: string,
  newPrefix: string,
): Promise<void> {
  const guild = await getGuildData(id, true);

  const updatedPreferences = {
    ...(guild?.preferences || {}),
    prefix: newPrefix,
  };

  await updateGuildData(id, { preferences: updatedPreferences });
  prefixCache.set(id, { id, prefix: newPrefix });
}

export async function dumpGuildPrefix(id: string): Promise<void> {
  prefixCache.delete(id);
}

// --- USER DATA ---

export async function getUserData(
  id: string,
  autoCreate: boolean = true,
): Promise<UserData | null> {
  return usersCache.getOrFetch(id, async () => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (data) return data;

    if (autoCreate) {
      const newUser: UserData = { id, preferences: {} };
      await supabase.from("users").insert(newUser);
      return newUser;
    }

    return null;
  });
}

export async function updateUserData(
  id: string,
  data: Partial<UserData>,
): Promise<void> {
  await supabase.from("users").update(data).eq("id", id);

  const current = await getUserData(id, false);
  if (current) usersCache.set(id, { ...current, ...data });
}

export async function deleteUserData(id: string): Promise<void> {
  await supabase.from("users").delete().eq("id", id);
  usersCache.delete(id);
}

export async function dumpUserData(id: string): Promise<void> {
  usersCache.delete(id);
}

// --- MEMBER DATA ---

export async function getMemberData(
  user_id: string,
  guild_id: string,
  autoCreate: boolean = true,
): Promise<MemberData | null> {
  const key = `${user_id}-${guild_id}`;

  return membersCache.getOrFetch(key, async () => {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("user_id", user_id)
      .eq("guild_id", guild_id)
      .single();

    if (data) return data;

    if (autoCreate) {
      // make sure the guild exists before trying to tie a member to it
      await getGuildData(guild_id, true);
      await getUserData(user_id, true); // good practice to ensure the user exists globally too

      const newMember: MemberData = {
        user_id,
        guild_id,
        sticky_roles: [],
        preferences: {},
      };

      await supabase.from("members").insert(newMember);
      return newMember;
    }

    return null;
  });
}

export async function updateMemberData(
  user_id: string,
  guild_id: string,
  data: Partial<MemberData>,
): Promise<void> {
  await supabase
    .from("members")
    .update(data)
    .eq("user_id", user_id)
    .eq("guild_id", guild_id);

  const current = await getMemberData(user_id, guild_id, false);
  if (current) {
    membersCache.set(`${user_id}-${guild_id}`, { ...current, ...data });
  }
}

export async function dumpMemberData(
  user_id: string,
  guild_id: string,
): Promise<void> {
  membersCache.delete(`${user_id}-${guild_id}`);
}

// --- WARNINGS DATA ---

export async function getMemberWarning(
  user_id: string,
  guild_id: string,
): Promise<WarningData[]> {
  const cacheKey = `${user_id}-${guild_id}`;

  return warningsCache.getOrFetch(cacheKey, async () => {
    const { data, error } = await supabase
      .from("warnings")
      .select("*")
      .eq("user_id", user_id)
      .eq("guild_id", guild_id);

    if (error) {
      logging.error(String(error));
      return [];
    }

    return data || [];
  });
}

export async function addMemberWarning(
  data: WarningData,
): Promise<WarningData | null> {
  // make sure the core profiles exist first
  await getGuildData(data.guild_id, true);
  await getMemberData(data.user_id, data.guild_id, true);

  const { data: inserted, error } = await supabase
    .from("warnings")
    .insert(data)
    .select()
    .single();

  if (error) {
    logging.error(String(error));
    return null;
  }

  // clear their cached array so the next getMemberWarning fetch grabs the new list
  warningsCache.delete(`${data.user_id}-${data.guild_id}`);

  return inserted;
}

export async function deleteMemberWarning(warning_id: string): Promise<void> {
  // fetch the warning first so we know whose cache to invalidate
  const { data: warning } = await supabase
    .from("warnings")
    .select("user_id, guild_id")
    .eq("warning_id", warning_id)
    .single();

  await supabase.from("warnings").delete().eq("warning_id", warning_id);

  // if we successfully found it, wipe their specific cache
  if (warning) {
    warningsCache.delete(`${warning.user_id}-${warning.guild_id}`);
  }
}

export async function getAntinukeData(
  guild_id: string,
  autoCreate: boolean = true,
): Promise<AntinukeData | null> {
  return antinukeCache.getOrFetch(guild_id, async () => {
    const { data } = await supabase
      .from("antinuke")
      .select("*")
      .eq("guild_id", guild_id)
      .single();

    if (data) return data;

    if (autoCreate) {
      await getGuildData(guild_id, true); // ensure guild exists first

      const newAntinuke: AntinukeData = {
        guild_id,
        admins: [],
        preferences: {},
      };

      await supabase.from("antinuke").insert(newAntinuke);
      return newAntinuke;
    }

    return null;
  });
}

export async function updateAntinukeData(
  guild_id: string,
  data: Partial<AntinukeData>,
): Promise<void> {
  await supabase.from("antinuke").update(data).eq("guild_id", guild_id);

  const current = await getAntinukeData(guild_id, false);
  if (current) antinukeCache.set(guild_id, { ...current, ...data });
}

export async function deleteAntinukeData(guild_id: string): Promise<void> {
  await supabase.from("antinuke").delete().eq("guild_id", guild_id);
  antinukeCache.delete(guild_id);
}

// --- HARDBAN DATA ---

export async function getHardbanData(
  user_id: string,
  guild_id: string,
): Promise<HardbanData | null> {
  const key = `${user_id}-${guild_id}`;

  return hardbanCache.getOrFetch(key, async () => {
    const { data } = await supabase
      .from("hardbans")
      .select("*")
      .eq("user_id", user_id)
      .eq("guild_id", guild_id)
      .single();

    return data || null;
  });
}

export async function addHardban(
  data: HardbanData,
): Promise<HardbanData | null> {
  await getGuildData(data.guild_id, true);
  await getUserData(data.user_id, true);

  const { data: inserted, error } = await supabase
    .from("hardbans")
    .insert(data)
    .select()
    .single();

  if (error) {
    logging.error(`failed to add hardban: ${error.message}`);
    return null;
  }

  hardbanCache.set(`${data.user_id}-${data.guild_id}`, inserted);
  return inserted;
}

export async function deleteHardban(
  user_id: string,
  guild_id: string,
): Promise<void> {
  await supabase
    .from("hardbans")
    .delete()
    .eq("user_id", user_id)
    .eq("guild_id", guild_id);

  hardbanCache.delete(`${user_id}-${guild_id}`);
}

// --- CASES DATA ---

export async function getCaseData(id: string): Promise<CaseData | null> {
  return casesCache.getOrFetch(id, async () => {
    const { data } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .single();

    return data || null;
  });
}

export async function getMemberCases(
  user_id: string,
  guild_id: string,
): Promise<CaseData[]> {
  const key = `${user_id}-${guild_id}`;

  return casesCache.getOrFetch(key, async () => {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("user_id", user_id)
      .eq("guild_id", guild_id);

    if (error) {
      logging.error(`failed to fetch member cases: ${error.message}`);
      return [];
    }

    return data || [];
  });
}

export async function createCase(
  data: Partial<CaseData>, // partial because id and created_at are generated by the db
): Promise<CaseData | null> {
  if (data.guild_id) await getGuildData(data.guild_id, true);
  if (data.user_id) await getUserData(data.user_id, true);

  const { data: inserted, error } = await supabase
    .from("cases")
    .insert(data)
    .select()
    .single();

  if (error) {
    logging.error(`failed to create case: ${error.message}`);
    return null;
  }

  // cache the single case
  casesCache.set(inserted.id, inserted);

  // if this case is tied to a user, wipe their array cache so it updates on next fetch
  if (inserted.user_id && inserted.guild_id) {
    casesCache.delete(`${inserted.user_id}-${inserted.guild_id}`);
  }

  return inserted;
}

export async function updateCase(
  id: string,
  data: Partial<CaseData>,
): Promise<void> {
  await supabase.from("cases").update(data).eq("id", id);

  const current = await getCaseData(id);
  if (current) {
    casesCache.set(id, { ...current, ...data });

    // flush the member cases cache just in case we changed something important
    if (current.user_id && current.guild_id) {
      casesCache.delete(`${current.user_id}-${current.guild_id}`);
    }
  }
}

export async function deleteCase(id: string): Promise<void> {
  // fetch it first so we know whose member array to clear
  const current = await getCaseData(id);

  await supabase.from("cases").delete().eq("id", id);
  casesCache.delete(id);

  if (current?.user_id && current?.guild_id) {
    casesCache.delete(`${current.user_id}-${current.guild_id}`);
  }
}

// --- DISABLE COMMAND DATA ---

export async function getDisabledCommandData(
  guild_id: string,
  autoCreate: boolean = true,
): Promise<DisabledCommandData | null> {
  return disabledCommandsCache.getOrFetch(guild_id, async () => {
    const { data } = await supabase
      .from("disabled_commands")
      .select("*")
      .eq("guild_id", guild_id)
      .single();

    if (data) return data;

    if (autoCreate) {
      const newDisabledCommands: DisabledCommandData = {
        guild_id,
        command_names: [],
      };

      await supabase.from("disabled_commands").insert(newDisabledCommands);
      return newDisabledCommands;
    }

    return null;
  });
}

export async function updateDisabledCommandData(
  guild_id: string,
  data: Partial<DisabledCommandData>,
): Promise<void> {
  await supabase
    .from("disabled_commands")
    .update(data)
    .eq("guild_id", guild_id);

  const current = await getDisabledCommandData(guild_id, false);
  if (current) disabledCommandsCache.set(guild_id, { ...current, ...data });
}

export async function deleteDisabledCommandData(
  guild_id: string,
): Promise<void> {
  await supabase.from("disabled_commands").delete().eq("guild_id", guild_id);
  disabledCommandsCache.delete(guild_id);
}

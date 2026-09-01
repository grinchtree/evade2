// server protection settings
export interface AntinukeData {
  guild_id: string;
  admins: string[];
  preferences: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// mod logs and moderation actions
export interface CaseData {
  id?: string;
  guild_id: string;
  user_id?: string; // optional because of ON DELETE SET NULL in sql
  mod_id?: string;
  action_type: string; // added: needed for the db schema (e.g., 'ban', 'kick')
  information: Record<string, any>;
  created_at?: string;
}

// core server data
export interface GuildData {
  id: string;
  premium: boolean;
  preferences: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// permanent bans that cannot be removed by normal mods
export interface HardbanData {
  user_id: string;
  guild_id: string;
  created_at?: string;
}

// user profiles specifically tied to a server
export interface MemberData {
  user_id: string;
  guild_id: string;
  sticky_roles?: string[];
  forced_nickname?: string | null;
  created_at?: string;
  updated_at?: string;
}

// small custom cache object for command prefixes
export interface PrefixData {
  id?: string;
  prefix: string;
}

// timed bans that expire automatically
export interface TempbanData {
  guild_id: string;
  user_id: string;
  expires_at: string;
  created_at?: string; // added: matches the db schema
}

// global user profiles
export interface UserData {
  id: string;
  premium: boolean;
  personal_prefix: null | string;
  preferences: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// user strikes and warnings
export interface WarningData {
  id?: string;
  user_id: string;
  guild_id: string;
  reason: string;
  mod_id: string;
  amount: number;
  created_at?: string;
}

// guilds disabled commands
export interface DisabledCommandData {
  guild_id: string;
  command_names: string[];
  created_at?: string;
  updated_at?: string;
}

// guilds autoroles
export interface AutoroleData {
  guild_id: string;
  roles: string[];
  created_at?: string;
  updated_at?: String;
}

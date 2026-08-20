export interface AntinukeData {
  guild_id: string;
  admins: string[];
  preferences: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CaseData {
  case_id?: string;
  information: Record<string, any>;
  created_at?: string;
}

export interface GuildData {
  id: string;
  premium: boolean;
  preferences: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface HardbanData {
  user_id: string;
  guild_id: string;
  created_at?: string;
}

export interface MemberData {
  user_id: string;
  guild_id: string;
  sticky_roles: string[];
  preferences: Record<string, any>;
  created_at?: string;
}

export interface PrefixData {
  id?: string;
  prefix: string;
}

export interface TempbanData {
  guild_id: string;
  user_id: string;
  expires_at: string;
}

export interface UserData {
  id: string;
  preferences: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface WarningData {
  warning_id?: string;
  user_id: string;
  guild_id: string;
  reason: string;
  mod_id: string;
  amount: number;
  created_at?: string;
}

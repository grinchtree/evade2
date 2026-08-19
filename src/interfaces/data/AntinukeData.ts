export interface AntinukeData {
  guild_id: string;
  admins: string[];
  preferences: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface GuildData {
  id: string;
  premium: boolean;
  preferences: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

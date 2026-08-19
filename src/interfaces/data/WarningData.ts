export interface WarningData {
  warning_id?: string;
  user_id: string;
  guild_id: string;
  reason: string;
  mod_id: string;
  amount: number;
  created_at?: string;
}

export interface MemberDat {
  user_id: string;
  guild_id: string;
  sticky_roles: string[];
  preferences: Record<string, any>;
  created_at?: string;
}

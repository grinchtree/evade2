export type CooldownType = "user" | "member" | "guild" | "channel" | "global";

export interface Cooldown {
  duration: number;
  limit: number;
  type: CooldownType;
}

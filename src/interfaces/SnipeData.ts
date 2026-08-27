import type { User } from "discord.js";

export interface SnipeData {
  content: string | null;
  author: User;
  image: string | null;
  timestamp: number;
}

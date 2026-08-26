import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";
import { DatabaseCache } from "../../database/cache";
import { Paginator } from "../../utils/components";

interface CachedSong {
  title: string;
  artist: string;
  lyrics: string;
  thumbnail: string | null;
}

interface LRCLibResponse {
  trackName: string;
  artistName: string;
  plainLyrics?: string;
}

interface iTunesResponse {
  results?: { artworkUrl100?: string }[];
}

const lyricCache = new DatabaseCache<CachedSong>(500, 86400000);

const command: Command = {
  name: "lyric",
  description: "Search for a song's lyrics.",

  aliases: ["lyrics"],

  guild_only: false,

  syntax: "(song name)",
  example: "Last Christmas by Wham!",

  cooldown: {
    limit: 1,
    duration: 10,
    type: "member",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    if (args.length === 0) {
      await send(message, {
        embeds: [await Embeds.commandExample(message, client, command)],
      });
      return;
    }

    const query = args.join(" ").trim();
    const cacheKey = query.toLowerCase();

    const googleBtn = new ButtonBuilder()
      .setLabel("Search Google")
      .setStyle(ButtonStyle.Link)
      .setURL(
        `https://www.google.com/search?q=${encodeURIComponent(query + " lyrics")}`,
      );

    const youtubeBtn = new ButtonBuilder()
      .setLabel("Search YouTube")
      .setStyle(ButtonStyle.Link)
      .setURL(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      googleBtn,
      youtubeBtn,
    );

    const statusMessage = await send(message, {
      embeds: [
        Embeds.fetch(`${message.author}: Searching for **${query}**...`),
      ],
      components: [row],
    });

    setTimeout(() => {
      statusMessage.edit({ components: [] }).catch(() => null);
    }, 30000);

    try {
      const songData = await lyricCache.getOrFetch(cacheKey, async () => {
        const lrcRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
        );

        if (!lrcRes.ok) throw new Error("API_ERROR");

        const lrcData = (await lrcRes.json()) as LRCLibResponse[];

        if (!Array.isArray(lrcData) || lrcData.length === 0) {
          throw new Error("NOT_FOUND");
        }

        const track = lrcData[0];
        const lyrics = track!.plainLyrics;
        if (!lyrics) throw new Error("NO_LYRICS");

        let cleanTitle = track!.trackName.trim();
        const cleanArtist = track!.artistName.trim();

        const startPattern = new RegExp(`^${cleanArtist}\\s*-\\s*`, "i");
        const endPattern = new RegExp(`\\s*-\\s*${cleanArtist}$`, "i");

        cleanTitle = cleanTitle.replace(startPattern, "");
        cleanTitle = cleanTitle.replace(endPattern, "");

        if (cleanTitle.length === 0) {
          cleanTitle = track!.trackName;
        }

        let thumbnail: string | null = null;
        try {
          const itunesRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(
              cleanArtist + " " + cleanTitle,
            )}&entity=song&limit=1`,
          );
          const itunesData = (await itunesRes.json()) as iTunesResponse;

          if (itunesData.results && itunesData.results.length > 0) {
            thumbnail =
              itunesData.results[0]?.artworkUrl100?.replace(
                "100x100bb",
                "500x500bb",
              ) || null;
          }
        } catch {}

        return {
          title: cleanTitle,
          artist: cleanArtist,
          lyrics: lyrics,
          thumbnail: thumbnail,
        };
      });

      await statusMessage.delete().catch(() => null);

      const lyricLines = songData.lyrics.split("\n");

      const paginator = new Paginator<string>({
        items: lyricLines,
        colour: Colours.theme,
        userId: message.author.id,
        author: {
          name: message.author.username,
          iconURL: message.author.displayAvatarURL({ size: 1024 }),
        },
        title: `${songData.title} - ${songData.artist}`,
        formatItem: (line) => (line.trim() === "" ? "\u200b" : line),
      });

      await paginator.start(message);
    } catch (error: any) {
      if (error.message === "NOT_FOUND" || error.message === "NO_LYRICS") {
        await statusMessage.edit({
          embeds: [
            Embeds.warning(
              `${message.author}: I couldn't find any lyrics for **${query}**.`,
            ),
          ],
        });
      } else {
        await statusMessage.edit({
          embeds: [
            Embeds.deny(
              `${message.author}: Something went wrong while finding the lyrics.`,
            ),
          ],
        });
      }
    }
  },
} satisfies Command;

export default command;

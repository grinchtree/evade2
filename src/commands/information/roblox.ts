import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { DatabaseCache } from "../../database/cache";

import { fetchApi, isAnyErrorResponse } from "rozod";
import { postUsernamesUsers, getUsersUserid } from "rozod/endpoints/usersv1";
import { getUsersAvatar } from "rozod/endpoints/thumbnailsv1";
import {
  getUsersUseridFriendsCount,
  getUsersTargetuseridFollowersCount,
  getUsersTargetuseridFollowingsCount,
} from "rozod/endpoints/friendsv1";
import { Colours, Embeds, send } from "../../utils/messaging";

interface RobloxCacheEntry {
  userId: number;
  username: string;
  displayName: string;
  isBanned: boolean;
  created: string;
  description: string;
  avatarUrl: string | null;
  friendsCount: number;
  followersCount: number;
  followingsCount: number;
}

const robloxCache = new DatabaseCache<RobloxCacheEntry | null>(5000, 300000);

async function fetchRobloxProfile(
  targetUsername: string,
): Promise<RobloxCacheEntry | null> {
  const cacheKey = targetUsername.toLowerCase();

  // uses our new cache class to prevent duplicate requests and handle ttl automatically
  return robloxCache.getOrFetch(cacheKey, async () => {
    const userRes = await fetchApi(postUsernamesUsers, {
      body: {
        usernames: [targetUsername],
        excludeBannedUsers: false,
      },
    });

    if (
      isAnyErrorResponse(userRes) ||
      !userRes.data ||
      userRes.data.length === 0
    ) {
      // caching null prevents spamming the api for invalid users
      return null;
    }

    const { id: userId, name: username, displayName } = userRes.data[0];

    const [detailsRes, avatarRes, friendsRes, followersRes, followingsRes] =
      await Promise.all([
        fetchApi(getUsersUserid, { userId }),
        fetchApi(getUsersAvatar, {
          userIds: [userId],
          size: "720x720",
          format: "Png",
          isCircular: false,
        }),
        fetchApi(getUsersUseridFriendsCount, { userId }),
        fetchApi(getUsersTargetuseridFollowersCount, { targetUserId: userId }),
        fetchApi(getUsersTargetuseridFollowingsCount, { targetUserId: userId }),
      ]);

    const details = !isAnyErrorResponse(detailsRes) ? detailsRes : null;
    const avatarUrl =
      !isAnyErrorResponse(avatarRes) && avatarRes.data?.[0]?.imageUrl
        ? avatarRes.data[0].imageUrl
        : null;

    return {
      userId,
      username,
      displayName,
      isBanned: details?.isBanned ?? false,
      created: details?.created ?? "",
      description: details?.description ?? "",
      avatarUrl,
      friendsCount: !isAnyErrorResponse(friendsRes)
        ? (friendsRes.count ?? 0)
        : 0,
      followersCount: !isAnyErrorResponse(followersRes)
        ? (followersRes.count ?? 0)
        : 0,
      followingsCount: !isAnyErrorResponse(followingsRes)
        ? (followingsRes.count ?? 0)
        : 0,
    };
  });
}

const command: Command = {
  name: "roblox",
  description: "View details about a Roblox profile.",
  aliases: ["rbx", "rblx"],
  syntax: "(username)",
  example: "builderman",
  cooldown: {
    limit: 1,
    duration: 5,
    type: "user",
  },

  execute: async (client: evClient, message: Message, args: string[]) => {
    if (args.length === 0) {
      await send(message, {
        embeds: [await Embeds.commandExample(message, client, command)],
      });
      return;
    }

    const targetUsername = args[0];

    const msg = await send(message, {
      embeds: [
        Embeds.fetch(
          `${message.author}: Loading **Roblox Profile** for **[\`${targetUsername}\`](https://www.roblox.com/${targetUsername})**.`,
        ),
      ],
    });

    try {
      const profile = await fetchRobloxProfile(targetUsername!);

      if (!profile) {
        await msg.edit({
          embeds: [
            Embeds.custom(
              ":mag:",
              `${message.author}: I couldn't find a Roblox user named **${targetUsername}**.`,
              Colours.default,
            ),
          ],
        });
        return;
      }

      const profileUrl = `https://www.roblox.com/users/${profile.userId}/profile`;
      const createdUnix = profile.created
        ? Math.floor(new Date(profile.created).getTime() / 1000)
        : 0;

      const title = profile.isBanned
        ? `@${profile.username} (Banned)`
        : profile.displayName
          ? `@${profile.username} (${profile.displayName})`
          : `@${profile.username}`;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: message.author.displayName,
          iconURL: message.author.displayAvatarURL({ size: 1024 }),
        })
        .setTitle(title)
        .setURL(profileUrl)
        .setColor(Colours.theme)
        .addFields(
          {
            name: "Friends",
            value: profile.friendsCount.toLocaleString(),
            inline: true,
          },
          {
            name: "Followers",
            value: profile.followersCount.toLocaleString(),
            inline: true,
          },
          {
            name: "Following",
            value: profile.followingsCount.toLocaleString(),
            inline: true,
          },
          {
            name: "Creation Date",
            value: createdUnix
              ? `<t:${createdUnix}:D> (<t:${createdUnix}:R>)`
              : "Unknown",
            inline: true,
          },
        );

      if (profile.description.trim().length > 0) {
        embed.setDescription(profile.description.substring(0, 4096));
      }

      if (profile.avatarUrl) {
        embed.setThumbnail(profile.avatarUrl);
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("View Profile")
          .setStyle(ButtonStyle.Link)
          .setURL(profileUrl),
      );

      await msg.edit({
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error("[Command: Roblox] Error:", error);
      await msg.edit({
        embeds: [
          Embeds.deny(
            `${message.author}: Something went wrong while **fetching that profile**.`,
          ),
        ],
      });
    }
  },
} satisfies Command;

export default command;

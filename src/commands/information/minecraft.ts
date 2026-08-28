import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Message,
} from "discord.js";
import type { Command } from "../../interfaces/Command";
import type { evClient } from "../../structs/Client";
import { Colours, Embeds, send } from "../../utils/messaging";
import { DatabaseCache } from "../../database/cache";
import { getPrimaryImageColour } from "../../utils/image";

export interface MinecraftProfile {
  id: string;
  name: string;
  activeCapes: string[];
}

const minecraftCache = new DatabaseCache<MinecraftProfile | null>(1000, 600000);

const command: Command = {
  name: "minecraft",
  description: "View a Minecraft profile.",

  aliases: ["mc"],

  syntax: "(username)",
  example: "Notch",

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

    const targetUsername = args[0]!;

    if (!/^[a-zA-Z0-9_]{1,16}$/.test(targetUsername)) {
      await send(message, {
        embeds: [
          Embeds.warning(
            `${message.author}: \`${targetUsername}\` isn't a **valid Minecraft username**.`,
          ),
        ],
      });
      return;
    }

    const msg = await send(message, {
      embeds: [
        Embeds.fetch(
          `${message.author}: Loading **Minecraft Profile** for **[\`${targetUsername}\`](https://www.minecraft.com/${targetUsername})**...`,
        ),
      ],
    });

    try {
      const cacheKey = `mc_profile_${targetUsername.toLowerCase()}`;

      const data = await minecraftCache.getOrFetch(cacheKey, async () => {
        const profileRes = await fetch(
          `https://api.mojang.com/users/profiles/minecraft/${targetUsername}`,
        );

        if (profileRes.status === 404 || profileRes.status === 204) return null;
        if (!profileRes.ok) throw new Error("Mojang API returned an error");

        const { id: uuid, name: actualName } = (await profileRes.json()) as {
          id: string;
          name: string;
        };

        const activeCapes: string[] = [];

        const [sessionRes, optifineRes] = await Promise.all([
          fetch(
            `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`,
          ),
          fetch(`http://s.optifine.net/capes/${actualName}.png`, {
            method: "HEAD",
          }),
        ]);

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          const texturesProp = sessionData.properties?.find(
            (p: any) => p.name === "textures",
          );

          if (texturesProp) {
            const decodedStr = Buffer.from(
              texturesProp.value,
              "base64",
            ).toString("utf-8");
            const decodedJson = JSON.parse(decodedStr);

            if (decodedJson.textures?.CAPE) {
              activeCapes.push("Mojang (Equipped)");
            }
          }
        }

        if (optifineRes.ok) {
          activeCapes.push("OptiFine");
        }

        return { id: uuid, name: actualName, activeCapes } as MinecraftProfile;
      });

      if (!data) {
        await msg.edit({
          embeds: [
            Embeds.eyeGlass(
              `${message.author}: I couldn't find a Minecraft user named **${targetUsername}**.`,
            ),
          ],
        });
        return;
      }

      const { id: uuid, name: actualName, activeCapes } = data;
      const capesDisplay =
        activeCapes.length > 0 ? activeCapes.join(", ") : "None equipped";

      const nameMc = `https://namemc.com/profile/${actualName}`;

      const embed = new EmbedBuilder()
        .setTitle(`@${actualName}`)
        .setURL(`https://namemc.com/profile/${actualName}`)
        .setColor(Colours.theme)
        .setDescription(`**UUID**: **${uuid}**`)
        .addFields(
          {
            name: "Cape",
            value: capesDisplay,
            inline: true,
          },
          {
            name: "Links",
            value: `[NameMC](${nameMc})`,
            inline: true,
          },
        )
        .setThumbnail(`https://visage.surgeplay.com/face/256/${uuid}`)
        .setTimestamp()
        .setAuthor({
          name: message.author.username,
          iconURL: message.author.displayAvatarURL({ size: 512 }),
        });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("View NameMC")
          .setStyle(ButtonStyle.Link)
          .setURL(nameMc),
      );

      await msg.edit({ embeds: [embed], components: [row] });

      setTimeout(async () => {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("View NameMC")
            .setStyle(ButtonStyle.Link)
            .setURL(nameMc)
            .setDisabled(true),
        );

        await msg.edit({ components: [row] });
      }, 30000);
    } catch (error) {
      await msg.edit({
        embeds: [
          Embeds.warning(
            `${message.author}: There was an issue **searching for that user**. Try again later.`,
          ),
        ],
      });
    }
  },
} satisfies Command;

export default command;

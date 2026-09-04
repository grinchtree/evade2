import {
  ChannelType,
  Events,
  NewsChannel,
  PermissionFlagsBits,
  type VoiceState,
} from "discord.js";
import type { Event } from "../interfaces/Event";
import type { evClient } from "../structs/Client";
import { getVoicemasterData, updateVoicemasterData } from "../database/helpers";
import { logging } from "../utils/logging";

const event: Event = {
  name: Events.VoiceStateUpdate,
  execute: async (
    oldState: VoiceState,
    newState: VoiceState,
    client: evClient,
  ) => {
    if (oldState.channelId === newState.channelId) return;

    const voicemasterData = await getVoicemasterData(newState.guild.id, false);
    if (!voicemasterData) return;

    const config = voicemasterData.configuration || {};
    let activeChannels = voicemasterData.active_channels || {};
    let dbRequiresUpdate = false;

    if (oldState.channelId && activeChannels[oldState.channelId]) {
      const oldChannel = oldState.channel;

      if (oldChannel && oldChannel.members.size === 0) {
        try {
          await oldChannel.delete();
          delete activeChannels[oldState.channelId];
          dbRequiresUpdate = true;
        } catch (error) {
          logging.error(`failed to delete voicemaster channel: ${error}`);
        }
      } else if (
        oldState.member?.id === activeChannels[oldState.channelId].owner
      ) {
        await oldChannel?.permissionOverwrites.edit(
          activeChannels[oldState.channelId].owner,
          { ManageChannels: null, ManageRoles: null, MoveMembers: null },
        );

        activeChannels[oldState.channelId].owner = null;
        dbRequiresUpdate = true;
      }
    }

    if (newState.channelId && newState.channelId === config.creation_channel) {
      if (newState.member?.user.bot) return;

      try {
        const newChannel = await newState.guild.channels.create({
          name: `${newState.member?.user.username}'s Channel`,
          type: ChannelType.GuildVoice,
          parent: config.category_id || newState.channel?.parentId || undefined,
          bitrate: newState.guild.maximumBitrate,
          permissionOverwrites: [
            {
              id: newState.member!.id,
              allow: [
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
              ],
            },
          ],
        });

        await newState.setChannel(newChannel);

        activeChannels[newChannel.id] = {
          owner: newState.member!.id,
          locked: false,
          hidden: false,
        };

        dbRequiresUpdate = true;
      } catch (error) {
        logging.error(`failed to create voicemaster channel: ${error}`);
        await newState.disconnect().catch(() => {});
      }
    }

    if (dbRequiresUpdate) {
      await updateVoicemasterData(newState.guild.id, {
        active_channels: activeChannels,
      });
    }
  },
} satisfies Event;

export default event;

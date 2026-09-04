import {
  Events,
  PermissionFlagsBits,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  type Interaction,
  type GuildMember,
} from "discord.js";
import type { Event } from "../interfaces/Event";
import type { evClient } from "../structs/Client";
import { Colours, Embeds } from "../utils/messaging";
import { getVoicemasterData, updateVoicemasterData } from "../database/helpers";
import { promiseMember, promiseRole } from "../utils/promise";

const event: Event = {
  name: Events.InteractionCreate,
  execute: async (interaction: Interaction, client: evClient) => {
    // --- MODAL POPUP TRIGGERS (These must be triggered instantly before deferring) ---
    if (interaction.isButton()) {
      if (interaction.customId === "vm_rename") {
        const modal = new ModalBuilder()
          .setCustomId("vm_modal_rename")
          .setTitle("Rename Channel");
        const input = new TextInputBuilder()
          .setCustomId("input_name")
          .setLabel("New Channel Name")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true);
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(input),
        );
        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === "vm_limit") {
        const modal = new ModalBuilder()
          .setCustomId("vm_modal_limit")
          .setTitle("Set User Limit");
        const input = new TextInputBuilder()
          .setCustomId("input_limit")
          .setLabel("Number of users (0 to remove limit)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(2)
          .setRequired(true);
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(input),
        );
        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === "vm_allow") {
        const modal = new ModalBuilder()
          .setCustomId("vm_modal_allow")
          .setTitle("Allow User / Role");
        const input = new TextInputBuilder()
          .setCustomId("input_target")
          .setLabel("User/Role ID or Name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(input),
        );
        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === "vm_kick") {
        const modal = new ModalBuilder()
          .setCustomId("vm_modal_kick")
          .setTitle("Kick User");
        const input = new TextInputBuilder()
          .setCustomId("input_target")
          .setLabel("User ID or Name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(input),
        );
        await interaction.showModal(modal);
        return;
      }
    }

    // --- BUTTON & MODAL EXECUTION LOGIC ---
    if (interaction.isButton() || interaction.isModalSubmit()) {
      if (!interaction.customId.startsWith("vm_")) return;

      const member = interaction.member as GuildMember;
      const vc = member?.voice.channel;

      if (!vc) {
        await interaction.reply({
          embeds: [
            Embeds.warning(
              `${interaction.user}: You aren't in a **VoiceMaster Channel**.`,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const voicemasterData = await getVoicemasterData(
        interaction.guildId!,
        false,
      );
      if (!voicemasterData) {
        await interaction.reply({
          embeds: [
            Embeds.warning(
              `${interaction.user}: The **VoiceMaster Feature** isn't setup.`,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const activeChannels = voicemasterData.active_channels || {};
      const channelData = activeChannels[vc.id];

      if (!channelData) {
        await interaction.reply({
          embeds: [
            Embeds.warning(
              `${interaction.user}: You aren't in a **VoiceMaster Channel**.`,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.customId === "vm_claim") {
        if (channelData.owner === interaction.user.id) {
          await interaction.reply({
            embeds: [
              Embeds.warning(
                `${interaction.user}: You **already own** this channel.`,
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        if (channelData.owner && vc.members.has(channelData.owner)) {
          await interaction.reply({
            embeds: [
              Embeds.warning(
                `${interaction.user}: The **owner** of this **VoiceMaster Channel** is still here.`,
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await vc.permissionOverwrites.edit(interaction.user.id, {
          ManageChannels: true,
          ManageRoles: true,
          MoveMembers: true,
          Connect: true,
          ViewChannel: true,
          MuteMembers: true,
          DeafenMembers: true,
        });

        activeChannels[vc.id].owner = interaction.user.id;
        await updateVoicemasterData(interaction.guildId!, {
          active_channels: activeChannels,
        });

        await interaction.reply({
          embeds: [
            Embeds.approve(
              `${interaction.user}: You are now the **owner** of <#${vc.id}>.`,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (channelData.owner !== interaction.user.id) {
        await interaction.reply({
          embeds: [
            Embeds.warning(
              `${interaction.user}: You aren't **the owner** of this **VoiceMaster Channel**.`,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        // --- DIRECT BUTTON ACTIONS ---
        if (interaction.customId === "vm_lock") {
          if (channelData.locked) {
            await interaction.editReply({
              embeds: [
                Embeds.warning(
                  `${interaction.user}: Your **VoiceMaster Channel** is **already locked**.`,
                ),
              ],
            });
            return;
          }
          await vc.permissionOverwrites.edit(
            interaction.guild!.roles.everyone.id,
            { Connect: false },
          );
          activeChannels[vc.id].locked = true;
          await updateVoicemasterData(interaction.guildId!, {
            active_channels: activeChannels,
          });
          await interaction.editReply({
            embeds: [
              Embeds.custom(
                ":lock:",
                `${interaction.user}: Your **VoiceMaster Channel** has been **locked**.`,
                "#ffac33",
              ),
            ],
          });
          return;
        }

        if (interaction.customId === "vm_unlock") {
          if (!channelData.locked) {
            await interaction.editReply({
              embeds: [
                Embeds.warning(
                  `${interaction.user}: Your **VoiceMaster Channel** is **not locked**.`,
                ),
              ],
            });
            return;
          }
          await vc.permissionOverwrites.edit(
            interaction.guild!.roles.everyone.id,
            { Connect: null },
          );
          activeChannels[vc.id].locked = false;
          await updateVoicemasterData(interaction.guildId!, {
            active_channels: activeChannels,
          });
          await interaction.editReply({
            embeds: [
              Embeds.custom(
                ":lock:",
                `${interaction.user}: Your **VoiceMaster Channel** has been **unlocked**.`,
                "#ffac33",
              ),
            ],
          });
          return;
        }

        if (interaction.customId === "vm_hide") {
          if (channelData.hidden) {
            await interaction.editReply({
              embeds: [
                Embeds.warning(
                  `${interaction.user}: Your **VoiceMaster Channel** is **already hidden**.`,
                ),
              ],
            });
            return;
          }
          await vc.permissionOverwrites.edit(
            interaction.guild!.roles.everyone.id,
            { ViewChannel: false },
          );
          activeChannels[vc.id].hidden = true;
          await updateVoicemasterData(interaction.guildId!, {
            active_channels: activeChannels,
          });
          await interaction.editReply({
            embeds: [
              Embeds.approve(
                `${interaction.user}: Your **VoiceMaster Channel** has been **hidden**.`,
              ),
            ],
          });
          return;
        }

        if (interaction.customId === "vm_unhide") {
          if (!channelData.hidden) {
            await interaction.editReply({
              embeds: [
                Embeds.warning(
                  `${interaction.user}: Your **VoiceMaster Channel** is **already visible**.`,
                ),
              ],
            });
            return;
          }
          await vc.permissionOverwrites.edit(
            interaction.guild!.roles.everyone.id,
            { ViewChannel: null },
          );
          activeChannels[vc.id].hidden = false;
          await updateVoicemasterData(interaction.guildId!, {
            active_channels: activeChannels,
          });
          await interaction.editReply({
            embeds: [
              Embeds.approve(
                `${interaction.user}: Your **VoiceMaster Channel** is now **visible**.`,
              ),
            ],
          });
          return;
        }

        // --- MODAL ACTIONS ---
        if (interaction.isModalSubmit()) {
          if (interaction.customId === "vm_modal_rename") {
            const newName = interaction.fields.getTextInputValue("input_name");
            await vc.edit({ name: newName });
            await interaction.editReply({
              embeds: [
                Embeds.approve(
                  `${interaction.user}: Successfully **renamed VoiceMaster Channel** to: \`${newName}\`.`,
                ),
              ],
            });
            return;
          }

          if (interaction.customId === "vm_modal_limit") {
            let limit = Number(
              interaction.fields.getTextInputValue("input_limit"),
            );
            if (isNaN(limit) || limit < 1) limit = 0;
            if (limit > 99) limit = 99;
            await vc.edit({ userLimit: limit });
            await interaction.editReply({
              embeds: [
                Embeds.approve(
                  `${interaction.user}: Successfully **${limit ? "limited" : "reset"} VoiceMaster Channel users**${limit ? ` to: \`${limit}\`` : " **limit**"}.`,
                ),
              ],
            });
            return;
          }

          if (interaction.customId === "vm_modal_allow") {
            const targetArg =
              interaction.fields.getTextInputValue("input_target");
            let targetId: string | undefined;
            let targetName: string | undefined;

            const targetMember = await promiseMember(
              interaction.guild!,
              targetArg,
            );
            if (targetMember) {
              targetId = targetMember.id;
              targetName = targetMember.user.username;
            } else {
              const targetRole = await promiseRole(
                interaction.guild!,
                targetArg,
                true,
              );
              if (targetRole) {
                targetId = targetRole.id;
                targetName = targetRole.name;
              }
            }

            if (!targetId || !targetName) {
              await interaction.editReply({
                embeds: [
                  Embeds.eyeGlass(
                    `${interaction.user}: I couldn't find a **member** or **role** matching \`${targetArg}\`. Try using its **ID** instead.`,
                  ),
                ],
              });
              return;
            }

            await vc.permissionOverwrites.edit(targetId, {
              Connect: true,
              ViewChannel: true,
            });
            await interaction.editReply({
              embeds: [
                Embeds.approve(
                  `${interaction.user}: Successfully **allowed** **${targetName}** into your channel.`,
                ),
              ],
            });
            return;
          }

          if (interaction.customId === "vm_modal_kick") {
            const targetArg =
              interaction.fields.getTextInputValue("input_target");
            const targetMember = await promiseMember(
              interaction.guild!,
              targetArg,
            );

            if (!targetMember) {
              await interaction.editReply({
                embeds: [
                  Embeds.eyeGlass(
                    `${interaction.user}: I couldn't find **a member** by: \`${targetArg}\`. Try using their **ID** instead.`,
                  ),
                ],
              });
              return;
            }
            if (targetMember.id === interaction.user.id) {
              await interaction.editReply({
                embeds: [
                  Embeds.warning(
                    `${interaction.user}: You cannot **kick yourself** from your own channel.`,
                  ),
                ],
              });
              return;
            }

            await vc.permissionOverwrites.edit(targetMember.id, {
              Connect: false,
            });
            if (targetMember.voice.channelId === vc.id) {
              await targetMember.voice.disconnect(
                `Kicked from VoiceMaster channel by ${interaction.user.username}`,
              );
            }
            await interaction.editReply({
              embeds: [
                Embeds.approve(
                  `${interaction.user}: Successfully **kicked** **${targetMember.user.username}** from your channel.`,
                ),
              ],
            });
            return;
          }
        }
      } catch (error) {
        await interaction
          .editReply({
            embeds: [
              Embeds.deny(`${interaction.user}: An error occurred: ${error}`),
            ],
          })
          .catch(() => {});
        return;
      }
    }
  },
} satisfies Event;

export default event;

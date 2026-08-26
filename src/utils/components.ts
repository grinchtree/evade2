import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ColorResolvable,
  type EmbedAuthorData,
} from "discord.js";
import { Embeds, send } from "./messaging";

export interface PaginatorOptions<T> {
  items: T[];
  itemsPerPage?: number;
  title?: string;
  url?: string;
  colour: ColorResolvable;
  author?: EmbedAuthorData;
  timeout?: number;
  userId: string;
  thumbnail?: string;
  formatItem: (item: T, index: number) => string;
  getSearchString?: (item: T) => string;
}

export class Paginator<T> {
  private items: T[];
  private originalItems: T[]; // keeps a backup of the full list so we can reset searches
  private itemsPerPage: number;
  private totalPages: number;
  private currentPage: number = 1;
  private options: PaginatorOptions<T>;

  constructor(options: PaginatorOptions<T>) {
    this.options = options;
    // fallback to empty array just in case undefined is passed
    this.originalItems = options.items || [];
    this.items = [...this.originalItems]; // clone the array for current view
    this.itemsPerPage = options.itemsPerPage ?? 10;

    // calculate total pages, ensuring there's always at least 1 page even if empty
    this.totalPages = Math.max(
      1,
      Math.ceil(this.items.length / this.itemsPerPage),
    );
  }

  // internal fuzzy finding algorithm (e.g., "fz" matches "fzlgoe")
  private fuzzyMatch(query: string, target: string): boolean {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    let qIdx = 0;

    for (let i = 0; i < t.length; i++) {
      if (t[i] === q[qIdx]) qIdx++;
      if (qIdx === q.length) return true;
    }
    return false;
  }

  private generateEmbed(): EmbedBuilder {
    // calculate slice indexes for the current page
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const currentItems = this.items.slice(start, end);

    // map items to strings using the provided formatter, or show a fallback
    const description =
      currentItems.length > 0
        ? currentItems
            .map((item, index) => this.options.formatItem(item, start + index))
            .join("\n")
        : "No entries found matching your search.";

    const embed = new EmbedBuilder().setDescription(description).setFooter({
      text: `${this.items.length} entries - Page ${this.currentPage}/${this.totalPages}`,
    });

    // apply optional embed properties
    if (this.options.title) embed.setTitle(this.options.title);
    if (this.options.url) embed.setURL(this.options.url);
    if (this.options.colour) embed.setColor(this.options.colour);
    if (this.options.author) embed.setAuthor(this.options.author);
    if (this.options.thumbnail) embed.setThumbnail(this.options.thumbnail);

    return embed;
  }

  private generateButtons(
    disableAll: boolean = false,
  ): ActionRowBuilder<ButtonBuilder> {
    const isOnlyPage = this.totalPages === 1;
    const row = new ActionRowBuilder<ButtonBuilder>();

    row.addComponents(
      // back button
      new ButtonBuilder()
        .setCustomId("page_left")
        .setEmoji("<:left:1525215431848366080>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disableAll || isOnlyPage || this.currentPage === 1),

      // jump button
      new ButtonBuilder()
        .setCustomId("page_jump")
        .setEmoji("<:jump:1525215410004299938>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disableAll || isOnlyPage),
    );

    // if the search string function is provided, dynamically add the Search button!
    if (this.options.getSearchString) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("page_search")
          .setEmoji("<:search:1540365951206293654>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disableAll),
      );
    }

    row.addComponents(
      // forward button
      new ButtonBuilder()
        .setCustomId("page_right")
        .setEmoji("<:right:1525215446104674314>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(
          disableAll || isOnlyPage || this.currentPage === this.totalPages,
        ),

      // delete button
      new ButtonBuilder()
        .setCustomId("page_delete")
        .setEmoji("<:trash:1525215640602935426>")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disableAll),
    );

    return row;
  }

  public async start(message: Message) {
    const embed = this.generateEmbed();
    const components = this.generateButtons();

    let paginatorMessage: Message | undefined;

    // send the initial paginator message
    if (message.channel.isDMBased()) {
      paginatorMessage = await send(
        message,
        { embeds: [embed], components: [components] },
        true,
      );
    } else {
      paginatorMessage = await send(message, {
        embeds: [embed],
        components: [components],
      });
    }

    // if send failed, safely abort
    if (!paginatorMessage) return;

    const collector = paginatorMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: this.options.timeout ?? 30000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== this.options.userId) {
        await interaction.reply({
          embeds: [
            Embeds.warning(
              `${interaction.user}: You don't **own this embed**.`,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.customId === "page_left") {
        this.currentPage--;
      } else if (interaction.customId === "page_right") {
        this.currentPage++;
      } else if (interaction.customId === "page_delete") {
        await paginatorMessage!.delete().catch(() => null);
        collector.stop("deleted");
        return;
      } else if (interaction.customId === "page_search") {
        // build search modal
        const modal = new ModalBuilder()
          .setCustomId("modal_search")
          .setTitle("Fuzzy Search");

        const searchInput = new TextInputBuilder()
          .setCustomId("search_input")
          .setLabel("Enter query (leave empty to reset)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(searchInput),
        );

        await interaction.showModal(modal);

        try {
          const modalSubmit = await interaction.awaitModalSubmit({
            filter: (i) =>
              i.customId === "modal_search" &&
              i.user.id === this.options.userId,
            time: 60000,
          });

          const query = modalSubmit.fields
            .getTextInputValue("search_input")
            .trim();

          // if empty, restore the original full list
          if (!query) {
            this.items = [...this.originalItems];
          } else {
            // fuzzy filter the items
            this.items = this.originalItems.filter((item) => {
              const targetStr = this.options.getSearchString!(item);
              return this.fuzzyMatch(query, targetStr);
            });
          }

          // recalculate math and reset to page 1
          this.totalPages = Math.max(
            1,
            Math.ceil(this.items.length / this.itemsPerPage),
          );
          this.currentPage = 1;

          if (modalSubmit.isFromMessage()) {
            await modalSubmit.update({
              embeds: [this.generateEmbed()],
              components: [this.generateButtons()],
            });
          }
          return;
        } catch (error) {
          return; // modal timed out
        }
      } else if (interaction.customId === "page_jump") {
        const modal = new ModalBuilder()
          .setCustomId("modal_jump")
          .setTitle("Jump to Page");

        const pageInput = new TextInputBuilder()
          .setCustomId("page_input")
          .setLabel(`Enter a page (1 - ${this.totalPages})`)
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(pageInput),
        );

        await interaction.showModal(modal);

        try {
          const modalSubmit = await interaction.awaitModalSubmit({
            filter: (i) =>
              i.customId === "modal_jump" && i.user.id === this.options.userId,
            time: 30000,
          });

          const requestedPage = parseInt(
            modalSubmit.fields.getTextInputValue("page_input"),
            10,
          );

          if (
            isNaN(requestedPage) ||
            requestedPage < 1 ||
            requestedPage > this.totalPages
          ) {
            await modalSubmit.reply({
              embeds: [
                Embeds.warning(
                  `${interaction.user}: I **couldn't** find **that page**. Please enter a number **between 1 and ${this.totalPages}**.`,
                ),
              ],
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          this.currentPage = requestedPage;

          if (modalSubmit.isFromMessage()) {
            await modalSubmit.update({
              embeds: [this.generateEmbed()],
              components: [this.generateButtons()],
            });
          }
          return;
        } catch (error) {
          return;
        }
      }

      if (
        interaction.customId !== "page_jump" &&
        interaction.customId !== "page_search" &&
        !interaction.replied
      ) {
        await interaction.update({
          embeds: [this.generateEmbed()],
          components: [this.generateButtons()],
        });
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "deleted") return;

      await paginatorMessage!
        .edit({ components: [this.generateButtons(true)] })
        .catch(() => null);
    });
  }
}

export class ConfirmationView {
  public value: boolean | null = null;
  private userId: string;
  private timeout: number;

  // set up the confirmation view with the target user's ID and an optional timeout (default: 60s)
  constructor(userId: string, timeout: number = 30000) {
    this.userId = userId;
    this.timeout = timeout;
  }

  // generates the ActionRow containing the Confirm and Decline buttons
  public getRow(disabled: boolean = false): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_yes")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),

      new ButtonBuilder()
        .setCustomId("confirm_no")
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
    );
  }

  // listens for the button click and returns true if accepted, false if declined, or null if it timed out
  public async wait(promptMessage: Message): Promise<boolean | null> {
    try {
      // wait for a button click on the provided message
      const interaction = await promptMessage.awaitMessageComponent({
        filter: (i) => {
          // reject clicks from anyone who isn't the intended user
          if (i.user.id !== this.userId) {
            i.reply({
              embeds: [
                Embeds.warning(
                  // fixed bug: used i.user instead of interaction.user
                  `${i.user}: You don't **own this embed**.`,
                ),
              ],
              flags: MessageFlags.Ephemeral,
            }).catch(() => null);
            return false;
          }
          return true; // allow the click to pass through
        },
        time: this.timeout,
        componentType: ComponentType.Button,
      });

      // determine if they clicked yes or no
      this.value = interaction.customId === "confirm_yes";

      // automatically disable the buttons now that a choice was made
      await interaction.update({ components: [this.getRow(true)] });

      return this.value;
    } catch (error) {
      // if it hits the catch block, it means the collector timed out.
      this.value = null;

      // edit the original message to disable the buttons so they can't be clicked anymore
      await promptMessage
        .edit({ components: [this.getRow(true)] })
        .catch(() => null);

      return null;
    }
  }
}

export async function sendConfirmationView(
  message: Message,
  description: string,
): Promise<boolean | null> {
  // create a new view locked to the command author, timing out after 15 seconds
  const view = new ConfirmationView(message.author.id, 30000);

  // send the prompt message with the buttons attached (added missing 'await')
  const promptMessage = await send(message, {
    embeds: [Embeds.warning(description)],
    components: [view.getRow()],
  });

  // if the bot failed to send the message, safely abort
  if (!promptMessage) return null;

  // wait for the user to click a button or for the 15-second timer to run out
  const confirmed = await view.wait(promptMessage);

  // clean up the prompt message to keep the channel tidy
  await promptMessage.delete().catch(() => null);

  return confirmed;
}

export async function sendCancellableTask(
  message: Message,
  initialEmbed: EmbedBuilder,
  timeLimitMs: number,
  topic: string = "operation",
) {
  // setup the cancel button
  const cancelButton = new ButtonBuilder()
    .setCustomId("cancel_task")
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton);

  // send the status message with the button attached
  const statusMessage = await send(message, {
    embeds: [initialEmbed],
    components: [row],
  });

  let cancelled = false;

  // listen specifically for the command author clicking cancel
  const collector = statusMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) =>
      i.user.id === message.author.id && i.customId === "cancel_task",
    time: timeLimitMs,
  });

  collector.on("collect", async (i) => {
    cancelled = true;
    collector.stop();

    // instantly update the embed to show it's stopping
    await i.update({
      components: [],
      embeds: [Embeds.warning(`${message.author}: **Cancelling** ${topic}...`)],
    });
  });

  // return the control methods so the command can check the status
  return {
    statusMessage,
    isCancelled: () => cancelled,
    stop: () => collector.stop(),
  };
}

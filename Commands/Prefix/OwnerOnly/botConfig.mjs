import {
  EmbedBuilder,
  convertObject,
  isImageURLValid,
  validateStreamingURL,
} from "../../../src/utils/index.mjs";
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActivityType,
  ModalBuilder,
  TextInputBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
} from "discord.js";
import { resolveStatus } from "../../../src/utils/member.mjs";
import GlobalConfig from "../../../Assets/Global/config.mjs";
import * as Themes from "../../../Assets/Global/Themes.mjs";

/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
  name: "bot-config",
  cooldown: 5,
  ownerOnly: true,
  description: "Bot Configuration",
  aliases: [],
  category: "OwnerOnly",
  run: async ({ message, client, err, guildData }) => {
    try {
      const activityTypes = convertObject(ActivityType);

      const row = new ActionRowBuilder();
      const backBtn = new ButtonBuilder()
        .setCustomId("botConfig:homePage")
        .setStyle(2)
        .setLabel("Back");
      const menu = new StringSelectMenuBuilder()
        .setCustomId("botConfig")
        .setMaxValues(1)
        .setPlaceholder("Click here to update bot config")
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Update Name")
            .setDescription("Update Bot Name")
            .setValue("name"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Update Description")
            .setDescription("Update Bot Bio")
            .setValue("bio"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Update Pfp")
            .setDescription("Update Bot pfp/icon/logo")
            .setValue("pfp"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Presence")
            .setDescription("Update Bot Presence/Activity/Status")
            .setValue("presence"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Owners")
            .setDescription("Add/Remove Bot Owner")
            .setValue("owners"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Theme")
            .setDescription("Update Bot Theme")
            .setValue("theme"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Prefix")
            .setDescription("Update Bot Prefix")
            .setValue("prefix")
        );

      row.setComponents([menu]);

      const homePage = () => {
        const { TOKEN, CLIENT_ID, ...cleanConfig } = client.config;

        const configs = () => ({
          ...cleanConfig,
        });

        const con = configs();
        const embed = new EmbedBuilder()
          .setTheme(con.Theme)
          .setDefaultFooter()
          .setAuthor({
            name: client.user.username,
            iconURL: client.user.displayAvatarURL(),
          })
          .setThumbnail(client.user.displayAvatarURL())
          .setDescription(
            `!{star} **Configuration**\n- Theme: ${con.Theme}\n- Prefix: ${
              con.Prefix
            }\n- Activity: \n - Name: ${con.Activity.name}\n - Status: ${
              con.Status
            } ${
              con.Activity.type !== undefined
                ? `\n - Type: ${ActivityType[con.Activity.type]}`
                : ""
            }\n- Owners: \n${con.Owners.map((o) => ` - <@${o}> - ${o}`).join(
              "\n"
            )}`
          );

        return {
          embeds: [embed],
          components: [row],
        };
      };

      const msg = await message.safeReply(homePage());

      const collector = msg.createMessageComponentCollector({
        componentType: 0,
        time: 240 * 1000,
      });

      collector.on(
        "collect",
        /** @param {import("discord.js").Interaction} i */
        async (i) => {
          if (i.user.id !== message.author.id)
            return await i.safeReply({
              content: "^{common.no_auth_components}",
              ephemeral: true,
            });

          const updateMessage = {
            components: [],
            embeds: [
              new EmbedBuilder()
                .setTheme(guildData?.Theme)
                .setDescription("!{l} Updating..."),
            ],
          };

          //* Select menu
          if (i.isAnySelectMenu()) {
            const value = i.values.shift();

            //* first menu - botConfig
            if (i.customId === "botConfig") {
              if (value === "name" || value === "pfp" || value === "bio") {
                const isPfpValue = value === "pfp",
                  isNameValue = value === "name",
                  isBioValue = value === "bio";

                const input_1 = new TextInputBuilder()
                  .setStyle(1)
                  .setRequired(true)
                  .setCustomId("input:value")
                  .setLabel(
                    isNameValue || isBioValue ? "Enter Text" : "Enter image URL"
                  )
                  .setPlaceholder(
                    isNameValue || isBioValue
                      ? "Enter Something"
                      : "Valid Image URL"
                  )
                  .setMaxLength(isNameValue ? 32 : isPfpValue ? 300 : 100);

                if (isNameValue || isBioValue) input_1.setMinLength(2);

                const modal = new ModalBuilder()
                  .setCustomId("botConfig:modal:nameORpfp")
                  .setTitle("Bot Config")
                  .addComponents(new ActionRowBuilder().addComponents(input_1));

                await i.safeShowModal(modal).then(async () => {
                  const response = await i.awaitModalSubmit({
                    filter: (i) =>
                      i.customId === "botConfig:modal:nameORpfp" &&
                      i.user.id === message.author.id,
                    time: 240 * 1000,
                  });

                  if (!response) return;

                  await response?.deferReply({
                    ephemeral: true,
                    ...updateMessage,
                    fetchReply: true,
                  });

                  if (response?.isModalSubmit()) {
                    const value =
                      response.fields.fields.get("input:value").value;

                    if (isPfpValue && !(await isImageURLValid(value)))
                      return await response.safeEdit({
                        content: "Invalid image url",
                      });

                    const UpdateAndDoneMsg = async () => {
                      await response?.safeEdit({
                        content: "Successfully Updated!",
                        ephemeral: true,
                      });
                      await msg.safeEdit(homePage());
                    };

                    const ErrorRes = async (e) => {
                      await response?.safeEdit({
                        content: `Got an error: ${e?.message}`,
                        ephemeral: true,
                      });
                    };

                    if (isBioValue) {
                      await client.application
                        .edit({
                          description: value,
                        })
                        .then(UpdateAndDoneMsg)
                        .catch(ErrorRes);
                    } else {
                      await client.user[
                        isNameValue ? "setUsername" : "setAvatar"
                      ](value)
                        .then(UpdateAndDoneMsg)
                        .catch(ErrorRes);
                    }
                  }
                }); // end of model .then
              }

              //* Presence
              else if (value === "presence") {
                await i.safeUpdate(presencePanel());
              }

              //* owners
              else if (value === "owners") {
                await i.safeUpdate(ownersPanel());
              }

              //* theme from main menu
              else if (value === "theme") {
                const menu = new StringSelectMenuBuilder()
                  .setCustomId("botConfig:theme")
                  .setPlaceholder("Select Theme")
                  .setMinValues(1)
                  .setMaxValues(1)
                  .setOptions(
                    GlobalConfig.Themes.filter(
                      (theme) => theme !== client.config.Theme
                    ).map((theme) => {
                      return {
                        label: theme,
                        value: theme,
                      };
                    })
                  );

                const row = new ActionRowBuilder().addComponents(menu);

                await i.safeUpdate({
                  content: "Select Theme",
                  embeds: [],
                  components: [row],
                });
              } else if (value === "prefix") {
                const input_1 = new TextInputBuilder()
                  .setCustomId("prefix")
                  .setLabel("Enter the new prefix")
                  .setStyle(1)
                  .setPlaceholder("Prefix")
                  .setMaxLength(2)
                  .setRequired(true);

                const modal = new ModalBuilder()
                  .setCustomId("botConfig:modal:prefix")
                  .setTitle("Prefix")
                  .addComponents(new ActionRowBuilder().addComponents(input_1));

                await i.safeShowModal(modal);

                const response = await i.awaitModalSubmit({
                  time: 240000,
                  filter: (i) => i.customId === "botConfig:modal:prefix",
                });

                if (!response && !response.isModalSubmit()) return;

                const value = response.fields.getTextInputValue("prefix");

                await response.safeUpdate(GlobalOrNew("Prefix", value)); // confirm what ever glabl or new
              }
            }

            //* theme selected
            else if (i.customId === "botConfig:theme") {
              await i.safeUpdate(GlobalOrNew("Theme", value)); // confirm to set global or for new server
            }

            //* status menu  - online dnd
            else if (i.customId === "botConfig:status") {
              await i.safeUpdate(updateMessage);
              await client.configUpdate({
                Status: value,
              });
              client.user.setStatus(value);
              await msg.safeEdit(presencePanel());
            }

            //* activity type menu - watching playing ...
            else if (i.customId === "botConfig:activity") {
              await i.safeUpdate(updateMessage);
              await client.configUpdate({
                [`Activity.type`]: +value,
              });
              client.user.setActivity({
                ...client.config.Activity,
              });
              await msg.safeEdit(presencePanel());
            }

            //* owners menu
            else if (i.customId === "botConfig:owners:menu") {
              const { Owners } = client.config;
              if (value === i.user.id)
                return await i.safeReply({
                  content: "you cant add/remove yourself",
                  ephemeral: true,
                });

              if (Owners.includes(value)) {
                if (
                  GlobalConfig.Default.Owners.includes(value) ||
                  (Owners.indexOf(value) < 2 && Owners.indexOf(i.user.id) < !2)
                )
                  return await i.safeReply({
                    ephemeral: true,
                    content: "You cant remove them",
                  });

                await i.safeUpdate(updateMessage);

                await client.configUpdate({
                  Owners: [...Owners.filter((o) => o !== value)],
                });

                await msg.safeEdit(ownersPanel());
              } else {
                if (Owners.length >= (GlobalConfig?.MaxClientOwners || 5))
                  return await i.safeReply({
                    content: "Reach max limit. Remove someone to add this user",
                    ephemeral: true,
                  });

                await i.safeUpdate(updateMessage);

                await client.configUpdate({
                  Owners: [...Owners, value],
                });

                await msg.safeEdit(ownersPanel());
              }
            }
          } else if (i.isButton()) {
            //* set activity text
            if (i.customId === "botConfig:activity:name") {
              const input_1 = new TextInputBuilder()
                .setStyle(1)
                .setRequired(true)
                .setCustomId("value")
                .setLabel("Enter something")
                .setPlaceholder("Enter bot status text")
                .setMaxLength(32);

              const modal = new ModalBuilder()
                .setCustomId("botConfig:activity:text:modal")
                .setTitle("Bot Config")
                .addComponents(new ActionRowBuilder().addComponents(input_1));

              await i.safeShowModal(modal);

              const response = await i.awaitModalSubmit({
                filter: (i) =>
                  i.customId === "botConfig:activity:text:modal" &&
                  i.user.id === message.author.id,
                time: 240 * 1000,
              });

              if (!response) return;

              await response?.safeUpdate(updateMessage);

              /// on modal submit
              if (response?.isModalSubmit()) {
                const value = response.fields.fields.get("value").value;
                await client.configUpdate({
                  [`Activity.name`]: value,
                });
                client.user.setActivity({
                  ...client.config.Activity,
                });
                await msg.safeEdit(presencePanel());
              }
            }

            //* set gloabl or update config
            else if (i.customId.startsWith("botConfig:GlobalOrNew:")) {
              const value = i.customId.split(":");
              const [, , GlobalOrNew, Key, Value] = value;

              await i.safeUpdate(updateMessage);

              if (GlobalOrNew === "global")
                await client.db.Update(
                  "GuildConfig",
                  {},
                  {
                    [Key]: Value,
                  },
                  { upsert: true, new: true }
                );

              await client.configUpdate({ [Key]: Value });

              await msg.safeEdit(homePage());
            }

            //* set activity URL
            else if (i.customId === "botConfig:activity:url") {
              const input_1 = new TextInputBuilder()
                .setStyle(1)
                .setRequired(true)
                .setCustomId("value")
                .setLabel("Enter Streaming url")
                .setPlaceholder(
                  "Enter valid streaming url (twitch, youtube...)"
                )
                .setMaxLength(100);

              const modal = new ModalBuilder()
                .setCustomId("botConfig:activity:url:modal")
                .setTitle("Bot Config")
                .addComponents(new ActionRowBuilder().addComponents(input_1));

              await i.safeShowModal(modal);

              const response = await i.awaitModalSubmit({
                filter: (i) =>
                  i.customId === "botConfig:activity:url:modal" &&
                  i.user.id === message.author.id,
                time: 240 * 1000,
              });

              if (!response) return;

              /// on modal submit
              if (response?.isModalSubmit()) {
                let value = response.fields.fields.get("value").value;

                if (!validateStreamingURL(value))
                  return await response.safeReply({
                    content: "kindly provide a valid streaming url",
                    ephemeral: true,
                  });

                await response.safeUpdate(updateMessage);
                await client.configUpdate({
                  [`Activity.url`]: value,
                });
                client.user.setActivity({
                  ...client.config.Activity,
                });

                await msg.safeEdit(presencePanel());
              }
            }

            //* back btn
            else if (i.customId === "botConfig:homePage") {
              await i.safeUpdate(homePage());
            }
          }

          function presencePanel() {
            const embed = new EmbedBuilder()
              .setTheme(guildData?.Theme)
              .setDescription(
                "!{star} **Use following buttons to set presence**"
              );
            const row = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();
            const row3 = new ActionRowBuilder();
            const meny = new StringSelectMenuBuilder()
              .setCustomId("botConfig:status")
              .setMaxValues(1)
              .setPlaceholder("Select Status");

            const presenceEmojis = {
              online: "964292769277419550",
              idle: "1081284040755249182",
              dnd: "964292565954347030",
              invisible: "⚫",
            };

            const keys = Object.keys(presenceEmojis).filter(
              (p) => p !== client.user.presence.status && p !== "invisible"
            );

            for (const p of keys) {
              meny.addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel(resolveStatus(p))
                  .setValue(p)
                // .setEmoji(`${presenceEmojis?.[p]}`)
              );
            }

            const menu2 = new StringSelectMenuBuilder()
              .setCustomId("botConfig:activity")
              .setMaxValues(1)
              .setPlaceholder("Select Activity");

            const emojis = {
              Playing: "🎮",
              Custom: "🔥",
              Streaming: "🎥",
              Listening: "🎧",
              Watching: "📺",
              Competing: "🏆",
            };

            Object.keys(ActivityType)
              .filter((c) => isNaN(+c))
              .forEach((key) => {
                const open = new StringSelectMenuOptionBuilder()
                  .setLabel(key)
                  .setValue(`${ActivityType[key]}`);
                // if(emojis[key])  open.setEmoji(`${{name: emojis[key]}}`)
                menu2.addOptions(open);
              });

            const btn1 = new ButtonBuilder()
              .setCustomId("botConfig:activity:name")
              .setLabel("Set Activity Name")
              .setStyle(1);

            const btn2 = new ButtonBuilder()
              .setCustomId("botConfig:activity:url")
              .setLabel("Set Activity Url (for streaming)")
              .setDisabled(
                client.config.Activity?.type !== ActivityType.Streaming
                  ? true
                  : false
              )
              .setStyle(1);

            row.addComponents(meny);
            row2.addComponents(menu2);
            row3.addComponents(backBtn, btn1, btn2);

            return {
              embeds: [embed],
              components: [row, row2, row3],
            };
          }

          function ownersPanel() {
            const row = new ActionRowBuilder().addComponents(
              new UserSelectMenuBuilder()
                .setCustomId("botConfig:owners:menu")
                .setMaxValues(1)
                .setPlaceholder("Click here to add or remove owner")
            );

            const embed = new EmbedBuilder()
              .setTheme(guildData?.Theme)
              .setDefaultFooter()
              .setDescription(
                `!{star} **Owners** (${client.config.Owners.length}/${
                  GlobalConfig.MaxClientOwners
                })\n${client.config.Owners.map(
                  (o) => `- <@${o}> - \`${o}\``
                ).join("\n")}`
              );

            return {
              embeds: [embed],
              components: [row, new ActionRowBuilder().setComponents(backBtn)],
            };
          }

          // confirm what ever new config update globally or just for new servers (preix, theme..)
          function GlobalOrNew(Key, Value) {
            // currentily for theme and prefix only
            const btn1 = new ButtonBuilder()
              .setCustomId(`botConfig:GlobalOrNew:global:${Key}:${Value}`)
              .setLabel("1")
              .setStyle(2);
            const btn2 = new ButtonBuilder()
              .setCustomId(`botConfig:GlobalOrNew:new:${Key}:${Value}`)
              .setLabel("2")
              .setStyle(3);
            const embed = new EmbedBuilder()
              .setTheme(client.config.Theme)
              .setDescription(
                `1. Apply to all servers (update exits cofig)\n2. Apply to new servers only`
              )
              .setFooter({
                text: "Click the button to confirm",
              });
            const row = new ActionRowBuilder().addComponents(btn1, btn2);
            return {
              content: "",
              embeds: [embed],
              components: [row],
            };
          }
        }
      );

      collector.on("end", async (i) => {
        await msg
          .safeEdit({
            embeds: [
              new EmbedBuilder()
                .setTheme(guildData?.Theme)
                .setDescription("^{common.timeout}"),
            ],
            files: [],
            content: "",
            components: [],
          })
          .catch(() => {});
      });
    } catch (error) {
      err(error);
    }
  },
};

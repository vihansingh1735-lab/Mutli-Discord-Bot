import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, StringSelectMenuOptionBuilder, RoleSelectMenuBuilder, SlashCommandBuilder, ModalBuilder, MentionableSelectMenuBuilder, TextInputBuilder, ComponentType, ChannelSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits, roleMention, Message, Client } from "discord.js";
import canvafy from "canvafy";
import { isImageURLValid, EmbedBuilder, cache } from "../../../src/utils/index.mjs";
import Bot from "../../../src/client.mjs";
import * as Themes from "../../../Assets/Global/Themes.mjs";

const { Rank, LevelUp } = canvafy;
const cmd = {};

/** 
* @param {Object} object
 * @param {Message | import('discord.js').Interaction} object.message
 * @param {Bot} object.client
 * @param {String[]} object.args
 * @param {Object} object.Slash
 * @param err ErrorHnadler
 */
cmd.run = async ({ message, client, err, Slash, options, guildData }) => {
    try {
        /**
         * @typedef {"Text" | "Voice"} Type
         */
        const { guild } = message;
        const user = message.author || message.user

        const data = guildData;

        let homeBtn = new ButtonBuilder().setCustomId("home-btn").setStyle(2).setLabel("Home Page");

        let emotes = {
            // emotes id
            del: "979818265582899240",
            rank: "979733796599529483",
            channel: "1122752979854962719",
            message: "1058313763457081435",
            levelup: "1145033013957230592",
            rewards: "1064556027837685791"
        };

        let emoteLink = em => `https://cdn.discordapp.com/emojis/${emotes[em]}`;


        const select = (is) => new StringSelectMenuBuilder()
            .setCustomId('setup:level').setPlaceholder('Make a Selection!')
            .setDisabled(false)
            .setMaxValues(1)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(is?.Levels ? "Disable It" : "Enable It")
                    .setDescription(`Click to ${is?.Levels ? "Disable" : "Enable"} Leveling Systen`)
                    .setValue("enableOrDis")
                    .setEmoji(is?.Levels ? client.emotes.x : client.emotes.y),

                new StringSelectMenuOptionBuilder()
                    .setLabel("Channel For Text Rankup")
                    .setDescription(`Enable/Disable/Set Channel For Level Up!`)
                    .setValue("level:channel:Text")
                    .setEmoji(emotes.channel),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Channel For Voice Rankup")
                    .setDescription(`Enable/Disable/Set Channel For Voice Level Up!`)
                    .setValue("level:channel:Voice")
                    .setEmoji(emotes.channel),

                new StringSelectMenuOptionBuilder()
                    .setLabel("Message On Text Rankup")
                    .setDescription(`Enable/Disable/Set Message For Level Up!`)
                    .setEmoji(emotes.message)
                    .setValue("level:msg:Text"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Message On Voice Rankup")
                    .setDescription(`Enable/Disable/Set Message For Voice Level Up!`)
                    .setEmoji(emotes.message)
                    .setValue("level:msg:Voice"),

                new StringSelectMenuOptionBuilder().setLabel("Rewards On Text LevelUp")
                    .setDescription(`Setup Leveling Roles for text`).setValue("level:roles:Text")
                    .setEmoji(emotes.rewards),
                new StringSelectMenuOptionBuilder().setLabel("Rewards On Voice LevelUp")
                    .setDescription(`Setup Leveling Roles for voice`)
                    .setValue("level:roles:Voice")
                    .setEmoji(emotes.rewards),

                // new StringSelectMenuOptionBuilder()
                //     .setLabel("Rank Card")
                //     .setDescription(`Configure RankCard`)
                //     .setValue("rank:card")
                // // .setEmoji(emotes.rank)
                // ,

                // new StringSelectMenuOptionBuilder()
                //     .setLabel("Level Up Card").setDescription(`Configure LevelUp Card`)
                //     .setValue("levelup:card").setEmoji(emotes.levelup),

                new StringSelectMenuOptionBuilder().setLabel("Reset ALL")
                    .setDescription(`Delete all custom data`).setValue("level:reset").setEmoji(emotes.del)
            );


        const row = (data) => new ActionRowBuilder().addComponents(select(data));

        let homeEmbed = new EmbedBuilder(client)
            .setDefaultFooter()
            .setDescription(`**Select an option from the following list to get started!**\n\n> *${(client.getPromotion())?.Message}*`)
            .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
            .setAuthor({
                name: "Leveling System",
            })

        const home = (data) => ({
            embeds: [homeEmbed],
            components: [row(data)]
        })

        let msg = await message.reply(home(data));

        const collector = msg.createMessageComponentCollector({
            componentType: 0,
            time: 180 * 1000
        });

        collector.on('collect',
            /**@param {import("discord.js").Interaction} i */
            async i => {

                if (i.user.id !== user.id) return i.reply({
                    content: "!{skull}".replaceEmojis(data.Theme),
                    ephemeral: true
                });

                const load = {
                    files: [],
                    embeds: [new EmbedBuilder().setTheme(data.Theme).setDescription("!{l} Loading...")],
                    components: []
                }

                const data2 = await i.guild.fetchData()
                // * For Select Menus Only
                if (i.isAnySelectMenu()) {
                    const value = i.values[0];
                    //* Home PAGE Menu
                    if (i.customId === "setup:level") {

                        // * Enable Or Disable 
                        if (value === "enableOrDis") {
                            await i.update(load);

                            const newData = await client.db.UpdateOne('GuildConfig', {
                                Guild: guild.id
                            }, {
                                $set: {
                                    Levels: !data2?.Levels
                                }
                            }, { upsert: true, new: true });

                            await msg.edit(home(newData));
                            await guild.updateData();
                        }

                        //* Rank card 

                        else if (value === "rank:card") {
                            await i.update(load);
                            await msg.edit(await rankCard(data2))
                        }

                        //* Level Up Card
                        else if (value === "levelup:card") {
                            await i.update(load);
                            await msg.edit(await levelupCard(data2))
                        }

                        // * Set Text Or Voice Level Up Channel (Menu Select From Home Page)
                        else if (value.includes("level:channel:")) {
                            /**  @type {Type} */
                            const Type = value.replace("level:channel:", "");

                            const dbChannel = data2[Type === "Text" ? "LevelupChannel" : "VoiceLevelupChannel"]

                            let embed = new EmbedBuilder().setTheme(data.Theme)
                                .setDefaultFooter()
                                .setThumbnail(emoteLink("channel"))
                                .setDescription(`**Select a channel from given channels to set as rankup channel! for ${Type}**\n\n${dbChannel ? `!{star} Current Channel: <#${dbChannel}>` : ""}`)
                                .setAuthor({
                                    name: "LevelUp Channel: " + Type,
                                    url: "https://www.youtube.com/@Xyntr1xGG",
                                    iconURL: emoteLink("channel")
                                })

                            const channelSelect = (disabled = false) => new ChannelSelectMenuBuilder()
                                .setCustomId(`level:channelMenu:${Type}`)
                                .setPlaceholder('Dont Make Selection!')
                                .setDisabled(disabled).setMaxValues(1).setChannelTypes(0);

                            const channelRow = new ActionRowBuilder().addComponents(channelSelect());

                            await i.update({
                                embeds: [embed],
                                components: [channelRow, new ActionRowBuilder().setComponents(homeBtn)]
                            });
                        }

                        //* When user click msg option from home page
                        else if (value.includes("level:msg:")) {
                            /**  @type {Type} */
                            const Type = value.replace("level:msg:", "");
                            let msgBtn = new ButtonBuilder().setCustomId("level:message:btn:" + Type).setStyle(3).setLabel("Setup Levelup Message for " + Type);
                            const msgRow = new ActionRowBuilder().addComponents(msgBtn);

                            let embed = new EmbedBuilder()
                                .setDefaultFooter()
                                .setAuthor({
                                    name: "Setup Level Message for " + Type,
                                    url: "https://www.youtube.com/@Xyntr1xGG",
                                    iconURL: emoteLink("message")
                                })
                                .setThumbnail(emoteLink("message"))
                                .setDescription("**Click the button below to set/update level message .**\n## Avaliable  Variables\n - `{user:username}` - Returns username eg: uoaio\n - `{user:mention}` - Will Mention User eg: <@" + i.user + ">\n - `{user:level}` - Retruns User's Level eg: 5\n - `{user:xp}` - Returns Users XP eg: 100");

                            await i.update({
                                embeds: [embed],
                                components: [msgRow, new ActionRowBuilder().setComponents(homeBtn)]
                            });
                        }

                        //* Roles Option FROM HOME PAGE
                        else if (value.includes("level:roles:")) {
                            /**  @type {Type} */
                            const Type = value.replace("level:roles:", "");
                            await i.update(await rewardsRoles(data2, Type))
                        }

                        //* Reset data
                        else if (value === "level:reset") {

                        }
                    }

                    // * When User Select Channel from channel menu
                    else if (i.customId.includes("level:channelMenu:")) {
                        /**  @type {Type} */
                        const Type = i.customId.replace("level:channelMenu:", "");

                        await i.update(load);

                        const newData = await client.db.UpdateOne('GuildConfig', {
                            Guild: guild.id
                        }, {
                            $set: {
                                [Type === "Text" ? "LevelupChannel" : "VoiceLevelupChannel"]: value
                            }
                        });
                        await msg.edit(home(newData));
                        await guild.updateData()
                    }

                    //* when user slect number 
                    else if (i.customId.includes("level:number:Menu:")) {
                        const splited = i.customId.replace("level:number:Menu:", "").split(":")
                        /**  @type {Type} */
                        const Type = splited[0];
                        const TYpe2 = Type === "Text" ? "LevelRoles" : "VoiceLevelRoles"
                        const num = parseInt(value.split(":")[1])
                        await i.update(load);

                        let Rewards = await client.db.Find(TYpe2, { Guild: guild.id });

                        if (!Rewards) {
                            await client.db.Create(TYpe2, { Guild: guild.id });
                            Rewards = await client.db.Find(TYpe2, { Guild: guild.id });
                        }

                        if (Rewards.find(r => r.Level === num)) {
                            await client.db.Delete(TYpe2, {
                                Guild: guild.id,
                                Level: num
                            });

                            return await msg.edit(await rewardsRoles(Rewards.filter(y => y.Level !== num), Type));

                        } else {
                            let embed = new EmbedBuilder(client)
                                .setDefaultFooter()
                                .setAuthor({
                                    name: "LevelUp Rewards: " + Type,
                                    url: "https://www.youtube.com/@Xyntr1xGG",
                                    iconURL: emoteLink("rewards")
                                }).setThumbnail(emoteLink("rewards")).setDescription("*Select a Role from to set or update role as LevelUp Role*\n### Must Read Before Adding Role\n- The Role Postion lower than Me/My Role!\n- The Role Must Addable/Removeable\n- Make sure role does not has admin permission!");

                            const roleSelect = (disabled = false) => new RoleSelectMenuBuilder()
                                .setCustomId(`set:level:reward:RolesMenu:${Type}:${num}`).setPlaceholder('Dont Make Selection!').setDisabled(disabled).setMaxValues(1);

                            const roleRow = new ActionRowBuilder().addComponents(roleSelect());

                            await msg.edit({
                                embeds: [embed],
                                components: [roleRow, new ActionRowBuilder().setComponents(homeBtn)]
                            });
                        }
                    }

                    //* when user slect role 
                    else if (i.customId.includes("set:level:reward:RolesMenu:")) {
                        const splited = i.customId.replace("set:level:reward:RolesMenu:", "").split(":")
                        /**  @type {Type} */
                        const Type = splited[0];
                        const TYpe2 = Type === "Text" ? "LevelRoles" : "VoiceLevelRoles"
                        const num = Number(splited[1]);

                        const role = guild.roles.cache.get(i.values[0]);
                        const myPositon = guild.members.me.roles.highest.position;

                        if (role.position >= myPositon) return i.reply({
                            content: "## Kindly Select Another Role or Change My Positon\n> The role you selected is not addable/removeable from me, Give highest role or select another role.",
                            ephemeral: true
                        }); else if (role.tags && role.tags.botId) return i.reply({
                            content: "## Kindly Select Another Role\n> I noticed that role is for a bot - <@" + role.tags.botId + ">",
                            ephemeral: true
                        });

                        const rewardsData2 = await client.db.FindOne(TYpe2, {
                            Guild: guild.id,
                            // Level: num,
                            Role: role.id
                        });

                        if (rewardsData2) return await i.reply({
                            content: "## That Role is already set for Level **" + rewardsData2.Level + "**",
                            ephemeral: true
                        });

                        await i.update(load)
                        const newData = await client.db.UpdateOne(TYpe2, {
                            Guild: guild.id,
                            Level: num,
                        }, {
                            $set: {
                                Role: role.id
                            }
                        }, { upsert: true, new: true })

                        await msg.edit(await rewardsRoles(newData, Type))

                    }



                }


                // * For Buttons Only
                else if (i.isButton()) {

                    // * Go Back To Home Page
                    if (i.customId === "home-btn") return await i.update(home(data2));

                    //* When User Click Set message button
                    else if (i.customId.includes("level:message:btn:")) {
                        /**  @type {Type} */
                        const Type = i.customId.replace("level:message:btn:", "");

                        const input_1 = new TextInputBuilder()
                            .setStyle(1)
                            .setRequired(true)
                            .setCustomId('levelMsg')
                            .setLabel("LevelUp Message")
                            // .setValue(data.LevelupMessage)
                            .setPlaceholder('Enter Level Up Message!')
                            .setMaxLength(40);

                        const modal = new ModalBuilder()
                            .setCustomId('levelMsg')
                            .setTitle('Leveling System')
                            .addComponents(new ActionRowBuilder().addComponents(input_1));

                        await i.showModal(modal);

                        const response = await i.awaitModalSubmit({
                            filter: i => i.customId === "levelMsg" && i.user.id === user.id,
                            time: 60 * 1000
                        });

                        if (!response) return;
                        /// on modal submit
                        if (response.isModalSubmit()) {
                            response.deferUpdate();

                            const newData = await client.db.UpdateOne('GuildConfig',
                                { Guild: guild.id },
                                { $set: { [Type === "Text" ? "LevelupMessage" : "VoiceLevelupMessage"]: response.fields.fields.get("levelMsg").value } },
                                { upsert: true })

                            await msg.edit(home(newData));
                            await guild.updateData()
                        }
                    }

                    //* Reset reward roles of text or voice! 
                    else if (i.customId.includes("level:rewards:reset:")) {
                        /**@type {Type} */
                        const Type = i.customId.replace("level:rewards:reset:");
                        const TYpe2 = Type === "Text" ? "LevelRoles" : "VoiceLevelRoles"

                        await i.update(load);
                        await client.db.Delete(TYpe2, {
                            Guild: guild.id
                        });

                        await msg.edit(home(data2))
                    }

                    //* Rank Card Config Buttons
                    else if (i.customId.includes("rankCard:")) {
                        const Theme = Themes[data.Theme]

                        let whichBtn = i.customId.replace("rankCard:", "");

                        if (whichBtn === "reset") {
                            await i.update({ ...load });

                            const newData = await client.db.UpdateOne('GuildConfig', {
                                Guild: guild.id
                            }, {
                                $set: {
                                    RankCard: {
                                        Background: Theme.RankCard.Background,
                                        BarColor: Theme.RankCard.BarColor,
                                        BoderColor: Theme.RankCard.BoderColor
                                    }
                                }
                            }, { upsert: true });
                            await msg.edit(await rankCard(newData));
                            return;
                        }

                        const input_1 = new TextInputBuilder().setCustomId('rankCard').setLabel(whichBtn === "bg" ? "Picture URL" : "Enter Hex Code").setRequired(true).setPlaceholder(whichBtn === "bg" ? "Enter Valid Picture URL" : "Enter Hex Code").setStyle(1).setMaxLength(whichBtn === "bg" ? 300 : 6);
                        const modal = new ModalBuilder().setCustomId('rankCard').setTitle('Leveling System').addComponents(new ActionRowBuilder().addComponents(input_1));

                        await i.showModal(modal);

                        const response = await i.awaitModalSubmit({
                            filter: i => i.customId === "rankCard" && i.user.id === i.user.id,
                            time: 60 * 1000
                        });

                        if (!response) return;
                        /// on modal submit
                        if (response.isModalSubmit()) {
                            let value = response.fields.fields.get("rankCard").value;

                            if (whichBtn !== "bg" && !/^[A-Fa-f0-9]{6}$/.test(value)) return await response.reply({
                                embeds: [new EmbedBuilder(client).setDescription("Kindly Provide A Vaild Hex Code. eg: 00ffaa, ffffff, 000000......")],
                                ephemeral: true
                            });

                            if (whichBtn === "bg") {
                                if (!(await isImageURLValid(value))) return await response.reply({
                                    embeds: [new EmbedBuilder(client).setDescription("Kindly Provide A Vaild URL.")],
                                    ephemeral: true
                                });
                            }

                            await response?.update(load);

                            let RankCard = ""

                            if (whichBtn === "bg") RankCard = "Background";
                            else if (whichBtn === "bar") RankCard = "BarColor"
                            else RankCard = "BoderColor"

                            const newData = await client.db.UpdateOne('GuildConfig',
                                { Guild: guild.id },
                                {
                                    $set: {
                                        [`RankCard.${RankCard}`]: value
                                    }
                                },
                                { upsert: true });

                            await msg.edit(await rankCard(newData));
                        }
                    }


                    //* Level Up Card Config
                    else if (i.customId.includes("levelupCard:")) {
                        const Theme = Themes[data.Theme];
                        let whichBtn = i.customId.replace("levelupCard:", "");

                        if (whichBtn === "reset") {

                            await i.update({
                                embeds: [new EmbedBuilder(client).setDescription("Wait a sec!")],
                                components: [],
                                files: []
                            });

                            await client.db.UpdateOne('GuildConfig', {
                                Guild: guild.id
                            }, {
                                $set: {
                                    LevelupCard: {
                                        Background: Theme.LevelupCard.Background,
                                        BoderColor: Theme.LevelupCard.BoderColor,
                                        AvatarBoderColor: Theme.LevelupCard.AvatarBoderColor
                                    }
                                }
                            }, { upsert: true });

                            await msg.edit(await levelupCard());

                            return;
                        } else if (whichBtn === "enable") {
                            await i.update(load);

                            const data2 = await i.guild.fetchData();

                            if (data2?.Cards === undefined) {
                                Object.setPrototypeOf(data2, { "Cards": { Rankup: false } })
                            }

                            data2.Cards.RankUp = !data2.Cards.RankUp

                            const UpdatedData = await client.db.UpdateOne('GuildConfig', {
                                Guild: i.guild.id
                            }, {
                                $set: {
                                    [`Cards`]: data2.Cards
                                }
                            }, { new: true, upsert: true })

                            await msg.edit(await levelupCard(UpdatedData));

                            return;
                        }

                        const input_1 = new TextInputBuilder()
                            .setCustomId('levelupCard')
                            .setLabel(whichBtn === "bg" ? "Picture URL" : "Enter Hex Code")
                            .setRequired(true)
                            .setPlaceholder(whichBtn === "bg" ? "Enter Valid Picture URL" : "Enter Hex Code")
                            .setStyle(1).setMaxLength(whichBtn === "bg" ? 300 : 6);

                        const modal = new ModalBuilder().setCustomId('levelupCard').setTitle('Leveling System').addComponents(new ActionRowBuilder().addComponents(input_1));

                        await i?.showModal(modal);

                        const response = await i.awaitModalSubmit({
                            filter: i => i.customId === "levelupCard" && i.user.id === user.id,
                            time: 40 * 1000
                        });

                        /// on modal submit
                        if (response.isModalSubmit()) {
                            let value = response.fields.fields.get("levelupCard").value;

                            if (whichBtn !== "bg" && !/^[A-Fa-f0-9]{6}$/.test(value)) return await response.reply({
                                embeds: [new EmbedBuilder(client).setDescription("!{i} Kindly Provide A Vaild Hex Code. eg: 00ffaa, ffffff, 000000......")],
                                ephemeral: true
                            });

                            if (whichBtn === "bg") {
                                if (!(await isImageURLValid(value))) return await response.reply({
                                    embeds: [new EmbedBuilder(client).setDescription("Kindly Provide A Vaild URL.")],
                                    ephemeral: true
                                });
                            }

                            await response?.update({
                                embeds: [new EmbedBuilder(client).setDescription("Wait a sec!")],
                                components: [],
                                files: []
                            });

                            let uhh;

                            if (whichBtn === "bg") uhh = "Background";
                            else if (whichBtn === "avatar:border") uhh = "AvatarBoderColor";
                            else uhh = "BoderColor";


                            const newData = await client.db.UpdateOne('GuildConfig', {
                                Guild: guild.id
                            }, {
                                $set: {
                                    [`LevelupCard.${uhh}`]: value
                                }
                            }, { upsert: true });

                            await msg.edit(await levelupCard(newData));

                        }

                    }

                }


                /** @param {Object} data * @param {Type} Type */
                async function rewardsRoles(data = data2, Type) {
                    let dis = "*Select a Level Number from the following list to set/update role!*\n";

                    const selectBuilder = new StringSelectMenuBuilder()
                        .setCustomId('level:number:Menu:' + Type)
                        .setPlaceholder('Select level to add or remove!')
                        .setMaxValues(1);

                    const rewardsData = await client.db.Find(Type === "Voice" ? "VoiceLevelRoles" : 'LevelRoles', {
                        Guild: guild.id
                    });

                    let y = 0;

                    for (let i = 5; i <= 100; i += 5) {
                        let LevelData = rewardsData.find(y => y.Level === i)
                        if (LevelData) {
                            y++;
                            dis += `${y}. ${LevelData ? "!{y}" : "!{x}"} | ${i < 10 ? "0" + i : i} | ${LevelData ? roleMention(LevelData.Role) : "Not Set"}\n`.replaceEmojis(client);
                        }
                        selectBuilder.addOptions(new StringSelectMenuOptionBuilder().setLabel(`${i < 10 ? "0" + i : i}`).setDescription(`Menage Role For ${i} Level`).setValue(`number:${i}`).setEmoji(LevelData ? client.emotes.y : client.emotes.x));
                    }

                    const ro = new ActionRowBuilder().addComponents(selectBuilder);
                    const ro2 = new ActionRowBuilder().addComponents(homeBtn);

                    if (rewardsData?.[0]) ro2.addComponents(
                        new ButtonBuilder()
                            .setCustomId("level:rewards:reset:" + Type)
                            .setEmoji(emotes.del)
                            .setLabel("Reset All")
                            .setStyle(2)
                    )

                    let embed = new EmbedBuilder(client)
                        .setDefaultFooter()
                        .setAuthor({
                            name: "LevelUp Rewards",
                            url: "https://youtube.com/@uoaio",
                            iconURL: emoteLink("rewards")
                        }).setDescription(dis).setThumbnail(emoteLink("rewards"));

                    return {
                        components: [ro, ro2],
                        embeds: [embed]
                    };
                }


                async function rankCard(data) {

                    if (!data) data = await i.guild.fetchData();
                    const rankCardData2 = data.RankCard

                    let bgBtn = new ButtonBuilder().setCustomId("rankCard:bg").setStyle(3).setLabel("Background");
                    let boderBtn = new ButtonBuilder().setCustomId("rankCard:boder").setStyle(3).setLabel("Border Color");
                    let barBtn = new ButtonBuilder().setCustomId("rankCard:bar").setStyle(3).setLabel("Bar Color");
                    let rankDataReset = new ButtonBuilder().setCustomId("rankCard:reset").setStyle(2).setLabel("Reset").setEmoji("979818265582899240").setDisabled(rankCardData2 ? false : true);
                    const rankCardRow = new ActionRowBuilder().addComponents(bgBtn, boderBtn, barBtn, rankDataReset);

                    const rank = await new Rank()
                        .setAvatar(user.displayAvatarURL({
                            forceStatic: true,
                            extension: "png"
                        }))
                        .setBackground("image", rankCardData2?.Background && (await isImageURLValid(rankCardData2.Background)) ? rankCardData2.Background : "https://media.discordapp.net/attachments/1041589448523128874/1143180518528131102/image.png?width=694&height=244")
                        .setUsername(user.username)
                        .setBorder(`#${rankCardData2.BoderColor || "000000"}`)
                        .setBarColor(`#${rankCardData2.BarColor || "000000"}`)
                        .setCustomStatus(`#${rankCardData2.BarColor || "000000"}`)
                        .setLevel(5).setRank(2).setCurrentXp(50).setRequiredXp(100)
                        .setOverlayOpacity(0.6).build();

                    const attachment = new AttachmentBuilder(rank, { name: "rankCard.png" })
                    return {
                        embeds: [new EmbedBuilder(client)
                            .setImage("attachment://rankCard.png")
                            .setAuthor({
                                name: "Leveling System",
                            })
                            .setDescription("*Click Following to update RankCard for this server*")
                            .setDefaultFooter()
                            .setColor(`#${rankCardData2.BoderColor || "000000"}`)
                            .setTimestamp()
                        ],
                        files: [attachment],
                        components: [rankCardRow, new ActionRowBuilder().setComponents(homeBtn)]
                    };

                }

                async function levelupCard(data) {

                    if (!data) data = await i.guild.fetchData();
                    const levelUpCardData2 = data.LevelupCard

                    let EnableBtn = new ButtonBuilder().setCustomId("levelupCard:enable").setStyle(data?.Cards?.RankUp ? 2 : 3).setLabel(data?.Cards?.RankUp ? "Disable" : "Enable");
                    let bgBtn = new ButtonBuilder().setCustomId("levelupCard:bg").setStyle(3).setLabel("Background").setDisabled(!data?.Cards?.RankUp);
                    let boderBtn = new ButtonBuilder().setCustomId("levelupCard:boder").setStyle(3).setLabel("Border Color").setDisabled(!data?.Cards?.RankUp);
                    let barBtn = new ButtonBuilder().setCustomId("levelupCard:avatar:border").setStyle(3).setLabel("Avatar Boder Color").setDisabled(!data?.Cards?.RankUp);
                    let rankDataReset = new ButtonBuilder().setCustomId("levelupCard:reset").setStyle(2).setLabel("Reset").setEmoji("979818265582899240").setDisabled(data?.Cards?.RankUp ? false : true);

                    const levelUpCardRow = new ActionRowBuilder().addComponents(bgBtn, boderBtn, barBtn);
                    const levelUpCardRow2 = new ActionRowBuilder().addComponents(homeBtn, rankDataReset, EnableBtn);

                    const card = await new LevelUp()
                        .setAvatar(user.displayAvatarURL({
                            forceStatic: true,
                            extension: "png"
                        }))

                        .setBackground("image", levelUpCardData2?.Background && (await isImageURLValid(levelUpCardData2.Background)) ? levelUpCardData2.Background : "https://i2.wp.com/trumpwallpapers.com/wp-content/uploads/Navy-Blue-Wallpaper-37-1204-x-800.jpg")
                        .setUsername(user.username)
                        .setBorder(`#${levelUpCardData2.BoderColor || "000000"}`)
                        .setAvatarBorder(`#${levelUpCardData2.AvatarBoderColor || "000000"}`)
                        .setOverlayOpacity(0.7).setLevels(50, 51).build();
                    const attachment = new AttachmentBuilder(card, {
                        name: "rank.png"
                    })
                    return {
                        files: [attachment],
                        embeds: [new EmbedBuilder(client)
                            .setImage("attachment://rank.png")
                            .setAuthor({
                                name: "Leveling System",
                            })
                            .setDescription("*Click Following to update Rankup Card for this server!*")
                            .setDefaultFooter()
                            .setColor(`#${levelUpCardData2.BoderColor || "000000"}`)
                            .setTimestamp()
                        ],
                        components: [levelUpCardRow, levelUpCardRow2]
                    };
                }

            });


        collector.on('end', async i => {
            await msg.edit({
                embeds: [new EmbedBuilder(client).setTheme(data.Theme).setDescription("!{skull} **Timeout!** Run Command Again.")],
                files: [],
                content: "",
                components: []
            }).catch(() => { });
        });


    } catch (error) {
        err(error);
    }
};


export default {
    name: "setup-rank",
    category: "Setup",
    cooldown: 5,
    description: "Setup Leveling system",
    aliases: ["set-level", "set-lvl", "rank-setup", "setup-level", "setup-lvl", "set-rank"],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["ManageRoles"]
    },
    run: cmd.run
};

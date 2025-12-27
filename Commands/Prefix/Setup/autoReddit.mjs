import Bot from '../../../src/client.mjs';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import {
    roleMention,
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    ButtonBuilder,
    Message,
    ChannelSelectMenuBuilder,
    ChannelType,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { sanitizeMessage, cache, variables, isImageURLValid, postReddit } from '../../../src/utils/index.mjs';
import e from 'express';

export default {
    ignore: true,
    name: "setup-reddit",
    cooldown: 5,
    description: "Setup auto reddit feed for this server.",
    category: "Setup",
    aliases: ["set-reddit-feed", "setupreddit", "setreddit", "set-reddit", "setup-raddit", "set-raddit", "setup-auto-reddit"],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["ManageRoles", "ManageWebhooks", "ManageMessages"]
    },
    /** 
    *@param {Object} object
    * @param {Message | import('discord.js').Interaction} object.message
    * @param {String[]} object.args
    * @param {Bot} object.client
    * @param {Object} object.Slash
    * @param {Map} object.options
    * @param object.err ErrorHnadler
     */
    run: async ({ message, client, err, Slash, options, guildData }) => {
        try {
            if (Slash && Slash.is) await message.deferReply({ fetchReply: true });
            const cacheKey = `setup:reddit:${message.guild.id}`,
                key = `setup:reddit:${message.guild.id}` // also cache key
            const user = message.author || message.user

            const data = guildData

            let homeBtn = new ButtonBuilder().setCustomId("reddit:home-btn").setStyle(2).setLabel("Back");
            let resetBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:reddit:reset")
                .setStyle(2).setLabel("Reset All")
                .setEmoji("979818265582899240")
                .setDisabled(isdata?.Reddit?.Enable && isdata?.Reddit?.List?.length > 0 ? false : true)

            let addBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:reddit:add")
                .setStyle(3).setLabel("Add Feed")
                // .setEmoji("979818265582899240")
                .setDisabled(isdata?.Reddit?.Enable && isdata?.Reddit?.List?.length < 25 ? false : true)

            let removeBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:reddit:remove:btn")
                .setStyle(4).setLabel("Remove Feed")
                // .setEmoji("979818265582899240")
                .setDisabled(isdata?.Reddit?.Enable && isdata?.Reddit?.List?.length > 0 ? false : true)

            let enableBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:reddit:Enable")
                .setStyle(isdata?.Reddit?.Enable ? 2 : 3)
                .setLabel(`${isdata?.Reddit?.Enable ? "Disable" : "Enable"}`)

            const row = (d = data) => new ActionRowBuilder()
                .addComponents(addBtn(d), removeBtn(d));

            const row2 = (isdata = data) => new ActionRowBuilder()
                .addComponents(enableBtn(isdata), resetBtn(isdata))

            let emebd = (d = data) => {
                let des = "**Setup Auto Reddit Post upto 24**\n*Click The Fllowing Buttons to get started!*\n"

                if (d?.Reddit?.List?.length) {
                    des += "\n!{star} **List Of Reddits**\n"
                    d.Reddit.List.forEach(y => {
                        des += `- **/r/${y.Triger}**\n - <#${y.Channel}>\n`;
                    })
                }

                des += `\n\n> *${(client.getPromotion())?.Message}*`

                return new EmbedBuilder(client)
                    .setTheme(data.Theme)
                    .setAuthor({
                        name: "Reddit Feed",
                        url: `${client.config.Links.Discord}`
                    })
                    .setDescription(des)
                    .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                    .setDefaultFooter()
                    .setTimestamp()
            }

            let msg = await message[Slash?.is ? "safeEdit" : "safeReply"]({
                components: [row(), row2()],
                embeds: [emebd()]
            });

            const collector = msg.createMessageComponentCollector({
                componentType: 0,
                time: 240 * 1000
            })

            collector.on("collect",
                /**
                * @param {import('discord.js').Interaction} i 
                */
                async (i) => {
                    if (i.user.id !== user.id) return await i.safeReply({
                        content: "^{common.no_auth_components}",
                        ephemeral: true
                    });

                    const data2 = await i.guild.fetchData();

                    const load = {
                        content: "",
                        files: [],
                        components: [],
                        embeds: [new EmbedBuilder(client).setTheme(data2.Theme).setDescription("^{common.loading}")]
                    }

                    if (i.customId === "setup:reddit:Enable") {

                        await i.safeUpdate(load);

                        const data3 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $set: {
                                ["Reddit.Enable"]: data2.Reddit.Enable ? false : true
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit(await home(data3))

                        await i.guild.updateData()


                    } else if (i.customId === "setup:reddit:reset") {

                        await i.safeUpdate(load)

                        const data4 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $set: {
                                ["Reddit"]: {
                                    Enable: false,
                                    List: []
                                }
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit({
                            components: [row(false), row2(data4)],
                            embeds: [emebd(data4)]
                        })

                        await i.guild.updateData()

                    } else if (i.customId === "setup:reddit:add") {

                        await i.safeUpdate(load)

                        await msg.safeEdit(await updateAdd())

                    } else if (i.customId === "setup:reddit:remove:btn") {

                        const Select = new StringSelectMenuBuilder()
                            .setCustomId(`setup:reddit:remove:menu`)
                            .setPlaceholder('Dont Make Selection!')

                        data2.Reddit.List.forEach(y => {
                            Select.addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${y.Triger}`)
                                    .setValue(`${y.Triger}`)
                            )
                        })

                        Select.setMinValues(1)
                        Select.setMaxValues(data2.Reddit.List.length)

                        await i.safeUpdate({
                            embeds: [
                                new EmbedBuilder().setTheme(data2.Theme)
                                    .setDescription("!{star} Select commands from following menu to remove*")
                            ],
                            components: [
                                new ActionRowBuilder().addComponents(Select),
                                new ActionRowBuilder().addComponents(homeBtn)
                            ]
                        })

                    } else if (i.customId === "setup:reddit:remove:menu") {
                        await i.safeUpdate(load)

                        data2.Reddit.List = data2.Reddit.List.filter(y => !i.values.includes(y.Triger))

                        const updated = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id
                        }, {
                            $set: {
                                ['Reddit.List']: data2.Reddit.List
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(await home(updated))
                        await i.guild.updateData()
                    } else if (i.customId === "reddit:set:triger") {
                        //* reddit triger
                        const input_1 = new TextInputBuilder()
                            .setCustomId('content')
                            .setLabel("Enter Something")
                            .setRequired(true)
                            .setPlaceholder("What to want to post eg: discord_irl, funny....")
                            .setStyle(1).setMaxLength(20);

                        const modal = new ModalBuilder().setCustomId('reddit:triger')
                            .setTitle('Reddit Feed')
                            .addComponents(new ActionRowBuilder().addComponents(input_1));

                        await i?.safeShowModal(modal);

                        const response = await i.awaitModalSubmit({
                            filter: i => i.customId === "reddit:triger" && i.user.id === user.id,
                            time: 240 * 1000
                        });

                        /// on modal submit
                        if (response.isModalSubmit()) {
                            let value = response.fields.fields.get("content").value;

                            const cacheData = cache.get(cacheKey)

                            const check = data2?.Reddit?.List.find(y => y.Triger === value.toLowerCase().trim().replace(" ", ""))
                            if (check) return response.safeReply({
                                content: "Reddit Feed With this name already exits",
                                ephemeral: true
                            })
                            cache.set(cacheKey, {
                                ...cacheData,
                                triger: value.toLowerCase().trim().replace(" ", "")
                            });

                            await response.safeUpdate(await updateAdd())
                        }

                    } else if (i.customId === "reddit:set:channel:btn") {
                        // * when someone beings to add channel
                        const ChannelSelect = new ChannelSelectMenuBuilder()
                            .setChannelTypes(ChannelType.GuildText)
                            .setCustomId(`reddit:set:channel:menu`)
                            .setPlaceholder('Dont Make Selection!')
                            .setMaxValues(1);

                        const Embed = new EmbedBuilder().setTheme(data?.Theme)
                            .setTitle("Select Roles")
                            .setDefaultFooter()
                            .setDescription("!{star} **Select a channel from the following menu!**")

                        const channelRow = new ActionRowBuilder()
                            .addComponents(ChannelSelect)

                        await i.safeUpdate({
                            embeds: [Embed],
                            components: [channelRow]
                        })
                    } else if (i.customId === "reddit:set:channel:menu") {
                        //* when someone select channel of reddit
                        const d = cache.get(cacheKey) || {};
                        await i.safeUpdate(load);
                        try {
                            const web = await message.guild.channels.cache.get(i.values[0])?.createWebhook({
                                name: `Reddit - ${client.user.username}`,
                                avatar: message.guild.iconURL(),
                                reason: "For Reddit Feeds"
                            })

                            const key = `Webhook:${message.guild.id}:${web.id}`
                            await cache.delete(key)

                            const ccoptions = { ...d, channel: i.values[0], Webhook: { id: web.id, token: web.token } };

                            cache.set(cacheKey, ccoptions)
                            await msg.safeEdit(await updateAdd())
                        } catch (e) {
                            await msg.safeEdit({ content: e.message, embeds: [], components: [] })
                        }

                    } else if (i.customId === "reddit:set:save") {
                        const data = cache.get(cacheKey);
                        const nsfwords = nsfwWords;
                        if (data.filter && !nsfwords.includes(data.triger)) {
                            return await i.safeReply({
                                ephemeral: true,
                                embeds: [
                                    new EmbedBuilder().setTheme(data2.Theme)
                                        .setDescription(`Kindly provide one of the following words to set nsfw feed\n\n\`\`\`yml\n${nsfwords.map(y => y).join(", ")}\`\`\``)
                                ]
                            })
                        }
                        await i.safeUpdate(load)

                        data2.Reddit.List.push({
                            Triger: data.triger,
                            Channel: data.channel,
                            Webhook: data.Webhook,
                            Type: data.type,
                            Filter: data.filter // nsfw filter 
                        })

                        const updated = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id
                        }, {
                            $set: {
                                ['Reddit.List']: data2.Reddit.List
                            }
                        }, { upsert: true, new: true })

                        msg.safeEdit({
                            embeds: [
                                new EmbedBuilder().setTheme(updated.Theme).setDescription(`!{y} Successfully added to reddit feed!`)
                            ]
                        })

                        await i.guild.updateData();

                        // post feed after saving data
                        await postReddit(i.guild)

                        cache.delete(cacheKey)
                    } else if (i.customId === "reddit:home-btn") await i.safeUpdate(await home())
                    else if (i.customId === "reddit:set:filter") {

                        const Cache = cache.get(key);
                        cache.set(key, { ...Cache, filter: Cache.filter ? false : true });
                        await i.safeUpdate(await updateAdd());

                    } else if (i.customId === "reddit:set:type") {
                        const types = ["New", "Top", "Best", "Hot", "Random"];
                        const Row = new ActionRowBuilder()
                        const Cache = cache.get(key);
                        types.forEach(type => {
                            Row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId("set:redditFeed:type:" + type)
                                    .setLabel(type)
                                    .setStyle(Cache.type === type ? 1 : 2)
                                    .setDisabled(Cache.type === type)
                            )
                        });
                        await i.safeUpdate({
                            embeds: [new EmbedBuilder().setTheme(data2.Theme).setDescription("!{star} Select The Type of Reddit Feed!")],
                            components: [Row]
                        })
                    } else if (i.customId.includes("set:redditFeed:type:")) {
                        const type = i.customId.replace("set:redditFeed:type:", "");
                        const Cache = cache.get(key);
                        cache.set(key, { ...Cache, type });
                        await i.safeUpdate(await updateAdd())
                    }


                    //* Go to main page
                    async function home(data) {
                        if (!data) data = await i.guild.fetchData()
                        return {
                            files: [],
                            embeds: [emebd(data)],
                            content: "",
                            components: [row(data), row2(data)]
                        };
                    }

                    async function updateAdd(/*data*/) {
                        // if (!data) data = await i.guild.fetchData()

                        const cacheData = cache.get(cacheKey) || cache.set(cacheKey, { type: "Random", filter: false })

                        const ccOptions = {
                            triger: "Not Set",
                            channel: "Not Set",
                            filter: false,
                            type: "Random",
                            ...cacheData
                        }

                        const Triger = new ButtonBuilder()
                            .setCustomId("reddit:set:triger")
                            .setStyle(2).setLabel("Set Sub Reddit")

                        const SetChannel = new ButtonBuilder()
                            .setCustomId("reddit:set:channel:btn")
                            .setStyle(2).setLabel("Set Channel")

                        const nsfwFilter = new ButtonBuilder()
                            .setCustomId("reddit:set:filter")
                            .setStyle(ccOptions.filter ? 4 : 2).setLabel("Toggle Nsfw Filter")

                        const type = new ButtonBuilder()
                            .setCustomId("reddit:set:type")
                            .setStyle(2).setLabel("Set Reddit Type")

                        const Save = new ButtonBuilder()
                            .setCustomId("reddit:set:save")
                            .setStyle(3).setLabel("Save")
                            .setDisabled(ccOptions.triger === "Not Set" || ccOptions.channel === "Not Set" ? true : false)

                        const ccRow = new ActionRowBuilder()
                            .addComponents(Triger, SetChannel)
                        const ccRow3 = new ActionRowBuilder()
                            .addComponents(nsfwFilter, type)
                        const ccRow2 = new ActionRowBuilder()
                            .addComponents(homeBtn, Save)


                        const Embed = new EmbedBuilder().setTheme(data?.Theme)
                            .setTitle("Add Reddit Feed Command")
                            .setDescription(`!{dot} Feed: ${ccOptions.triger}\n!{dot} Channel: ${ccOptions.channel === "Not Set" ? "Not Set" : `<#${ccOptions.channel}>`}\n!{dot} Type: ${ccOptions.type}\n!{dot} Nsfw Filter: ${ccOptions.filter ? "Nsfw Only" : "Not Set"}`)
                            .setDefaultFooter()

                        return {
                            files: [],
                            content: "",
                            embeds: [Embed],
                            components: [ccRow, ccRow3, ccRow2]
                        }

                    }
                });


            collector.on('end', async i => {
                await msg.safeEdit({
                    embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{common.timeout}")],
                    files: [],
                    content: "",
                    components: []
                }).catch(() => { })
            });


        } catch (error) {
            err(error)
        }
    }
};

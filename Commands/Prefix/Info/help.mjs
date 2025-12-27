import { ActionRowBuilder, ApplicationCommand, ButtonBuilder, Collection, Message, PermissionsBitField, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js"
import { EmbedBuilder, cache, number } from "../../../src/utils/index.mjs";

/** @type {import("../../../src/utils/Command.mjs").prefix} */
export default {
    name: "help",
    description: "Get list of commands!",
    cooldown: 5,
    aliases: ["h", "commands"],
    category: "General",

    run: async ({ message, client, err, options, guildData }) => {
        try {
            const user = message?.author || message.user
            let slashCmds;
            const key = "SlashCommands"
            const Cache = cache.get(key);
            if (Cache) slashCmds = Cache;
            else slashCmds = await client.application.commands.fetch();

            let countUserCmd = 0;

            const getSlashMention = (query) => {
                /** @type {ApplicationCommand} */
                const cmd = slashCmds.find((c) => c.name === query);
                let array = [];
                if (cmd?.options?.length > 0) {
                    const sub = cmd.options.filter(y => y.type === 1);
                    const group = cmd.options.filter(y => y.type === 2);
                    if (sub.length > 0) {
                        for (const y of sub) {
                            array.push(
                                `</${cmd.name} ${y.name}:${cmd.id}>`
                            )
                        }
                    }

                    if (group.length > 0) {
                        for (const y of group) {
                            const groupSub = y.options.filter(a => a.type === 1);
                            if (groupSub.length > 0) {
                                for (const x of groupSub) {
                                    array.push(
                                        `</${cmd.name} ${y.name} ${x.name}:${cmd.id}>`
                                    )
                                }
                            }
                        }
                    }
                }
                if (array.length === 0) array.push(`</${cmd.name}:${cmd.id}>`)
                return array;
            }

            const sperator = "︲"
            /** @type {Collection<String, import("../../../src/utils/Command.mjs").prefix[] | import("../../../src/utils/Command.mjs").interaction[]>} categories */
            const categories = client.categories;

            const { commands, slashCommands } = client
            const totalCmds = commands.map(a => a).length + slashCommands.map(a => a).length;


            /** @type {EmbedBuilder[]} */
            let embeds = []
            console.log("HELP CMD DEBUG:");
console.log("User ID:", user.id);
console.log("Owners:", client.config.Owners);
            for (const [cat, cmds] of categories) {
                if (cat === "OwnerOnly" && !client?.config?.Owners?.includes(user.id)) continue;
                const embed = new EmbedBuilder()
                    .setTheme(guildData.Theme)
                    .setAuthor({
                        name: `${cat} Commands`,
                        iconURL: client.user.displayAvatarURL()
                    });

                const slashCmds = cmds.filter(c =>
                    c.data && message.member.permissions.has(PermissionsBitField.resolve(c?.data?.default_member_permissions || [])) && c.data instanceof SlashCommandBuilder)
                    .map((cmd) => getSlashMention(cmd.data.name).join(sperator));
                // console.log(slashCmds)

                const prefixCmds = cmds.filter(c => !c?.data && message.member.permissions.has(PermissionsBitField.resolve(c?.permissions?.user || [])))
                    .sort((a, b) => a.name.localeCompare(b?.name)).map((cmd) => `\`${cmd.name}\``);

                countUserCmd += slashCmds.length + prefixCmds.length;

                let dis = ""
                if (prefixCmds.length > 0) dis += `!{star}**Prefix**:\n ${prefixCmds.join(sperator)}`;
                if (slashCmds.length > 0) dis += `\n\n!{star}**Slash**:\n${slashCmds.join(sperator)}`;

                if (dis) embeds.push(embed.setDescription(dis));

            }



            // first main page 🏆
            let em1 = new EmbedBuilder()
                .setTheme(guildData.Theme)
                .setThumbnail(client.user.displayAvatarURL())
                .setAuthor({ name: `${client.user.username}\'s Help Menu`, iconURL: client.user.displayAvatarURL({ format: "png" }) })
                .setDescription(`^{command.help.description}`)
                .setFields([
                    { name: `!{star} Stats`, value: `- Ping: ${Math.floor(client.ws.ping)}ms\n- Guilds: ${client.guilds.cache.size}\n- Members: ${number.abbreviate(totalMembers)}`, inline: false }
                ])

            let customCommand = new EmbedBuilder()
                .setTheme(guildData.Theme)
                .setAuthor({
                    name: `Custom Commands`,
                    iconURL: client.user.displayAvatarURL({ format: "png" }),
                })
                .setDescription(`!{star} Prefix Commands (Prefix: ${guildData.CustomCommands.Prefix}):\n ${guildData.CustomCommands.List.length > 0
                    ? guildData.CustomCommands.List.map(c => `\`${c.Triger}\``).join(sperator)
                    : "*^{command.help.no_custom_command}*"}\n\n!{star} Role Commands (Prefix: ${guildData.RolesCommands.Prefix}):\n ${guildData.RolesCommands.List.length > 0
                        ? guildData.RolesCommands.List.map(c => `\`${c.Triger}\``).join(sperator)
                        : "*^{command.help.no_role_command}*"}`);

            embeds.push(customCommand);

            let
                startButton = new ButtonBuilder()
                    .setStyle(2)
                    // .setEmoji(`${client.emotes.Arrows.left}`)
                    .setEmoji("⏪")
                    .setCustomId('start'),
                backButton = new ButtonBuilder()
                    .setEmoji("◀️")
                    .setStyle(2)
                    // .setEmoji(`${client.emotes.Arrows.back}`)
                    .setCustomId('back'),
                forwardButton = new ButtonBuilder()
                    .setEmoji("▶️")
                    .setStyle(2)
                    // .setEmoji(`${client.emotes.Arrows.forward}`)
                    .setCustomId('forward'),
                endButton = new ButtonBuilder()
                    .setStyle(2)
                    .setEmoji("⏩")
                    // .setEmoji(`${client.emotes.Arrows.right}`)
                    .setCustomId('end')

            const options = []

            const option1 = { label: 'Owerview', value: '0' }

            options.unshift(option1);

            for (const index in embeds) {
                embeds[index].setTheme(guildData.Theme).setFooter({ text: `Page: ${Number(index) + 1}/${embeds.length}`, iconURL: client.embed.footericon });

                options.push(
                    {
                        value: `${Number(index) + 1}`,
                        label: embeds[index].embed.data.author.name.replace(" Commands", "")
                    }
                )
            }

            let menu = new StringSelectMenuBuilder()
                .setPlaceholder('Change page')
                .setCustomId('pagMenu')
                .addOptions(options)
                .setMaxValues(1)
                .setMinValues(1)

            const allButtons = [
                startButton.setDisabled(true),
                backButton.setDisabled(true),
                forwardButton.setDisabled(false),
                endButton.setDisabled(false)
            ]

            let group1 = new ActionRowBuilder().addComponents(menu)
            let group2 = new ActionRowBuilder().addComponents(allButtons)

            embeds.unshift(em1);


            /**
             * @type {Message}
            */
            let helpMessage = await message.safeReply({
                content: `^{common.pageContent}`,
                embeds: [em1],
                components: embeds.length > 1 ? [group2, group1] : [],
            });

            const collector = helpMessage.createMessageComponentCollector({ time: 240e3, componentType: 0, });


            let currentPage = 0;

            collector.on('collect', async (b) => {
                if (b.user.id !== (message?.author?.id || message?.user?.id))
                    return b.safeReply({
                        content: `**You Can't Use it\n**`,
                        ephemeral: true
                    });
                switch (b.customId) {
                    case 'start':
                        currentPage = 0
                        group2 = new ActionRowBuilder().setComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)])
                        b.safeUpdate({ embeds: [embeds[currentPage]], components: [group2, group1] })
                        break;
                    case 'back':
                        --currentPage;
                        if (currentPage === 0) { group2 = new ActionRowBuilder().setComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
                        b.safeUpdate({ embeds: [embeds[currentPage]], components: [group2, group1] })
                        break;
                    case 'forward':
                        currentPage++;
                        if (currentPage === embeds.length - 1) { group2 = new ActionRowBuilder().setComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
                        b.safeUpdate({ embeds: [embeds[currentPage]], components: [group2, group1] })
                        break;
                    case 'end':
                        currentPage = embeds.length - 1;
                        group2 = new ActionRowBuilder().setComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)])
                        b.safeUpdate({ embeds: [embeds[currentPage]], components: [group2, group1] })
                        break;
                    case 'pagMenu':
                        currentPage = parseInt(b.values[0])
                        if (currentPage === 0) { group2 = new ActionRowBuilder().setComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)]) } else if (currentPage === embeds.length - 1) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
                        b.safeUpdate({ embeds: [embeds[currentPage]], components: [group2, group1] })
                        break;
                    default:
                        currentPage = 0
                        b.safeUpdate({ embeds: [embeds[currentPage]], components: null })
                        break;
                }
            });

            collector.on('end', collected => {
                helpMessage.safeEdit({
                    embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{common.timeout}")],
                    files: [],
                    content: "",
                    components: []
                })
            });

        } catch (e) { err(e) }
    },
};

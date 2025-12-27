import ems from "enhanced-ms"
import guildConfig from "../../Models/GuildConfig.mjs"
import Parser from 'rss-parser'
import { EmbedBuilder, addSuffix, containsDiscordInvite, containsLink, logModWebhook, logger, sanitizeMessage } from "../index.mjs";
import Bot from "../../client.mjs";
import moment from "moment-timezone";

const parser = new Parser({
    timeout: 1000
})

export * from "./Command.mjs";
export * from './CustomCommands.mjs';
export * from './Level.mjs';
export * from './Counting.mjs'
export * from './tod.mjs'
export * from './ReactionRoles.mjs'
export * from './JoinToCreate.mjs'
export * from './Ticket.mjs'

/**@type {BasicParamHandler} */
export const AutoDelete = (message, data) => {
    if (!data?.AutoDelete?.Enable || data?.AutoDelete?.List?.length === 0) return;

    const AutoDeleteData = data.AutoDelete?.List.find(y => y.Channel === message.channelId);
    if (!AutoDeleteData) return;

    const msg = message;
    if (message.deletable) setTimeout(async () => await msg.delete(), ems(AutoDeleteData.Time))
}

/**@type {BasicParamHandler} */
export const WordReactHandler = async (message, data) => {
    try {
        if (data?.WordReact?.List?.length === 0) return;
        const WordReactData = data.WordReact?.List.find(y => y.trigger.toLowerCase() === message.cleanContent.toLowerCase());
        if (!WordReactData) return;

        message.react(WordReactData.emoji).catch(() => {});


    } catch (e) {
        logger(e, "error")
    }
}
/**@type {BasicParamHandler} */
export const StickyMessagesHandler = async (message, data) => {
    try {
        if (!data?.StickyMessages?.Enable || data?.StickyMessages?.List?.length === 0) return;
        const StickyMessagesData = data.StickyMessages?.List.find(y => y.Channel === message.channelId);
        if (!StickyMessagesData) return;

        const stickyData = await message.client.db.FindOne('StickyMessages', {
            Guild: message.guildId,
            ChannelID: message.channelId
        });


        if (stickyData) message.channel.messages.cache.get(stickyData.MessageID)?.delete().catch(() => { });

        message.channel.send({
            content: StickyMessagesData.Message,
            allowedMentions: { parse: ["users", "roles", "everyone"] }
        }).then(async msg => {
            await message.client.db.UpdateOne('StickyMessages', {
                Guild: message.guildId,
                ChannelID: message.channelId,
            }, {
                $set: {
                    MessageID: msg.id
                }
            }, { upsert: true, new: true })

        }).catch(() => "")

    } catch (e) {
        logger(e, "error")
    }
}

/**@type {BasicParamHandler} */
export const GhostPingHandler = async (message, data) => {
  try {
    // ===== BASIC SAFETY CHECKS =====
    if (!message) return;
    if (message.partial) return;
    if (!message.guild) return;
    if (!message.content) return;
    if (message.author?.bot || message.system) return;

    // ===== CONFIG CHECK =====
    if (!data?.AutoMod?.Enable) return;
    if (!data?.AutoMod?.Anti?.Ghostping) return;

    // ===== MENTIONS SAFETY =====
    if (!message.mentions) return;

    const members = message.mentions.members ?? new Map();
    const roles = message.mentions.roles ?? new Map();
    const everyone = Boolean(message.mentions.everyone);

    // ===== NO PINGS? EXIT =====
    if (!members.size && !roles.size && !everyone) return;

    // ===== IGNORE SELF PING =====
    if (members.size === 1 && members.has(message.author.id)) return;

    // ===== LOG GHOST PING =====
    const web = await logModWebhook(message.guild);
    if (!web) return;

    await web.send({
      embeds: [
        new EmbedBuilder()
          .setColor("DarkGrey")
          .setAuthor({ name: "Ghost Ping Detected" })
          .setDescription(
            `**Message:**\n${sanitizeMessage(message.content)}\n\n` +
            `**Author:** ${message.author.tag} \`${message.author.id}\`\n` +
            `**Channel:** ${message.channel.toString()}`
          )
          .addFields(
            {
              name: "Members",
              value: members.size.toString(),
              inline: true,
            },
            {
              name: "Roles",
              value: roles.size.toString(),
              inline: true,
            },
            {
              name: "Everyone?",
              value: everyone ? "Yes" : "No",
              inline: true,
            }
          )
          .setFooter({ text: `Sent at: ${message.createdAt}` }),
      ],
    });

  } catch (e) {
    logger(e, "error");
  }
};

/**@type {BasicParamHandler} */
export const MessageModeHandler = (message, data) => {
    try {
        if (!message || !message.author) return;

if (
  message.author.bot ||
  message.system ||
  message.webhookId
) return;
        if (!data?.MessageModes?.List || !data.MessageModes.List.length) return;

        const MessageModeData = data.MessageModes.List.find(c => c.Channel === message.channelId);
        if (!MessageModeData) return;
        const { Channel, Type } = MessageModeData;

        if (Type === "Link" && !containsLink(message.cleanContent)) return message.delete().catch(() => { });
        else if (Type === "Image" && !message.attachments.size) return message.delete().catch(() => { });
        else if (Type === "DiscordInvites" && !containsDiscordInvite(message.cleanContent)) return message.delete().catch(() => { });

    } catch (e) {
        logger(e, "error")
    }
}

/**
 * @param {Bot} client  
 * @param {guildConfig[]} allData
 */
export const BirthdayHandler = async (client, allData) => {
    try {
        const now = new Date();
        const lastDate = await client.db.FindOne('Developer', { Action: "Birthday" });

        let month = now.getMonth() + 1;
        let day = now.getDate();
        let year = now.getFullYear();

        if (month < 10) month = `0${month}`;
        if (day < 10) day = `0${day}`;

        const dataNow = `${year}-${month}-${day}`;

        if (lastDate) {
            if (lastDate.Date === dataNow) return;

            await client.db.UpdateOne('Developer',
                { Action: "Birthday" }, { Date: dataNow });
        } else {
            await client.db.Create('Developer', {
                Action: "Birthday",
                Date: dataNow
            })
        }


        const results = await client.db.Find('GuildMember',
            { Birthday: dataNow });

        if (!results.length) return;

        for (const result of results) {
            if (!result) continue;
            const { Guild, User, Birthday } = result;
            const guild = client.guilds.cache.get(Guild);
            if (!guild) continue;

            const member = guild.members.cache.get(User);
            if (!member) continue;

            const data = allData.find(g => g.Guild == guild.id);

            if (!data) continue;
            if (!data?.Birthday?.Enable) continue;
            if (!data?.Birthday?.Channel) continue;

            const channel = guild.channels.cache.get(data.Birthday.Channel);
            if (!channel) continue;

            channel.safeSend({
                embeds: [
                    new EmbedBuilder()
                        .setTheme(data.Theme)
                        .setAuthor({
                            name: `^{handler.birthday.message} ${member.user.displayName || member.user.username}!`
                        })
                        .setDescription(`${data.Birthday.Message.replaceAll("{user:mention}", `${member}`) || `${member.user} ^{handler.birthday.message}! `}`)
                        .setFooter({ text: `Birthday: ${Birthday}` })
                ]
            }).catch(() => { });

        }

        setTimeout(() => BirthdayHandler(client), 10000);

    } catch (E) {
        logger(E, "error")
    }
}

/**
 * @param {Bot} client
 * @param {guildConfig[]} data array of data
 */
export const AutoAnnounceHandler = async (client, data) => {
    try {
        data = data.filter((guild) => guild?.AutoAnnounce?.List?.length);
        if (!data.length) return;

        for (const guildData of data) {
            const now = moment().tz(guildData?.AutoAnnounce?.Timezone || "Europe/Berlin").format("HH:mm");
            const matchingAnnouncements = guildData.AutoAnnounce.List.filter(c => `${Number(c.Time) < 10 ? `0${c.Time}` : c.Time}:00` === now);
            if (!matchingAnnouncements.length) continue;

            for (const announcementItem of matchingAnnouncements) {
                const channel = client.channels.cache.get(announcementItem.Channel);
                if (channel) channel.safeSend(announcementItem.Message).catch(() => "");
            }

        }
    } catch (e) {
        logger(e, "error")
    }
}

/**
 * @param {Bot} client  
 * @param {guildConfig[]} allData
 */
export const SocialMediaHandler = async (client, allData) => {
    try {

        allData = allData.filter((guild) => guild?.AutoFeed?.List?.length);
        if (!allData || !allData.length) return;

        for (const data of allData) {
            for (const feed of data.AutoFeed.List) {
                let { Type, ID, Message, Channel } = feed;
                Type = Type.toLowerCase();
                if (!Message) Message = "New Feed By **{author}**\n{url}"

                let fetchData = {
                    fetched: false,
                    title: "",
                    author: "",
                    url: "",
                    id: "",
                    isoDate: ""
                }

                try {

                    if (Type === "youtube") {
                        const res = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${ID}`).catch(() => "");
                        if (!res) continue;

                        const lastFeed = res.items.shift()

                        fetchData.id = lastFeed.id;
                        fetchData.author = lastFeed.author;
                        fetchData.title = lastFeed.title;
                        fetchData.url = lastFeed.link
                        fetchData.isoDate = lastFeed.isoDate
                        fetchData.fetched = true
                    }

                    else if (Type === "twitch") {
                        const res = await parser.parseURL(`https://twitchrss.appspot.com/vod/${ID}`);

                        const lastFeed = res.items.shift()

                        fetchData.id = lastFeed.id;
                        fetchData.author = ID;
                        fetchData.title = lastFeed.title;
                        fetchData.url = lastFeed.link
                        fetchData.isoDate = lastFeed.isoDate
                        fetchData.fetched = true
                    }

                    if (!fetchData.fetched) continue;

                    const isLastFeedSame = await client.db.FindOne('AutoFeed', {
                        Guild: data.Guild,
                        SocialMedia: Type,
                        LastFeed: fetchData.url
                    })

                    if (!isLastFeedSame) {
                        const chaneel = client.channels.cache.get(Channel);
                        if (chaneel) await chaneel.send({
                            content: Message.replace("{url}", fetchData.url)
                                .replaceAll("{author}", fetchData.author)
                                .replaceAll("{title}", fetchData.title)
                        }).catch(() => { });
                    }

                    await client.db.Create('AutoFeed', {
                        Guild: data.Guild,
                        SocialMedia: Type,
                        LastFeed: fetchData.url
                    });


                } catch (E) { };

            }
        }

    } catch (E) {
        logger(E, "error")
    }
}

/**
* @typedef {function(import("discord.js").Message | import("discord.js").Interaction, guildConfig)} BasicParamHandler
*/

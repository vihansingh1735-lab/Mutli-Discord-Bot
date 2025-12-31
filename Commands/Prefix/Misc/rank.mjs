import { EmbedBuilder, isImageURLValid } from "../../../src/utils/index.mjs";
import canvafy from "canvafy";
const { Rank } = canvafy
import { Level } from "../../../src/utils/index.mjs";
/**@type {import('../../../src/utils/Command.mjs').prefix} */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = import("discord.js");
export default {
    name: "rank",
    description: "Show's you the your rank in this server",
    category: "Rank",
    cooldown: 5,
    aliases: ["level", "lvl", "xp"],
    options: [
        {
            type: "user",
            name: "@User",
            id: "user",
            required: false
        }
    ],
    run: async ({ message, client, err, Slash, options, guildData }) => {
        try {

            const target = Slash?.is ? options.getUser('user') || message.user : options.get("user") || message.author;

            const { guild } = message;


            if (guildData?.Levels == true) {
const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("rank_refresh")
    .setLabel("Refresh")
    .setStyle(ButtonStyle.Primary)
);
                if (target.bot) return await message.safeEdit({
                    embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{common.bot_selected}")]
                });

                const user = await client.lvl.fetchLevels({ user: target, guild });

                if (!user?.xp) return {
                    embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{command.rank.noxp}")],
                    components: [row]
                };

                const embed = new EmbedBuilder().setAuthor({
                    name: target.username
                })
                    .addFields([
                        {
                            name: "Text",
                            value: `- Level: ${user.level}\n- Rank: ${user.position}\n- XP: ${user.xp}/${Level.xpFor(user.level + 1)}`,
                            inline: true
                        }
                    ])

                if (user.Voice.xp) embed.addFields({
                    name: "Voice",
                    value: `- Level: ${user.Voice.level}\n- Rank: ${user.Voice.position || "NaN"}\n- XP: ${user.Voice.xp}/${Level.xpFor(user.Voice.level + 1)}`,
                    inline: true
                })

                await message.safeReply({
                    embeds: [embed]
                })



            } else {
                await msg.safeReply({
                    embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{command.rank.disabled}")]
                });
            };


        } catch (error) {
            err(error)
        }
    }
};

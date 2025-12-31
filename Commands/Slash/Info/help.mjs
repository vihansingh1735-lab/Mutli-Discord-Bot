import { SlashCommandBuilder } from "discord.js";
import EmbedBuilder from "../../../src/utils/classes/EmbedBuilder.mjs";

/** @type {import('../../../src/utils/Command.mjs').interaction} */
export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get the list of commands!")
    .setDMPermission(false),

  category: "General",
  cooldown: 10,

  run: async ({ interaction, client, err, guildData }) => {
    try {
      // ✅ SAFETY: defer only if not already done
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      // ✅ FINAL RESPONSE (SLASH SAFE)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder(client)
            .setTitle("📖 Help Menu")
            .setDescription(
              "Use the slash commands below to interact with the bot.\n\n" +
              "Example:\n" +
              "`/help` – Show this menu\n" +
              "`/ping` – Check bot latency\n" +
              "`/info` – Bot information"
            )
            .setColor("Blurple")
            .setFooter({
              text: guildData?.Name || interaction.guild.name
            })
            .setTimestamp()
        ]
      });

    } catch (error) {
      console.error(error);

      // ✅ FAILSAFE RESPONSE
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "⚠️ Something went wrong while executing this command.",
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          content: "⚠️ Something went wrong while executing this command."
        });
      }

      err(error);
    }
  }
};

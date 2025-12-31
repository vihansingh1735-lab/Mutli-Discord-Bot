import { logger } from "../../utils/index.mjs";
export default {
  name: "interactionCreate",

  run: async (client, interaction) => {
    try {
      if (!interaction.guild) return;

      const guildData = await interaction.guild.fetchData();

      // ================= SLASH & CONTEXT =================
      if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
        return await slashHandler(interaction, guildData);
      }

      // ================= BUTTONS =================
      if (interaction.isButton()) {

        // ONE handler must handle ONE button
        if (interaction.customId.startsWith("jtc_")) {
          return await JTC_CoreHandler(interaction, guildData);
        }

        if (interaction.customId.startsWith("rr_")) {
          return await ReactionRoleHandler(interaction, guildData);
        }

        if (interaction.customId.startsWith("ticket_")) {
          return await TicketCoreHandler(interaction, guildData);
        }

        // fallback
        return interaction.reply({
          content: "❌ Unknown button.",
          ephemeral: true
        });
      }

      // ================= MODALS =================
      if (interaction.isModalSubmit()) {

        if (interaction.customId.startsWith("ticket_")) {
          return await TicketCoreHandler(interaction, guildData);
        }

        return interaction.reply({
          content: "❌ Unknown modal.",
          ephemeral: true
        });
      }

    } catch (err) {
      logger(err, "error");

      // SAFETY REPLY
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "⚠️ Something went wrong.",
          ephemeral: true
        });
      }
    }
  }
};

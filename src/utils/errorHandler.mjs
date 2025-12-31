import EmbedBuilder from "./classes/EmbedBuilder.mjs";
import { logger } from "./index.mjs";

import(`colors`);
export { slash, msg };

// function slash
function slash(interaction, error) {
  const { client } = interaction;
  error.message += `- ${client.user.username}`;
  logger(error, "error");

  let embed = new EmbedBuilder(client)
    .setColor("wrongcolor")
    .setAuthor({
      name: `An error has occured! Try again later!`,
      url: "https://www.youtube.com/@Xyntr1xGG",
    });

  interaction.safeReply({ embeds: [embed], ephemeral: true }).catch(() => {
    interaction
      .safeEdit({
        embeds: [embed],
        content: "",
        files: [],
        components: [],
      })
      .catch(() => {});
  });
}

function msg(message, error) {
  if (!error) throw "Error Was Not Provided - Prefix Error Handler";
  const { client } = message;
  if (error.message) error.message += `- ${client.user.username}`;
  logger(error, "error");

  let embed = new EmbedBuilder(client)
    .setColor("wrongcolor")
    .setAuthor({
      name: `An error has occured! Try again later!`,
      url: "https://www.youtube.com/@Xyntr1xGG",
    });

  if (message?.author?.id === client.user.id)
    msg.safeEdit({
      embeds: [embed],
      content: "",
      files: [],
      components: [],
    });
  else
    message
      .safeReply({
        embeds: [embed],
      })
      .catch(() => {});
}

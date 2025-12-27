import { EmbedBuilder, Role } from "discord.js";
import axios from "axios";
import { nsfwWords, redditFeed } from "../../../src/utils/index.mjs";

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
  name: nsfwWords,
  cooldown: 3,
  description: "Get the nsfw roleplay image/gif for {commandName}",
  category: "NSFW",
  run: async ({ message, client, err, args, command }) => {
    try {
      const errMsg = async () =>
        await message.reply({
          embeds: [
            new EmbedBuilder().setDescription(
              client.emotes.x + " Got an error! try again later"
            ),
          ],
        });

      
      const response = await redditFeed(command.name, "Random", true, "real");

      if (!response) return errMsg();

      await message
        .reply({
          content: response,
        })
        .catch((e) => err(e));
    } catch (error) {
      err(error);
    }
  },
};

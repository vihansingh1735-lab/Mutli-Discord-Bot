import { EmbedBuilder, Role } from "discord.js";
import axios from "axios";

const words = [
  "anal",
  "blowjob",
  "cum",
  "fuck",
  "pussylick",
  "solo",
  "solo_male",
  "threesome_fff",
  "threesome_ffm",
  "threesome_mmf",
  "yaio",
  "yuri",
];

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
  name: words,
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

      
      const response = await axios.get(
        `https://purrbot.site/api/img/nsfw/${command.name}/gif`
      );

      if (!response?.data?.link) return errMsg();

      await message
        .reply({
          content: response.data.link,
        })
        .catch((e) => err(e));
    } catch (error) {
      err(error);
    }
  },
};

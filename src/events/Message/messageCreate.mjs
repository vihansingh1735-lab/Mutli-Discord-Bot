import { Message } from "discord.js";
import Bot from "../../client.mjs";

import {
  prefixHandler,
} from "../../utils/handlers/index.mjs";

import { logger, escapeRegex, } from "../../utils/index.mjs";
console.log("PREFIX EVENT FIRED", message.id);
export default {
  name: "messageCreate",
  /**
   * @param {Bot} client - The Discord client.
   * @param {Message} message - The message object.
   */
  run: async (client, message) => {
    try {
      if (message.author.bot || message.system || !message.guild) return;

      const guildData = await message.guild.fetchData();
      const prefix = guildData?.Prefix || client.config.Prefix;
      const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(prefix)})`);
      if (!prefixRegex.test(message.content)) return;

      const [mPrefix] = message.content.match(prefixRegex);
      const args = message.content.slice(mPrefix.length).trim().split(/ +/g);
      const cmd = args.shift().toLowerCase();

      let command =
        client.commands.get(cmd) ||
        client.commands.find((c) => c.aliases && c.aliases.includes(cmd)); //|| client.commands.get(client.aliases.get(cmd));


      return await prefixHandler(message, guildData, {
        cmd,
        command,
        args,
        prefix,
        mPrefix,
      });


    } catch (error) {
      logger(error, "error");
    }
  },
};

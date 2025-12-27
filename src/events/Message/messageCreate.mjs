import { escapeRegex } from "../../utils/index.mjs";
import { prefixHandler } from "../../utils/handlers/index.mjs";

export default {
  name: "messageCreate",
    if (
      message.author?.bot ||
      message.system ||
      message.webhookId ||
      !message.guild
    ) return;

    console.log("PREFIX EVENT FIRED", message.id);

    const guildData = await message.guild.fetchData();
    const prefix = guildData?.Prefix || client.config.Prefix;

    const prefixRegex = new RegExp(
      `^(<@!?${client.user.id}>|${escapeRegex(prefix)})`
    );
    if (!prefixRegex.test(message.content)) return;

    const [mPrefix] = message.content.match(prefixRegex);
    const args = message.content
      .slice(mPrefix.length)
      .trim()
      .split(/ +/g);

    const cmd = args.shift()?.toLowerCase();
    if (!cmd) return;

    const command =
      client.commands.get(cmd) ||
      client.commands.find(c => c.aliases?.includes(cmd));

    if (!command) return;

    await prefixHandler(message, guildData, {
      cmd,
      command,
      args,
      prefix,
      mPrefix,
    });
  }
};

import { escapeRegex } from "../../utils/index.mjs";
import { prefixHandler } from "../../utils/handlers/index.mjs";

export default {
  name: "messageCreate",

  run: async (client, message) => {
    // 🔒 SAFETY CHECKS
    if (
      !message ||
      !message.guild ||
      message.author?.bot ||
      message.system ||
      message.webhookId
    ) return;

    // 🔒 PREVENT DOUBLE PREFIX EXECUTION
if (client._handledMessages?.has(message.id)) return;

if (!client._handledMessages) {
  client._handledMessages = new Set();
}

client._handledMessages.add(message.id);
    
    const guildData = await message.guild.fetchData();
    const prefix = guildData?.Prefix || client.config.Prefix;

    if (!prefix || !message.content) return;

    const prefixRegex = new RegExp(
      `^(<@!?${client.user.id}>|${escapeRegex(prefix)})`
    );

    if (!prefixRegex.test(message.content)) return;

    const [mPrefix] = message.content.match(prefixRegex);

    const args = message.content
      .slice(mPrefix.length)
      .trim()
      .split(/\s+/);

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

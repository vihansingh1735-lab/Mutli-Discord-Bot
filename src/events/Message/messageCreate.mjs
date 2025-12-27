import { escapeRegex } from "../../utils/index.mjs";

export default {
  name: "messageCreate",

  run: async (client, message) => {
    if (
      !message ||
      !message.guild ||
      !message.content ||
      message.author?.bot ||
      message.system ||
      message.webhookId
    ) return;

    // 🔒 ANTI DOUBLE EXECUTION
    if (!client._handledMessages) client._handledMessages = new Set();
    if (client._handledMessages.has(message.id)) return;
    client._handledMessages.add(message.id);

    const guildData = await message.guild.fetchData();
    const prefix = guildData?.Prefix || client.config.Prefix;
    if (!prefix) return;

    const prefixRegex = new RegExp(
      `^(<@!?${client.user.id}>|${escapeRegex(prefix)})`
    );

    if (!prefixRegex.test(message.content)) return;

    const [mPrefix] = message.content.match(prefixRegex);
    const args = message.content.slice(mPrefix.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();
    if (!cmd) return;

    const command =
      client.commands.get(cmd) ||
      client.commands.find(c => c.aliases?.includes(cmd));

    if (!command) return;

    // 🔒 OWNER CHECK
    if (command.ownerOnly && !client.config.Owners.includes(message.author.id)) {
      return message.reply("❌ Owner only command.");
    }

    await command.run({
      client,
      message,
      args,
      guildData,
      err: console.error,
    });

    // 🧹 CLEANUP
    setTimeout(() => {
      client._handledMessages.delete(message.id);
    }, 30_000);
  }
};

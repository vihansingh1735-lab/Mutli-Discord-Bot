export default {
  name: "messageCreate",
  run: async (client, message) => {
    console.log("📩 messageCreate fired:", message.content);
  run: async (client, message) => {
  if (
  message.author.bot ||
  message.system ||
  message.webhookId
) return;

if (
  message.author.bot ||
  message.system ||
  message.webhookId
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

  const cmd = args.shift().toLowerCase();

  const command =
    client.commands.get(cmd) ||
    client.commands.find(c => c.aliases?.includes(cmd));

  if (!command) return;

  return prefixHandler(message, guildData, {
    cmd,
    command,
    args,
    prefix,
    mPrefix,
  });
}

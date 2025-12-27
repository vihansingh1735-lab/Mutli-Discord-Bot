import { EmbedBuilder, escapeRegex, logger, cache, variables } from "../index.mjs";

/**
 *
 * @param {Message} message
 * @param {Object} guildData
 */
export const CustomCommandHandler = async (message, guildData) => {
  try {
    const { client } = message;
    if (message.author.bot || message.system) return;
    if (message.channel.type !== 0) return;

    if (
      !guildData?.CustomCommands?.Enable ||
      !guildData.CustomCommands.List.length
    )
      return;

    const prefix = guildData?.CustomCommands?.Prefix;
    const prefixRegex = new RegExp(`^(${escapeRegex(prefix)})`);

    if (!prefixRegex.test(message.content)) return;

    const [mPrefix] = message.content.match(prefixRegex);
    const args = message.content.slice(mPrefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    const command = guildData.CustomCommands.List.find((y) => y.Triger === cmd);

    if (command) {
      if (command.Roles?.length) {
        let hasRole = false;
        for (const role of command.Roles) {
          if (message.member._roles.includes(role)) {
            hasRole = true;
            break;
          }
        }

        if (!hasRole)
          return await message
            .safeReply({
              content: "^{common.no_user_perm}"
            })
            .then((msg) => {
              setTimeout(() => {
                msg.delete().catch((e) => {
                  console.log(String(e).grey);
                });
              }, 6000);
            });
      }

      const Response = JSON.parse(
        variables.Replace(JSON.stringify(command.Response), message.member)
      );

      await message.safeReply(Response).catch(() => { });
      return true;
    }
  } catch (error) {
    logger(error, "error");
  }
};

/**@type {import("./index.mjs").BasicParamHandler} */
export const RoleCommandHandler = async (message, guildData) => {
  try {
    if (!message || !message.author) return;

if (
  message.author.bot ||
  message.system ||
  message.webhookId
) return;

    if (
      !guildData.RolesCommands.List.length
    ) return;

    const prefix = guildData?.RolesCommands?.Prefix;
    const prefixRegex = new RegExp(`^(${escapeRegex(prefix)})`);

    if (!prefixRegex.test(message.content)) return;

    const [mPrefix] = message.content.match(prefixRegex);
    const args = message.content.slice(mPrefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    const command = guildData.RolesCommands.List.find((y) => y.Triger === cmd);

    if (command) {
      if (command.ModRoles?.length) {
        let hasRole = false;
        const MemberRoles = message.member.roles.cache
        for await (const role of command.ModRoles) {
          if (MemberRoles.has(role)) {
            hasRole = true;
            break;
          }
        }

        if (!hasRole)
          return await message
            .safeReply({
              embeds: [
                new EmbedBuilder()
                  .setTheme(guildData.Theme)
                  .setTimestamp()
                  .setTitle("Dont Have Permisson")
                  .setDefaultFooter()
                  .setDescription(
                    `^{handler.custom_command.roles_missing} \n\n!{star} **Roles:**\n${command.ModRoles.map(
                      (r) => `<@&${r}>`
                    ).join(", ")}`
                  ),
              ],
            })
            .then((msg) => {
              setTimeout(() => {
                msg.delete().catch((e) => {
                  console.log(String(e).grey);
                });
              }, 6000);
            });
      }
      let user;
      const errorMessages = [];
      const syntax = `\`\`\`yml\nSyntax: ${prefix}${command.Triger} <@User/Username/ID>\n\`\`\``;
      if (!args[0])
        return await message.safeReply({
          embeds: [
            new EmbedBuilder().setTheme(guildData.Theme).setDescription(syntax),
          ],
        });
      else {
        const index = 0;
        let userMatch =
          args[index].match(/^<@!?(\d+)>$/) || args[index].match(/^(\d+)$/);

        let Type = `user:`;

        if (userMatch) {
          if (userMatch?.[1] && cache.get(Type + userMatch?.[1]))
            user = cache.get(Type + userMatch[1]);
          else {
            let fetchedUser =
              (await message.guild.members
                .fetch(args[index])
                .catch(() => null)) ||
              message.guild.members.cache.find(
                (u) => u.user.username === args[index]
              );
            if (!fetchedUser)
              errorMessages.push(
                `^{handler.command.invalid_args}. \n${syntax}`
              );
            else {
              user = fetchedUser;
              cache.set(Type + fetchedUser.id, fetchedUser, 150);
            }
          }
        } else {
          let fetchedUser =
            (await message.guild.members
              .fetch(args[index])
              .catch(() => null)) ||
            message.guild.members.cache.find(
              (u) => u.user.username === args[index]
            );
          if (!fetchedUser)
            errorMessages.push(
              `^{handler.command.invalid_args} \n${syntax}`
            );
          else {
            user = fetchedUser;
            cache.set(Type + fetchedUser.id, fetchedUser, 150);
          }
        }
      }

      if (!user || errorMessages.length > 0) {
        const embed = new EmbedBuilder()
          .setTheme(guildData.Theme)
          .setAuthor({
            name: client.user.username,
            iconURL: client.user.displayAvatarURL({
              format: "png",
              dynamic: true,
            }),
          })
          .setTimestamp()
          .setDescription(errorMessages[0])
          .setColor("wrongcolor")
          .setFooter({
            text: "^{handler.command.params_format}",
          });
        await message.safeReply({
          embeds: [embed],
        });
        return;
      }

      const Embed = new EmbedBuilder().setTheme(guildData.Theme);

      const msg = await message.safeReply({
        embeds: [Embed.setDescription("^{common.loading}")],
      });

      const RolesToAddOrRemove = command.Roles;
      let count = 0;
      for (const r of RolesToAddOrRemove) {
        if (user._roles.includes(r)) count++;
      }

      let errCount = RolesToAddOrRemove.length;

      if (count == RolesToAddOrRemove.length) {
        for (const role of RolesToAddOrRemove)
          await user.roles.remove(role).catch(() => {
            errCount = -1;
          });
        await msg.safeEdit({
          embeds: [
            Embed.setDescription(
              `^{handler.custom_command.roles_removed} ${errCount}/${RolesToAddOrRemove.length} Roles from ${user}`.replaceEmojis(
                guildData.Theme
              )
            ),
          ],
        });
      } else {
        for (const role of RolesToAddOrRemove)
          await user.roles.add(role).catch(() => {
            errCount = -1;
          });
        await msg.safeEdit({
          embeds: [
            Embed.setDescription(
              `^{handler.custom_command.roles_added} ${errCount}/${RolesToAddOrRemove.length} Roles to ${user}`.replaceEmojis(
                guildData.Theme
              )
            ),
          ],
        });
      }
    }
  } catch (error) {
    logger(error, "error");
  }
};

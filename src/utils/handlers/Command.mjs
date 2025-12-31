import { EmbedBuilder, logger, webhookLog, escapeRegex, number, cache } from "../index.mjs";
import { msg as ErrorHandler } from '../errorHandler.mjs';
import { msg as MsgCooldown, slash as SlashCooldown } from '../Cooldown.mjs'
import { memberPermissons } from "../member.mjs";
import { PermissionsBitField } from 'discord.js'

/**
 * 
 * @param {import("discord.js").Message} message 
 * @param {Object} cmd 
 * @param {Object} data 
 */
export const prefixHandler = async (message, guildData, { cmd, command, args, prefix, mPrefix }) => {
    //* ==============================< Command Handling >=============================\\	

    const { client } = message;
    const err = (err, i = message) => ErrorHandler(i, err);
    if (message.channel.type !== 0) return;

    //* ==============================< If command doesn't found >=============================\\         

    if (cmd.length === 0) {
        if (mPrefix.includes(client.user.id))
            return message.safeReply({
                // components: [client.linksButtons],
                embeds: [new EmbedBuilder().setTheme(guildData.Theme)
                    .setColor("color")
                    .setDescription(`^{handler.command.mention} **\`${prefix}help\`**`)
                ],
            }).catch(() => { });
        return;
    }

    //* ==============================< If !command return >=============================\\
    if (!command || !command.run) {
        // return message.safeReply({
        //     embeds: [
        //         new EmbedBuilder(client)
        //             .setColor(client.embed.wrongcolor)
        //             .setDescription(`!{i} The command \`${cmd}\` does not exist`)
        //     ]
        // }).then(m => setTimeout(() => m.delete(), 6000));
    }
    if (command) {
        if (guildData.Blacklist?.find(i => i == message.author.id)) {
            return await message.safeReply({
                content: "!{x} You are blacklisted"
            })
        }
        // ==============================< Toggle off >=============================\\
        if (command.toggleOff) {
            return await message.safeReply({
                embeds: [new EmbedBuilder(client)
                    .setDescription(`^{handler.command.disabled}`)
                    .setColor(client.embed.wrongcolor)
                ]
            }).then(msg => {
                setTimeout(() => {
                    msg.delete().catch((e) => {
                        console.log(String(e).grey)
                    })
                }, 6000)
            }).catch((e) => {
                console.log(String(e).grey)
            });
        }
        // ==============================< On Mainenance Mode >============================= \\
        if (command.maintenance) {
            return await message.safeReply({
                content: `^{handler.command.disabled}`
            })
        }
        console.log("OWNERS:", client.config.Owners);
console.log("AUTHOR:", message.author.id);
        // ==============================< Owner Only >============================= \\
        if (command.ownerOnly) {
            const owners = client.config.Owners
            if (!owners.includes(message.author.id)) return await message.safeReply({
                embeds: [new EmbedBuilder(client)
                    .setDescription(`^{handler.command.owner_only}`).setColor(client.embed.wrongcolor)
                ]
            }).then(msg => {
                setTimeout(() => {
                    msg.delete().catch((e) => {
                        console.log(String(e).grey)
                    })
                }, 6000)
            }).catch((e) => {
                console.log(String(e).grey)
            });
        }
        // ==============================< Permissions checking >============================= \\
        if (command.permissions) {
            if (command.permissions.bot || command.permissions.user) {
                if (!message.member.permissions.has(PermissionsBitField.resolve(command.permissions.user || []))) {
                    const userPerms = new EmbedBuilder(client)
                        .setTitle("Permissons")
                        .setDescription(`***${message.author}, ^{handler.command.no_user_perms}***\n\n ${memberPermissons({
                            member: message.member,
                            client,
                            permissions: command.permissions.user
                        }).join("\n")}`)
                        .setColor("wrongcolor")
                        .setDefaultFooter()
                        .setTimestamp()
                    // .setAuthor({
                    //     name: message.guild.name,
                    //     iconURL: message.guild.iconURL({
                    //         dynamic: true
                    //     })
                    // })
                    return message.safeReply({ embeds: [userPerms] })
                }
                if (!message.guild.members.cache.get(client.user.id).permissions.has(PermissionsBitField.resolve(command.permissions.bot || []))) {
                    const botPerms = new EmbedBuilder(client)
                        .setTitle("Permissions")
                        .setDescription(`***${message.author}, ^{handler.command.no_bot_perms}***\n\n ${memberPermissons({
                            member: message.guild.members.me,
                            client,
                            permissions: command.permissions.bot
                        }).join("\n")}`)
                        .setColor("wrongcolor")
                        .setDefaultFooter()
                        .setTimestamp()
                    // .setAuthor({
                    //     name: message.guild.name,
                    //     iconURL: message.guild.iconURL({
                    //         dynamic: true
                    //     })
                    // })
                    return message.safeReply({ embeds: [botPerms] })
                }
            }
        }


        //* ==============================< Options Manager >============================= \\

        const optionsMap = new Map();

        if (command.options) {
            const options = command.options;
            const errorMessages = [];
            const argsMessages = [];
            let maped = `Syntax: ${prefix}${command.name} ${command.options.map(op => `${op.required ? `<${op.name}>` : `[${op.name}]`}`).join(" ")}`;
            if ((!args || !args[0]) && options[0].required && options[0].type !== "attachment") {
                argsMessages.push(maped)
            } else for (let index = 0; index < options.length; index++) {
                const option = options[index];
                if (option.required) {
                    if (!args[index] && option.type !== "attachment") {
                        errorMessages.push(`!{i} Missing **${th(index + 1)}** Parameter\n\`\`\`yml\n${maped}\n\`\`\``);
                        break;
                    } else {
                        if (option.type === "string") {
                            if (option.choices?.length) {
                                const choices = option.choices.map(i => i.toLowerCase());

                                if (!choices.includes(args[index].toLowerCase())) {
                                    errorMessages.push(`^{handler.command.invalid_args} **${th(index + 1)}** Parameter.\n\`\`\`yml\n${maped}\n\`\`\``);
                                } else {
                                    optionsMap.set(option.id, args[index]);
                                }

                            } else optionsMap.set(option.id, args[index])

                        }
                        else if (option.type === "user" || option.type === "member") {
                            await ForUser()
                        } else if (option.type === "role") {
                            await ForRole()
                        } else if (option.type === "channel") {
                            if (isValidChannel(message.guild, args[index])) optionsMap.set(option.id, args[index].match(/^<#(\d+)>$/)[1])
                            else errorMessages.push(`^{handler.command.invalid_args}\n\`\`\`yml\n${maped}\n\`\`\``);
                        } else if (option.type === "number") {
                            if (isNaN(args[index])) errorMessages.push(`^{handler.command.invalid_args}\n\`\`\`yml\n${maped}\n\`\`\``);
                            else {
                                if ((option.max && args[index] > option.max) ||
                                    (option.min && args[index] < option.min)) {
                                    errorMessages.push(`^{handler.command.amoung_number} ${option.min ?? 0}-${option.max ?? `Infinte`} \n\`\`\`yml\n${maped}\n\`\`\``);
                                } else {
                                    optionsMap.set(option.id, args[index])
                                }
                            }

                        } else if (option.type === "attachment") {
                            if (option.required) {
                                if (!message.attachments || message.attachments.size === 0) {
                                    errorMessages.push(`!{i} Missing **${th(index + 1)}** Parameter\n\`\`\`yml\n${maped}\n\`\`\``);
                                } else optionsMap.set(option.id, message.attachments)
                            }

                        }
                    }
                } else {

                    if (option.type === "string") {
                        if (option.type === "string") {
                            if (option.choices?.length) {
                                const choices = option.choices.map(i => i.toLowerCase());

                                if (!choices.includes(args[index].toLowerCase())) {
                                    errorMessages.push(`^{handler.command.invalid_args} **${th(index + 1)}** Parameter.\n\`\`\`yml\n${maped}\n\`\`\``);
                                } else {
                                    optionsMap.set(option.id, args[index]);
                                }

                            } else optionsMap.set(option.id, args[index])

                        }
                    }

                    await ForUser()
                    await forNumber();
                    await ForRole()

                    break;
                };
                async function forNumber() {
                    if (option.type === "number") {
                        if (option.required && isNaN(args[index])) errorMessages.push(`^{handler.command.invalid_args}\n\`\`\`yml\n${maped}\n\`\`\``);
                        else {
                            if ((option.max && args[index] > option.max) ||
                                (option.min && args[index] < option.min)) {
                                errorMessages.push(`^{handler.command.amoung_number} ${option.min ?? 0}-${option.max ?? `Infinte`} \n\`\`\`yml\n${maped}\n\`\`\``);
                            } else {
                                optionsMap.set(option.id, args[index])
                            }
                        }
                    }
                }
                async function ForUser() {
                    if (args?.[index] && (option.type === "user" || option.type === "member")) {
                        let userMatch = args[index].match(/^<@!?(\d+)>$/) || args[index].match(/^(\d+)$/);
                        let user;
                        let Type = option.type === "user" ? "user-" : `member-${message.guild.id}-`
                        if (userMatch) {
                            if (cache.get(Type + userMatch[1])) {
                                user = cache.get(Type + userMatch[1]);
                                optionsMap.set(option.id, user)
                            } else {
                                if (option.type === "user") {
                                    let fetchedUser = await client.users.fetch(userMatch[1]).catch(() => null)
                                    if (!fetchedUser) {
                                        errorMessages.push(`^{handler.command.invalid_args} \n\`\`\`yml\n${maped}\n\`\`\``);
                                    } else {
                                        optionsMap.set(option.id, fetchedUser)
                                        cache.set(Type + fetchedUser.id, fetchedUser, 150)
                                    }
                                } else {
                                    let fetchedUser = await message.guild.members.fetch(userMatch[1]).catch(() => null)
                                    if (!fetchedUser) {
                                        errorMessages.push(`^{handler.command.invalid_args} \n\`\`\`yml\n${maped}\n\`\`\``);
                                    } else {
                                        optionsMap.set(option.id, fetchedUser)
                                        cache.set(Type + fetchedUser.id, fetchedUser, 150)
                                    }
                                }
                            }
                        } else {
                            if (option.type === "user") {
                                let fetchedUser = await client.users.fetch(args[index]).catch(() => null) || client.users.cache.find(u => u.username === args[index]);
                                if (!fetchedUser) {
                                    errorMessages.push(`^{handler.command.invalid_args} \n\`\`\`yml\n${maped}\n\`\`\``);
                                } else {
                                    optionsMap.set(option.id, fetchedUser)
                                    cache.set(Type + fetchedUser.id, fetchedUser, 150)
                                }
                            } else {
                                let fetchedUser = await message.guild.members.fetch(args[index]).catch(() => null) || message.guild.members.cache.find(u => u.user.username === args[index]);
                                if (!fetchedUser) {
                                    errorMessages.push(`^{handler.command.invalid_args} \n\`\`\`yml\n${maped}\n\`\`\``);
                                } else {
                                    optionsMap.set(option.id, fetchedUser)
                                    cache.set(Type + fetchedUser.id, fetchedUser, 150)
                                }
                            }
                        }

                    }
                }
                async function ForRole() {
                    if (option.type === "role") {
                        const mentionMatch = args[index].match(/^<@&(\d+)>$/);
                        const key = `Role:${mentionMatch?.[1] || args[index]}`;
                        const cacheData = cache.get(key)
                        if (cacheData) optionsMap.set(option.id, cacheData)
                        else {
                            const role = message.guild.roles.cache.get(mentionMatch?.[1]) ||
                                message.guild.roles.cache.find(r => r.name === args[index]) ||
                                message.guild.roles.cache.find(r => r.name.includes(args[index]));
                            if (role) optionsMap.set(option.id, role);
                            else errorMessages.push(`^{handler.command.invalid_args} \n\`\`\`yml\n${maped}\n\`\`\``);
                        }
                    }
                }
            }
            if (argsMessages.length > 0) {
                const embed = new EmbedBuilder(client).setFooter({
                    text: "^{handler.command.params_format}"
                })
                    .setDescription(`^{handler.command.syntax_error}\n\`\`\`yml\n${argsMessages[0]}\`\`\``)
                    .setColor(client.embed.wrongcolor)
                    .setAuthor({
                        name: client.user.username,
                        iconURL: client.user.displayAvatarURL({
                            format: "png", dynamic: true
                        })
                    }).setTimestamp()
                message.safeReply({
                    embeds: [embed]
                });
                return;
            } else if (errorMessages.length > 0) {
                const embed = new EmbedBuilder(client)
                    .setAuthor({
                        name: client.user.username,
                        iconURL: client.user.displayAvatarURL({
                            format: "png", dynamic: true
                        })
                    }).setTimestamp()
                    .setDescription(errorMessages[0])
                    .setColor(client.embed.wrongcolor)
                    .setFooter({
                        text: "^{handler.command.params_format}"
                    });
                message.safeReply({
                    embeds: [embed]
                });
                return;
            }
        }

        //* ==============================< CoolDown checking >============================= \\

        if (Number(command.cooldown) > 0) {
            if (MsgCooldown(message, command, client)) {
                return await message.safeReply({
                    embeds: [
                        new EmbedBuilder(client)
                            .setTitle('^{handler.command.cooldown}')
                            .setDescription(`!{x} Please wait ***\`${MsgCooldown(message, command).toFixed(1)}\` Seconds*** Before using the \`${command.name}\` command again!`)
                            .setColor(client.embed.wrongcolor)
                    ]
                }).then(m => setTimeout(() => m.delete(), MsgCooldown(message, command) * 1000));
            }
        }

        //* ==============================< Start The Command >============================= \\

       // await command.run({ client, message, args, command, options: optionsMap, err, guildData });


        const logEmbed = new EmbedBuilder(client)
            .setColor("Blurple")
            .setAuthor({
                name: message.author.username,
                iconURL: message.author.displayAvatarURL({
                    dynamic: true
                })
            })
            .setTitle(`Prefix Command`)
            .setFooter({
                text: `${message.guild.name} - ${client.ws.ping}ms`,
                iconURL: message.guild.iconURL({
                    dynamic: true
                })
            })
            .addFields([
                { name: "**Author**", value: `\`\`\`yml\n${message.author.username} [${message.author.id}]\`\`\`` },
                { name: "**Command Name**", value: `\`\`\`yml\n${command.name}\`\`\`` },
                { name: `**Guild**`, value: `\`\`\`yml\n${message.guild?.name} [${message.guild?.id}]\`\`\`` }
            ]);

        webhookLog({ embeds: [logEmbed] }, "Command", client);

    }


    //* ==============================< End Of File >============================= \\
}

/**@type {import("./index.mjs").BasicParamHandler} */
export const slashHandler = async (interaction, data) => {
    const err = (err, i) => ErrorHandler(!i ? interaction : i, err);

    const { client } = interaction
    //* ==============================< Command Handling >=============================\\

    /**@type {import('../../utils/Command.mjs').interaction} */
    const slashCommand = client.slashCommands.get(interaction.commandName);

    if (!slashCommand) return;

// AUTOCOMPLETE
if (interaction.isAutocomplete()) {
    if (slashCommand.autocomplete) {
        return slashCommand.autocomplete(interaction, []);
    }
    return;
}

// SLASH COMMAND ONLY
if (!interaction.isChatInputCommand()) return;

    //* ==============================< If command doesn't found >=============================\\

    if (!slashCommand) return client.slashCommands.delete(interaction.commandName);

    //* ==============================< Other Command Handling list >=============================\\

    const guildData = data

    try {

        //* ==============================< Command Categorization  >=============================\\

        if (slashCommand.category && !client.categories.get(slashCommand.category)) return await interaction.safeReply({
            ephemeral: true,
            embeds: [new EmbedBuilder().setTheme(guildData.Theme)
                .setTitle(`!{x} **That Command Category Doesn't Exist!**`).setColor(client.embed.wrongcolor)
            ]
        });

        if (data.Blacklist?.find(i => i == interaction.user.id)) {
            return await interaction.reply({
                ephemeral: true,
                content: "!{x} You are blacklisted"
            })
        }

        // ==============================< Toggle off >=============================\\
        if (slashCommand.toggleOff) {
            return await interaction.safeReply({
                ephemeral: true,
                embeds: [new EmbedBuilder().setTheme(guildData.Theme)
                    .setTitle(`^{handler.command.disabled}`).setColor(client.embed.wrongcolor)
                ]
            }).catch((e) => {
                console.log(e)
            });
        }
        // ==============================< On Mainenance Mode >============================= \\
        if (slashCommand.maintenance) {
            return await interaction.safeReply({
                ephemeral: true,
                content: `^{handler.command.disabled}`
            })
        }
        // ==============================< Owner Only >============================= \\            
        if (slashCommand.ownerOnly) {
            const owners = client.config.Owners;
            if (!owners.includes(interaction.user.id)) return await interaction.safeReply({
                ephemeral: true,
                embeds: [new EmbedBuilder(client)
                    .setDescription(`^{handler.command.owner_only}`).setColor(client.embed.wrongcolor)
                ]
            }).catch((e) => {
                console.log(String(e).grey)
            });
        }


        // ==============================< CoolDown checking >============================= \\
        if (Number(slashCommand.cooldown) > 0 && SlashCooldown(interaction, slashCommand)) {
            return interaction.safeReply({
                ephemeral: true,
                embeds: [
                    new EmbedBuilder(client)
                        .setTitle('^{handler.command.cooldown}')
                        .setDescription(`!{x} Please wait \`${SlashCooldown(interaction, slashCommand).toFixed(1)}\` Before using the \`${slashCommand.data.name}\` command again!`)
                        .setColor(client.embed.wrongcolor)
                ]
            })
        }

        // ==============================< Start The Command >============================= \\	       
        await slashCommand.run({ client, interaction, err, guildData });

        const logEmbed = new EmbedBuilder(client)
            .setColor("Blurple")
            .setAuthor({
                name: interaction.member.user.username,
                iconURL: interaction.member.user.displayAvatarURL({
                    dynamic: true
                })
            })
            .setFooter({
                text: `${interaction.guild.name} - ${client.ws.ping}ms`,
                iconURL: interaction.guild.iconURL({
                    dynamic: true
                })
            })
            .setTimestamp()
            .setTitle(`Slash Command`)
            .addFields([
                { name: "**Author**", value: `\`\`\`yml\n${interaction.user.username} [${interaction.user.id}]\`\`\`` },
                { name: "**Command Name**", value: `\`\`\`yml\n${slashCommand.data.name}\`\`\`` },
                { name: `**Guild**`, value: `\`\`\`yml\n${interaction?.guild?.name} [${interaction?.guild?.id}]\`\`\`` }
            ]);

        webhookLog({ embeds: [logEmbed] }, "Command", client);

        // ==============================< On Error >============================= \\
    } catch (error) {
        err(error)
    }
}


function th(index) {
    if (index == 1) return "First"
    else if (index == 2) return "2nd"
    else if (index == 3) return "3rd"
    else return index + "th"
}



function isValidChannel(guild, input) {

    const mentionMatch = input.match(/^<#(\d+)>$/);
    if (mentionMatch) {
        const channelId = mentionMatch[1];
        return guild.channels.cache.has(channelId);
    }

    if (guild.channels.cache.has(input)) {
        return true;
    }

    const channel = guild.channels.cache.find((c) => c.name === input);
    return !!channel;
}

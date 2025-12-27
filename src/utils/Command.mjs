import Bot from "../client.mjs";
import guildConfig from "../../src/Models/GuildConfig.mjs"
import { SlashCommandBuilder } from 'discord.js'


/**
 * @typedef {Object} interactionParam
 * @property {import("discord.js").Interaction} interaction   
 * @property {Bot} client
 * @property {guildConfig} guildData
 * @property {function(Error):null} err log error message
 */

/**
 * @typedef {Object} prefixParam
 * @property {import("discord.js").Message | import("discord.js").Interaction} message   
 * @property {Bot} client
 * @property {guildConfig} guildData
 * @property {function(Error)} err
 * @property {String[]} [args]
 * @property {Map | import("discord.js").CommandInteractionOptionResolver} [options]
*/

/** 
* @typedef {Object} prefixOption
* @property {String} id - set id to get value of option
* @property {String} name - anything that shows user like usage 
* @property {Boolean} [required] 
* @property {"user" | "member" | "channel" | "role" | "attachment"} type
*/


/**
 * @typedef {Object} interaction
 * @property {function(interactionParam)} run
 * @property {import("discord.js").ApplicationCommand} data
 * @property {Number} cooldown - In Seconds
 * @property {import("../../Assets/Global/config.mjs").CategoryValue} category 
*/

/**
 * @typedef {Object} prefix
 * @property {function(prefixParam)} run
 * @property {String} name
 * @property {String} description
 * @property {String[]} aliases
 * @property {Number} cooldown - In Seconds
 * @property {prefixOption[]} [options] 
 * @property {Object} permissions
 * @property {import("discord.js").PermissionResolvable[]} permissions.user
 * @property {import("discord.js").PermissionResolvable[]} permissions.bot
 * @property {import("../../Assets/Global/config.mjs").CategoryValue} category 
*/


/** @type {interaction} */
const test = {
    data: new SlashCommandBuilder(),
    cooldown: 10,
    category: "",
    run: async ({ }) => { }
}

/**@type {prefix} */
const test2 = {
    name: "",
    description: "",
    cooldown: 1,
    category: "",
    aliases: [],
    run: ({ client, err, guildData, message, args, options }) => { }
}

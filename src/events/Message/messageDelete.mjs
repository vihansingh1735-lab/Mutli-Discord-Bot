import { Collection, PermissionsBitField, Message } from 'discord.js'
import { cache, auditlog } from '../../utils/index.mjs'
import Bot from '../../client.mjs'
import { GhostPingHandler } from '../../utils/handlers/index.mjs';


export default {
    name: "messageDelete",
    /**
     * @param {Bot} client - The Discord client.
     * @param {Message} message - The message object.
     */
    run: async (client, message) => {
        
if (message.author?.bot || message.system || message.webhookId) return;

        await GhostPingHandler(message, await message.guild.fetchData())
        const key = `Snipe:${client.user.id}:${message.guildId}:${message.channelId}`

        let snipeCache = cache.get(key)

        if (!snipeCache) cache.set(key, [message], 120);
        else {
            snipeCache.unshift(message)
            cache.set(key, snipeCache, 120)
        }


    }
}

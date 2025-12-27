import { Collection, PermissionsBitField, Message } from 'discord.js'
import { auditlog, cache } from '../../utils/index.mjs'
import Bot from '../../client.mjs'

export default {
    name: "messageUpdate",
    /**
     * @param {Bot} client - The Discord client.
     * @param {Message | import('discord.js').PartialMessage} oldMessage - The message object.
     * @param {Message | import('discord.js').PartialMessage} newMessage - The message object.
     */
    run: async (client, oldMessage, newMessage) => {
        if (!oldMessage?.author || !newMessage?.author) return;
if (oldMessage.author.bot || oldMessage.system) return;

        await auditlog("MessageUpdate", newMessage.guild, {message: oldMessage, newMessage})
        
        const key = `EditSnipe:${client.user.id}:${oldMessage.guildId}:${oldMessage.channelId}`

        let snipeCache = cache.get(key);

        if (!snipeCache) cache.set(key, [oldMessage], 120);
        else {
            snipeCache.unshift(oldMessage)
            cache.set(key, snipeCache, 120)
        }


    }
}

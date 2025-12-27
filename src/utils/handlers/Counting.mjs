import { cache } from '../index.mjs'


/**@type {import("./index.mjs").BasicParamHandler} */
export const Counting = async (message, data) => {
    try {
        if (!message || !message.author) return;

if (
  message.author.bot ||
  message.system ||
  message.webhookId
) return;

        if (data?.Count?.Enable && data?.Count?.Channel === message.channelId) {
            let guildData = await client.db.FindOne('CountGuild', {
                Guild: message.guildId
            });

            if (!guildData) {
                await client.db.Create('CountGuild', {
                    Guild: message.guildId
                });
                guildData = await client.db.FindOne('CountGuild', {
                    Guild: message.guildId
                });
            }

            let userData = await client.db.FindOne('CountUser', {
                Guild: message.guildId,
                User: message.author.id
            });

            if (!userData) {
                await client.db.Create('CountUser', {
                    Guild: message.guildId,
                    User: message.author.id,
                });
                userData = await client.db.FindOne('CountUser', {
                    Guild: message.guildId,
                    User: message.author.id
                });
            }

            const number = parseInt(message.content);

            if (isNaN(number)) return await message.delete();

            if (guildData?.LastUser === message.author.id) {
                message.channel.safeSend({
                    content: `${message.author} This is not your turn you have to wait for it!`
                }).then(m => setTimeout(() => m.delete(), 5000));
                return await message.delete();
            }

            if (number !== guildData.Score + 1) {
                message.channel.safeSend({
                    content: `${message.author} You Entered Wrong Number! Next Number Should be ${guildData.Score + 1}`
                }).then(m => setTimeout(() => m.delete(), 5000));
                return await message.delete();
            }

            await client.db.UpdateOne('CountGuild', {
                Guild: message.guildId
            }, {
                $set: {
                    LastUser: message.author.id,
                    Score: number,
                }
            }, { upsert: true });

            await client.db.UpdateOne('CountUser', {
                User: message.author.id,
                Guild: message.guild.id
            }, {
                $set: {
                    Score: userData.Score + 1
                }
            }, { upsert: true });

            const key = `CountWait:${message.guildId}`
            const cacheData = cache.get(key)
            if (!cacheData) {

                const counted = await client.db.Find('CountUser', {
                    Guild: message.guild.id
                }, { sort: ['Score', 'descending'] })
                const per = (guildData.Score / 2147483647) * 100;

                await message.channel.setTopic(`
             :newspaper: ${message.guild.name}
             \n**Stats**\nCurrent Number: ${number + 1}\nUsers that counted: ${counted.length}\nTop Member: <@${counted[0].User}> - *${counted[0].Score}x*\nDatabase Filed: ${per.toFixed(2)}%\n\n*The Stats can only change every 5 minutes if someone counts!*`)

                cache.set(key, true, 5)
                if (per >= 80) {
                    await client.db.UpdateOne('CountGuild', {
                        Guild: message.guildId
                    }, {
                        $set: {
                            LastUser: null,
                            Score: 0,
                        }
                    }, { upsert: true });
                }
            }
        }
    } catch (e) {
        err(e)
    }
}

import { Events, ActivityType } from "discord.js";
import logger, { webhookLog } from "../utils/logger.mjs";
import {
  EmbedBuilder,
  postReddit,
} from "../utils/index.mjs";
import { invite } from "../utils/invite.mjs";
import Bot from "../client.mjs";
import {
  BirthdayHandler,
  SocialMediaHandler,
} from "../utils/handlers/index.mjs";

export default {
  name: Events.ClientReady,
  runOnce: true,

  /**
   * @param {Bot} client
   */
  run: async (client) => {
    logger(`Logged in as ${client.user.tag}!`.cyan.bold);

    /* =======================
       ✅ FIXED PRESENCE
    ======================= */

    const activityText =
      client.config?.Activity || "Listening to you <3";

    const status =
      client.config?.Status || "online";

    await client.user.setPresence({
      status,
      activities: [
        {
          name: activityText,
          type: ActivityType.Listening, // 🔥 IMPORTANT
        },
      ],
    });

    logger(`Presence set → ${activityText}`.green);

    /* =======================
       Background jobs
    ======================= */

    const processGuilds = async () => {
      const data = await client.db.Find("GuildConfig");

      await SocialMediaHandler(client, data);
      await BirthdayHandler(client, data);

      client.guilds.cache.forEach((guild) => {
        invite.updateInvites(guild);
        postReddit(guild);
      });
    };

    await processGuilds();
    setInterval(processGuilds, 15 * 60 * 1000);

    /* =======================
       Webhook log
    ======================= */

    webhookLog(
      {
        embeds: [
          new EmbedBuilder()
            .setColor("Blurple")
            .setAuthor({
              name: client.user.tag,
              iconURL: client.user.displayAvatarURL({ dynamic: true }),
            })
            .setDescription(
              `${client.user.username} is Online Since <t:${Math.floor(
                Date.now() / 1000
              )}:R>`
            ),
        ],
      },
      "Ready"
    );
  },
};

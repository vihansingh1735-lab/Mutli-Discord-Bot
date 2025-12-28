import { Events, ActivityType } from "discord.js";
import logger, { webhookLog } from "../utils/logger.mjs";
import {
  EmbedBuilder,
  postReddit,
} from "../utils/index.mjs";
import { invite } from "../utils/invite.mjs";
import {
  BirthdayHandler,
  SocialMediaHandler,
} from "../utils/handlers/index.mjs";

export default {
  name: Events.ClientReady,
  runOnce: true,

  /**
   * @param {import("../client.mjs").default} client
   */
  run: async (client) => {
    logger(`Logged in as ${client.user.tag}!`.cyan.bold);

    /* ===============================
       🔥 SAFE PRESENCE SYSTEM
    =============================== */

    let activityName = "Listening to you <3";
    let activityType = ActivityType.Listening;

    const rawActivity = client.config?.Activity;

    // STRING
    if (typeof rawActivity === "string") {
      activityName = rawActivity;
    }

    // OBJECT
    else if (typeof rawActivity === "object" && rawActivity !== null) {
      if (typeof rawActivity.name === "string") {
        activityName = rawActivity.name;
      } else if (typeof rawActivity.text === "string") {
        activityName = rawActivity.text;
      }

      if (typeof rawActivity.type === "string") {
        const map = {
          PLAYING: ActivityType.Playing,
          LISTENING: ActivityType.Listening,
          WATCHING: ActivityType.Watching,
          STREAMING: ActivityType.Streaming,
          COMPETING: ActivityType.Competing,
        };
        activityType =
          map[rawActivity.type.toUpperCase()] ??
          ActivityType.Listening;
      }
    }

    // ARRAY
    else if (Array.isArray(rawActivity) && rawActivity[0]) {
      if (typeof rawActivity[0].name === "string") {
        activityName = rawActivity[0].name;
      }
    }

    await client.user.setPresence({
      status: client.config?.Status || "online",
      activities: [
        {
          name: activityName,
          type: activityType,
        },
      ],
    });

    logger(`Presence set → ${activityName}`.green);

    /* ===============================
       🔁 BACKGROUND TASKS
    =============================== */

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

    /* ===============================
       📡 READY WEBHOOK LOG
    =============================== */

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

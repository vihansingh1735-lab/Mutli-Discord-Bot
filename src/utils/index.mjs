import { Guild, Webhook } from "discord.js";
import * as number from "./number.mjs";
import axios from "axios";
import url from "url";

import Level from "./classes/Level.mjs";
import EmbedBuilder from "./classes/EmbedBuilder.mjs";
import ModUtils, { logModeration, logModWebhook } from "./classes/ModUtils.mjs";
import Economy from "./classes/Economy.mjs";
import Database from "./classes/Database.mjs";
import GiveawaysManager from "./classes/Giveaways.mjs";
import VoiceMaster from "./classes/VoiceMaster.mjs";

import cache from "./cache.mjs";

import * as todClassic from "./stuff/tod/classic.mjs";
import * as todNsfw from "./stuff/tod/nsfw.mjs";
import * as todFunny from "./stuff/tod/funny.mjs";

import * as invite from "./invite.mjs";
import * as welcome from "./welcome.mjs";
import * as string from "./string.mjs";
import * as variables from "./variables.mjs";
import * as automod from "./automod.mjs";

import * as justreddit from "justreddit";
import Parser from "rss-parser";
import { auditlog } from "./auditlog.mjs";
import logger, { webhookLog } from "./logger.mjs";

const parser = new Parser({ timeout: 10_000 });
const getURLParts = url.parse;

/* ================= EXPORTS ================= */

export {
  cache,
  Level,
  string,
  welcome,
  invite,
  automod,
  Economy,
  ModUtils,
  Database,
  variables,
  EmbedBuilder,
  GiveawaysManager,
  VoiceMaster,
  logModeration,
  logModWebhook,
  number,
  auditlog,
  logger,
  webhookLog,
  justreddit,
};

/* ================= UTILITIES ================= */

export const ParseContent = (content, guildData) => {
  if (!content?.files || !Array.isArray(content.files)) {
    return JSON.parse(
      JSON.stringify(content)
        .translate(guildData.Language || "en")
        .replaceEmojis(guildData.Theme || "Yellow")
    );
  }

  const { files, ...rest } = content;
  const parsed = JSON.parse(
    JSON.stringify(rest)
      .translate(guildData.Language || "en")
      .replaceEmojis(guildData.Theme || "Yellow")
  );

  return { files, ...parsed };
};

export const sanitizeMessage = (msg, limit = 2000) =>
  msg.length > limit ? msg.slice(0, limit - 3) + "..." : msg;

export const convertObject = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));

/* ================= PROGRESS ================= */

export const progressBar = (percentage = 0, length = 14) => {
  const pb = {
    le: "<:lefte:1162595345532985404>",
    me: "<:middlee:1162595342466953256>",
    re: "<:righte:1162595340675985438>",
    lf: "<:leftf:1162595336636862554>",
    mf: "<:middlef:1162595334552301681>",
    rf: "<:rightf:1162595330823565412>",
  };

  percentage = number.clamp(percentage, 0, 100);
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;

  return (
    (filled ? pb.lf : pb.le) +
    pb.mf.repeat(filled) +
    pb.me.repeat(empty) +
    (filled === length ? pb.rf : pb.re)
  );
};

export const progressBar2 = (percentage = 0, steps = 10) => {
  percentage = number.clamp(percentage, 0, 100);
  const progress = Math.round((percentage / 100) * steps);
  return `[${"#".repeat(progress)}${"-".repeat(steps - progress)}]`;
};

/* ================= VALIDATORS ================= */

export const isImageURLValid = async (imageURL) => {
  try {
    const res = await axios.head(imageURL);
    return res.status === 200 && res.headers["content-type"]?.startsWith("image/");
  } catch {
    return false;
  }
};

export const validateStreamingURL = (link) => {
  if (!link) return false;
  const { hostname } = getURLParts(link);
  return ["twitch.tv", "youtube.com", "facebook.com"].includes(
    hostname?.replace("www.", "")
  );
};

export const containsDiscordInvite = (text) =>
  /(discord\.gg|discord\.com\/invite|dsc\.gg)/i.test(text);

export const containsLink = (text) =>
  /(https?:\/\/[^\s]+)/i.test(text);

export const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ================= COUNTERS ================= */

export const onlineCounter = async (data, guild) => {
  await guild.fetch();
  const channel = guild.channels.cache.get(data.Counter.Online.Channel);
  if (!channel) return;

  await channel.setName(
    `${data.Counter.Online.ChannelName || "Online"} ${number.abbreviate(
      guild.approximatePresenceCount
    )}`
  );
};

export const totalCounter = async (data, guild) => {
  await guild.fetch();
  const channel = guild.channels.cache.get(data.Counter.Total.Channel);
  if (!channel) return;

  await channel.setName(
    `${data.Counter.Total.ChannelName || "All"} ${number.abbreviate(
      guild.approximateMemberCount
    )}`
  );
};

/* ================= REDDIT (SAFE) ================= */

export const redditFeed = async (query, type) => {
  const map = {
    Random: "random",
    Hot: "hot",
    Top: "top",
    Best: "rising",
    New: "new",
  };

  try {
    const post = await justreddit.randomPostFromSub({
      subReddit: query,
      sortType: map[type],
    });

    return post?.error ? false : post;
  } catch {
    return false;
  }
};

/* ================= TRUTH OR DARE ================= */

export const getTod = (type, subType) => {
  type = type === "Random" ? (Math.random() < 0.5 ? "Truth" : "Dare") : type;

  const source =
    subType === "Nsfw"
      ? todNsfw
      : subType === "Funny"
      ? todFunny
      : todClassic;

  return source[type][Math.floor(Math.random() * source[type].length)];
};

/* ================= DATE UTILS (FIXED EXPORT) ================= */

export const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};
/**
 * X (Twitter) follower counter
 * @param {Object} data
 * @param {import("discord.js").Guild} guild
 */
export const XCounter = async (data, guild) => {
  if (!data?.Counter?.X?.ID) return;

  const channel = guild.channels.cache.get(data.Counter.X.Channel);
  if (!channel) return;

  // Placeholder value (no API, no NSFW, no scraping)
  const followers = data.Counter.X.FallbackCount || 0;

  await channel.setName(
    `${data.Counter.X.ChannelName || "X"} ${number.abbreviate(followers)}`
  );
};
/* ================= MISC ================= */

export const addSuffix = (num) => {
  if (!num) return;
  if (num % 100 >= 11 && num % 100 <= 13) return `${num}th`;
  return `${num}${["th", "st", "nd", "rd"][num % 10] || "th"}`;
};

export const isHex = (text) => /^#?[0-9A-F]{6}$/i.test(text);
/**
 * Instagram follower counter
 * @param {Object} data
 * @param {import("discord.js").Guild} guild
 */
export const instaCounter = async (data, guild) => {
  if (!data?.Counter?.Insta?.ID) return;

  const channel = guild.channels.cache.get(data.Counter.Insta.Channel);
  if (!channel) return;

  try {
    const res = await axios.get(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${data.Counter.Insta.ID}`,
      {
        headers: {
          "User-Agent":
            "Instagram 219.0.0.12.117 Android",
        },
      }
    );

    const count =
      res?.data?.data?.user?.edge_followed_by?.count ?? 0;

    await channel.setName(
      `${data.Counter.Insta.ChannelName || "Insta"} ${number.abbreviate(count)}`
    );
  } catch {
    // fail silently (prevents crash)
  }
};
/**
 * Post Reddit feeds using webhooks (SFW only)
 * @param {import("discord.js").Guild} guild
 */
export const postReddit = async (guild) => {
  const data = await guild.fetchData();
  if (!data?.Reddit?.Enable || !data?.Reddit?.List?.length) return;

  for (const feed of data.Reddit.List) {
    try {
      const key = `Webhook:${guild.id}:${feed.Webhook.id}`;
      let webhook = cache.get(key);

      if (!webhook) {
        webhook = await guild.client.fetchWebhook(
          feed.Webhook.id,
          feed.Webhook.token
        );
        if (!webhook) continue;
        cache.set(key, webhook, 120);
      }

      const reddit = await redditFeed(feed.Triger, feed.Type);
      if (!reddit) continue;

      const embed = new EmbedBuilder()
        .setColor("DarkButNotBlack")
        .setAuthor({ name: reddit.author })
        .setTitle(reddit.title)
        .setURL(reddit.url)
        .setImage(reddit.image)
        .setFooter({ text: `Feed from /r/${feed.Triger}` });

      await webhook.send({ embeds: [embed] }).catch(() => {});
    } catch {
      // silent fail to avoid crashes
    }
  }
};
/**
 * Validate social media username from URL
 * @param {string} input
 * @param {"youtube" | "twitch"} type
 * @returns {string|null}
 */
export const validateSocialMedia = (input, type) => {
  if (!input || !type) return null;

  const regex = {
    youtube: /youtube\.com\/(channel|c)\/([a-zA-Z0-9_-]+)/i,
    twitch: /twitch\.tv\/([a-zA-Z0-9_]+)/i,
  };

  const match = input.match(regex[type.toLowerCase()]);
  return match ? match[2] || match[1] : null;
};

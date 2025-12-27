import { Application, Guild, Webhook } from "discord.js";
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
import * as cheerio from "cheerio";
import { auditlog } from "./auditlog.mjs";
import logger, { webhookLog } from "./logger.mjs";

const parser = new Parser({ timeout: 10_000 });
const getURLParts = url.parse;

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

/* -------------------- CONTENT PARSER -------------------- */
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

/* -------------------- PROGRESS BARS -------------------- */
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

/* -------------------- VALIDATORS -------------------- */
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

/* -------------------- SOCIAL VALIDATION -------------------- */
export const validateInstagramId = (input) => {
  const match = input.match(/instagram\.com\/([a-z0-9_]+)/i);
  return match ? match[1] : false;
};

export const validateXId = (input) => {
  const match = input.match(/(x\.com|twitter\.com)\/([a-z0-9_]+)/i);
  return match ? match[2] : false;
};

export const validateSocialMedia = (input, type) => {
  const regex = {
    youtube: /youtube\.com\/(channel|c)\/([a-z0-9_]+)/i,
    twitch: /twitch\.tv\/([a-z0-9_]+)/i,
  };
  const match = input.match(regex[type]);
  return match ? match[2] || match[1] : null;
};

/* -------------------- COUNTERS -------------------- */
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

/* -------------------- REDDIT (SFW ONLY) -------------------- */
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

/* -------------------- TRUTH OR DARE (NSFW TEXT OK) -------------------- */
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

/* -------------------- MISC -------------------- */
export const addSuffix = (num) => {
  if (!num) return;
  if (num % 100 >= 11 && num % 100 <= 13) return `${num}th`;
  return `${num}${["th", "st", "nd", "rd"][num % 10] || "th"}`;
};

export const isHex = (text) => /^#?[0-9A-F]{6}$/i.test(text);

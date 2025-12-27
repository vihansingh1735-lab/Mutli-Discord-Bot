import {
  Client,
  Collection,
  GatewayIntentBits as GIB,
  Partials,
} from "discord.js";
import fs from "fs/promises";
import { createRequire } from "node:module";
import logger from "./utils/logger.mjs";
import {
  Level,
  Database,
  Economy,
  VoiceMaster,
} from "./utils/index.mjs";
import globalConfig from "../Assets/Global/config.mjs";
import "./utils/extenders/index.mjs";
import "./utils/extenders/replaceEmoji.mjs";
import * as Themes from "../Assets/Global/Themes.mjs";

const cache = new Map();
const require = createRequire(import.meta.url);

class Bot extends Client {
  constructor(config) {
    super({
      allowedMentions: {
        parse: ["roles", "users", "everyone"],
        repliedUser: false,
      },
      intents: Object.values(GIB),
      partials: Object.values(Partials),
    });

    this.config = config;
  }

  async start() {
    try {
      this.db = await new Database(this.config.CLIENT_ID).LoadModels();
      await this.configManagar();

      ["events", "aliases", "buttons", "cooldowns", "slashCommands"].forEach(
        (i) => (this[i] = new Collection())
      );

      this.commands = new Collection();
      this.categories = new Collection();

      const enabled =
        this.config.Commands?.Enabled?.length > 0
          ? this.config.Commands.Enabled
          : globalConfig.Commands.Categories;

      enabled.forEach((c) => this.categories.set(c, []));

      this.config.Commands?.Disabled?.forEach((c) =>
        this.categories.delete(c)
      );

      await this._loadEvents();
      await this.login(this.config.TOKEN);

      if (!this.config.CLIENT_ID)
        this.config.CLIENT_ID = this.application.id;

      this.voiceMaster = new VoiceMaster(this);
      this.lvl = new Level(this);
      this.eco = new Economy(this);

      await this.loadCommands();
    } catch (e) {
      logger(e, "error");
    }
  }

  async configManagar() {
    const Model = "BotConfig";
    let botConfig = await this.db.FindOne(Model, {});

    if (!botConfig) {
      await this.db.Create(Model);
      botConfig = await this.db.FindOne(Model, {});
    }

    const { __v, _id, createdAt, updatedAt, ...clean } = botConfig.toJSON();
    this.config = { ...this.config, ...clean };

    const theme = Themes[this.config.Theme] ?? Themes.default;
    this.theme = this.config.Theme;
    this.embed = theme.embed;
    this.emotes = theme.emotes;
  }

  async _loadEvents() {
    const events = await this.getEvents();

    for (const event of events) {
      this.events.set(event.name, event);

      if (event.runOnce)
        this.once(event.name, (...a) => event.run(this, ...a));
      else this.on(event.name, (...a) => event.run(this, ...a));
    }
  }

  async loadCommands() {
    const prefixCmds = await this.getCommands("Prefix");
    const slashCmds = await this.getCommands("Slash");

    for (const cmd of slashCmds) {
      if (!this.categories.has(cmd.category)) continue;
      this.slashCommands.set(cmd.data.name, cmd);
    }

    for (const cmd of prefixCmds) {
      if (!this.categories.has(cmd.category)) continue;

      const names = Array.isArray(cmd.name) ? cmd.name : [cmd.name];

      for (const name of names) {
        const cloned = { ...cmd, name };
        this.commands.set(name, cloned);
        this.categories.get(cmd.category).push(cloned);

        if (Array.isArray(cmd.aliases)) {
          for (const alias of cmd.aliases) {
            this.aliases.set(alias, name);
          }
        }
      }
    }

    logger(
      `Loaded ${this.slashCommands.size} Slash & ${this.commands.size} Prefix commands`
    );
  }

  async getCommands(type) {
    const cached = cache.get(type);
    if (cached) return cached;

    const commands = [];
    const base = type === "Slash" ? "./Commands/Slash" : "./Commands/Prefix";
   await import(`${base}/${dir}/${file}`);
    const dirs = await fs.readdir(base);

    for (const dir of dirs) {
      const files = await fs.readdir(`${base}/${dir}`);
      for (const file of files.filter((f) => f.endsWith(".mjs"))) {
        const { default: cmd } = await import(`${base}/${dir}/${file}`);
        if (cmd && !cmd.ignore) commands.push(cmd);
      }
    }

    cache.set(type, commands, 10);
    return commands;
  }

  async getEvents() {
    const cached = cache.get("Events");
    if (cached) return cached;

    const events = [];
    const dirs = await fs.readdir("./src/events");

    for (const dir of dirs) {
      const stat = await fs.stat(`./src/events/${dir}`);

      if (stat.isDirectory()) {
        const files = await fs.readdir(`./src/events/${dir}`);
        for (const f of files.filter((i) => i.endsWith(".mjs"))) {
          const { default: ev } = await import(`./events/${dir}/${f}`);
          if (ev?.name && typeof ev.run === "function" && !ev.ignore)
            events.push(ev);
        }
      }
    }

    cache.set("Events", events, 10);
    return events;
  }

  getPromotion() {
    const msgs = globalConfig?.Promotion?.Messages ?? [];
    return { Message: msgs[Math.floor(Math.random() * msgs.length)] };
  }

  getInvite() {
    return this.generateInvite({
      scopes: ["bot", "applications.commands"],
      permissions: ["SendMessages", "EmbedLinks", "ReadMessageHistory"],
    });
  }
}

export default Bot;

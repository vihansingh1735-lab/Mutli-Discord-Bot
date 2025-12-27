/**
 * @author uo1428
 * @support discord.uoaio.xyz | youtobe.com/@uoaio
 * @donate patreon.com/uoaio
 * @note Dont take any type credit
 * @copyright discord.com/users/uoaio all rights reserved
 */

import dotenv from "dotenv";
dotenv.config();

import "colors";
import Client from "./src/client.mjs";
import clients from "./Assets/Global/clients.mjs";
import antiCrash from "./src/utils/antiCrash.mjs";
import mongoose from "mongoose";
import globalConfig from "./Assets/Global/config.mjs";
import logger from "./src/utils/logger.mjs";
import "./src/utils/Command.mjs";
import boxen from "boxen";
import "./keep-alive.mjs";
let aio = `Welcome to ${"Console".blue.bold} by ${
  "ALL IN ONE | Development".red
}`;

let aio_server = `\nSupport:- ${`https://discord.uoaio.xyz`.brightGreen}`;
let Uo = `\nCoded By ${`@uoaio`.brightCyan.bold}`;

console.log(
  boxen(aio + aio_server + Uo, {
    padding: 1,
    borderStyle: "round",
    textAlignment: "center",
  })
);

antiCrash(); //? anti charsh handling

//? mongodb checking...
if (
  !globalConfig.API.MongoDB ||
  !globalConfig.API.MongoDB.startsWith("mongodb")
) {
  logger(
    "Please Provide a Valid MongoDB Connection String - Support: patreon.com/uoaio"
      .red.bold
  );
  process.exit(1);
}

let count = 0; //? counter for clients/bots

mongoose.set("strictQuery", true); //? mongoose strict mode (mongodb framework)
//? connecting to mongodb
mongoose
  .connect(globalConfig.API.MongoDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger(`Connected To MongoDB`.underline.blue.bold);

    clients
      .filter((c) => c.TOKEN && c.CLIENT_ID)
      .forEach(async (config) => {
        new Client(config).start(); //? connecting to client
        count++;
      });

    if (count) logger(`Loading ${count}/${clients.length} Clients...`.magenta);
  })
  .catch((e) => logger(e, "error")); //? logging error if occurs

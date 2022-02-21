import {type Commands, Client, builtins, createCommands, middleware} from "discord-express"
import dotenv from "dotenv"
import {verify} from "./verify"

dotenv.config()

const commands: Commands = {
    verify: {
        description: "Verify your email",
        longDescription: "Make sure this is the same email you registered to JAMHacks 6 with",
        options: {
            email: {
                type: "string",
                description: "Email to verify",
                required: true,
            },
        },
    },
    help: builtins.help.command,
}

const client = new Client({
    intents: ["GUILD_MESSAGES", "GUILDS", "DIRECT_MESSAGES", "GUILD_MEMBERS"],
    partials: ["CHANNEL"],
    authToken: process.env.DISCORD_TOKEN,
})

client.registerCommands(createCommands(commands), process.env.DISCORD_CLIENT_ID)
client.initExpress()
client.use(...middleware.recommended({allowDMs: true}))
client.use(middleware.messageCommandParser({prefix: "!"}))

client.command("verify", verify)

client.command("help", builtins.help.handler({commands}))

client.error(async (err, _, response) => {
    await response.replyEphemeral(String(err))
})

client.on("ready", (_client) => {
    console.log("ready")

    _client.user.setPresence({
        status: "online",
        activities: [
            {
                type: "WATCHING",
                name: "jams and jellies",
            },
        ],
    })
})

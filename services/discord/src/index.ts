import "./dotenv"
import "./receiver"
import {Client, type Commands, builtins, createCommands, middleware} from "discord-express"
import {verify} from "./verify"

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

export const client = new Client({
    intents: ["GUILD_MESSAGES", "GUILDS", "DIRECT_MESSAGES", "GUILD_MEMBERS"],
    partials: ["CHANNEL"],
    authToken: process.env.DISCORD_TOKEN,
})

client.registerCommands(createCommands(commands), process.env.DISCORD_CLIENT_ID)
client.initExpress()
client.use(...middleware.recommended({allowDMs: true}))
client.use(middleware.messageCommandParser({prefix: "!"}))

client.use(
    "verify",
    middleware.rateLimit({
        windowMs: 1 * 24 * 60 * 60 * 1000,
        max: 5,
        message: "You've tried verifying too many times. Please contact an organizer.",
    }),
)

client.use("verify", async (request, response, next) => {
    if (request.channel?.type !== "DM") {
        try {
            await request.message?.delete()
        } catch {}

        return await response.replyEphemeral({content: "Please verify in DMs"})
    }

    next()
})

client.command("verify", verify)

client.command("help", builtins.help.handler({commands}))

client.error(async (err, _, response) => {
    console.error(err)

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

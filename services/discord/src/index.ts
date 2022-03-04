import "./dotenv"
import "./receiver"
import {Client, type Commands, builtins, createCommands, middleware} from "discord-express"
import {MessageActionRow, MessageButton} from "discord.js"
import db from "./db"
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
})

await client.login(process.env.DISCORD_TOKEN)

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
        // try {
        //     await request.message?.delete()
        // } catch {}

        // return await response.replyEphemeral({content: "Please verify in DMs"})

        await response.send({
            content: "I'd normally make you verify in DMs, but I'll let it slide this time.",
        })
    }

    next()
})

client.command("verify", verify)

client.command(
    "help",
    builtins.help.handler({
        commands,
        footerText: "Copyright (C) 2022 - Luke Zhang",
        components: [
            new MessageActionRow({
                components: [
                    new MessageButton({
                        label: "Github",
                        url: "https://github.com/sjamcsclub/jamhacks-discord-verification",
                        style: "LINK",
                    }),
                ],
            }),
        ],
    }),
)

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

client.on("guildMemberAdd", async (member) => {
    const organizer = await db.participant.findFirst({
        where: {
            discord: {
                is: {
                    username: member.user.username,
                    discriminator: member.user.discriminator,
                },
            },
            role: "Organizer",
        },
    })

    if (organizer) {
        await member.send(
            `Hi ${organizer.name}, I can't give admin roles for some reason, so you'll have to wait for someone to give you the organizer role.`,
        )
        await member.setNickname(organizer.name)
    } else {
        await member.send(
            `Hi ${member.user.username}, and welcome to JAMHacks! You probably don't want to do this, but we have to. Please verify your email with \`!verify <email>\` or \`/verify email: <email>\`.`,
        )
    }
})

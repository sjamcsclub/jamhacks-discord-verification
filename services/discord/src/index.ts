import "./dotenv"
import "./receiver"
import {Client, type Commands, builtins, createCommands, middleware} from "discord-express"
import {DiscordRoles, Role, getNewRoles} from "./roles"
import {type Guild, MessageActionRow, MessageButton} from "discord.js"
import {autoRoles, setInviteCache} from "./autoRole"
import db from "./db"
import {guildId} from "./globals"
import {verify} from "./commands/verify"

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
    if (request.channel?.type !== "DM" && request.requestType === "message") {
        await response.replyEphemeral({content: "Please verify in DMs", fallback: "dm"})

        try {
            await request.message.delete()
        } catch {}

        return
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
                        label: "Website",
                        url: "https://jamhacks.ca",
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

client.on("ready", async (_client) => {
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

    const guild = await _client.guilds.fetch({cache: true, guild: guildId})

    setInviteCache(await guild.invites.fetch({cache: true}))
})

client.on("guildMemberAdd", async (member) => {
    if (member.guild.id === guildId) {
        if (await autoRoles(member)) {
            return
        }

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
            await member.send(`Hi ${organizer.name}, I've given you the organizer role.`)
            await member.setNickname(organizer.name)
            await member.roles.add(DiscordRoles.Organizer)
        } else {
            const existingMember = await db.participant.findFirst({
                where: {
                    discord: {
                        is: {
                            username: member.user.username,
                            discriminator: member.user.discriminator,
                        },
                    },
                },
            })

            if (existingMember) {
                await db.discordUser.update({
                    where: {
                        uid: member.user.id,
                    },
                    data: {
                        uid: member.user.id,
                    },
                })

                await member.setNickname(existingMember.name)
                await member.roles.add(
                    getNewRoles(existingMember.role ?? Role.Hacker, existingMember.isInPerson),
                )
            } else {
                await member.send(
                    `Hi ${member.user.username}, and welcome to JAMHacks! You probably don't want to do this, but we have to. Please verify your email with \`/verify email: <email>\` or \`!verify <email>\`.`,
                )
            }
        }
    }
})

process.on("exit", () => client.destroy())
process.on("beforeExit", () => client.destroy())
process.on("SIGINT", () => client.destroy())

let guild: Guild | undefined

export const getGuild = async (): Promise<Guild> =>
    (guild ??=
        client.guilds.cache.find((cacheGuild) => cacheGuild.id === guildId) ??
        (await client.guilds.fetch(guildId)))

/**
 * @file a Simple HTTP server which only runs on localhost (8383). It takes the body of the request
 *   as the user id, and DMs the user, telling them their email was successfully verified.
 */

import {DiscordAPIError, type Guild} from "discord.js"
import {Status, pick} from "@luke-zhang-04/utils"
import Case from "case"
import {Role} from "./roles"
import {client} from "."
import db from "./db"
import {guildId} from "./globals"
import http from "http"

let guild: Guild | undefined

const getConclusionMessage = (role: Role | null): string => {
    switch (role) {
        case null:
        case Role.Organizer:
            return ""
        case Role.Hacker:
            return "Happy hacking!"
        case Role.Judge:
            return "Thank you for judging!"
        case Role.WorkshopRunner:
            return "Thank you for taking your time to run a workshop!"
        case Role.Panelist:
            return "Thank you for being a panelist!"
        default:
            return `Thank you for ${Case.sentence(role).toLowerCase()}ing!`
    }
}

const getMemberId: http.RequestListener = async (request: http.IncomingMessage, response) => {
    const match = request.url?.match(
        /\/getUser\/(?<username>[0-9a-zA-Z%]+)\/(?<discriminator>[0-9]{4})$/u,
    )
    const username = match?.groups?.username
        ? decodeURIComponent(match.groups.username)
        : undefined
    const discriminator = match?.groups?.discriminator

    if (username && discriminator) {
        const _guild = (guild ??=
            client.guilds.cache.find((cacheGuild) => cacheGuild.id === guildId) ??
            (await client.guilds.fetch(guildId)))

        let user = _guild.members.cache.find(
            ({user: _user}) =>
                _user.username === username && _user.discriminator === discriminator,
        )?.user

        if (user === undefined) {
            user = (await _guild.members.fetch()).find(
                ({user: _user}) =>
                    _user.username === username && _user.discriminator === discriminator,
            )?.user
        }

        if (user) {
            response.writeHead(Status.Ok, {
                "Content-Type": "application/json",
            })
            response.end(JSON.stringify(pick(user, "id", "username", "discriminator")))
        } else {
            response.writeHead(Status.NotFound)
            response.end()
        }

        return
    }
}

const sendVerifiedMessage: http.RequestListener = async (request, response) => {
    // Default behaviour: DM user with uid from body
    const rawBody: Uint8Array[] = []
    let uid = ""

    request.on("data", (chunk) => {
        rawBody.push(chunk)
    })

    await new Promise<void>((resolve) => {
        request.on("end", () => {
            uid = Buffer.concat(rawBody).toString("utf-8")

            resolve()
        })
    })

    const user =
        client.users.cache.find((_user) => _user.id === uid) ?? (await client.users.fetch(uid))

    const userInfo = await db.participant.findFirst({
        where: {
            discord: {
                uid,
            },
        },
    })

    if (userInfo) {
        await user?.send(
            `Thank you for verifying, ${
                userInfo.name
            }! I'll give you the roles for ${Case.sentence(
                userInfo.role ?? "unknown role",
            ).toLowerCase()}s (when I get to it)! ${getConclusionMessage(userInfo.role)}`,
        )
    }

    response.writeHead(Status.NoContent)
    response.end()
}

const server = http.createServer(async (request, response) => {
    try {
        // Get user by username and discriminator from jamhacks server
        if (request.url && /\/getUser\//u.test(request.url) && request.method === "GET") {
            await getMemberId(request, response)

            return
        }

        await sendVerifiedMessage(request, response)
    } catch (err) {
        if (err instanceof DiscordAPIError) {
            response.writeHead(err.httpStatus)
            response.end(err.toString())
        } else {
            response.writeHead(Status.InternalError)
            response.end(String(err))
        }
    }
})

const port = Number(process.env.PORT) || 8383

server.listen(port, () => {
    console.log(`Server running on ${port}`)
})

process.on("exit", () => server.close())
process.on("beforeExit", () => server.close())
process.on("SIGINT", () => server.close())

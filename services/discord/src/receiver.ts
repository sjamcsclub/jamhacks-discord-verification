/**
 * @file a Simple HTTP server which only runs on localhost (8383). It takes the body of the request
 *   as the user id, and DMs the user, telling them their email was successfully verified.
 */

import {Status, pick} from "@luke-zhang-04/utils"
import {client, getGuild} from "."
import {getConclusionMessage, getNewRoles} from "./roles"
import Case from "case"
import {DiscordAPIError} from "discord.js"
import db from "./db"
import http from "http"

const getMemberId: http.RequestListener = async (request, response) => {
    const match = request.url?.match(
        /\/getUserId\/(?<username>[0-9a-zA-Z%]+)\/(?<discriminator>[0-9]{4})$/u,
    )
    const username = match?.groups?.username
        ? decodeURIComponent(match.groups.username)
        : undefined
    const discriminator = match?.groups?.discriminator

    if (username && discriminator) {
        const _guild = await getGuild()

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

const getMemberUsername: http.RequestListener = async (request, response) => {
    const match = request.url?.match(/\/getUsername\/(?<userId>[0-9]+)$/u)
    const userId = match?.groups?.userId

    if (userId) {
        const _guild = await getGuild()

        let user = _guild.members.cache.find(({user: _user}) => _user.id === userId)?.user

        if (user === undefined) {
            user = (await _guild.members.fetch(userId))?.user
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

const postVerification: http.RequestListener = async (request, response) => {
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

    if (!user) {
        response.writeHead(Status.NotFound)
        response.end()

        return
    }

    const userInfo = await db.participant.findFirst({
        where: {
            discord: {
                uid,
            },
        },
        include: {
            discord: true,
        },
    })

    if (userInfo?.discord) {
        const _guild = await getGuild()

        await user.send(
            `Thank you for verifying, ${userInfo.name}! I'll give you the role for ${Case.sentence(
                userInfo.role ?? "unknown role",
            ).toLowerCase()}s! ${getConclusionMessage(userInfo.role)}`,
        )

        const member = _guild.members.cache.find((_member) => _member.user.id === user.id)

        await member?.setNickname(userInfo.name)
        await member?.roles.add(getNewRoles(userInfo.role))
    }

    response.writeHead(Status.NoContent)
    response.end()
}

const server = http.createServer(async (request, response) => {
    try {
        // Get user by username and discriminator from jamhacks server
        if (request.url && request.method === "GET") {
            if (/\/getUserId\//u.test(request.url)) {
                await getMemberId(request, response)
            } else if (/\/getUsername\//u.test(request.url)) {
                await getMemberUsername(request, response)
            }

            return
        }

        await postVerification(request, response)
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

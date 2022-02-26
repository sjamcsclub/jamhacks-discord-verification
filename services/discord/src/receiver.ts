/**
 * @file a Simple HTTP server which only runs on localhost (8383). It takes the body of the request
 *   as the user id, and DMs the user, telling them their email was successfully verified.
 */

import Case from "case"
import {Status} from "@luke-zhang-04/utils"
import {client} from "."
import db from "./db"
import http from "http"
import prisma from "@prisma/client"

// eslint-disable-next-line @typescript-eslint/naming-convention
const {Role} = prisma

const getConclusionMessage = (role: prisma.Role | null): string => {
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

const server = http.createServer(async (request, response) => {
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
        await user.send(
            `Thank you for verifying, ${
                userInfo.name
            }! I'll give you the roles for ${Case.sentence(
                userInfo.role ?? "unknown role",
            ).toLowerCase()}s (when I get to it)! ${getConclusionMessage(userInfo.role)}`,
        )
    }

    response.writeHead(Status.NoContent)
    response.end()
})

const port = Number(process.env.PORT) || 8383

server.listen(port, () => {
    console.log(`Server running on ${port}`)
})

process.on("exit", () => server.close())
process.on("beforeExit", () => server.close())
process.on("SIGINT", () => server.close())

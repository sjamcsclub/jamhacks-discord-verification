import {Status} from "@luke-zhang-04/utils"
import {client} from "."
import db from "./db"
import http from "http"

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

    await user.send(`Thank you for verifying, ${userInfo?.name}!`)

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

import type * as express from "express"
import {Status, inlineTryPromise, pick} from "@luke-zhang-04/utils"
import {dataSchema} from "../schemas"
import db from "../db"
import {decodeAndVerify} from "@luke-zhang-04/utils/node"
import fetch from "node-fetch"
import qs from "query-string"

export const confirm: express.RequestHandler<{
    data: string
}> = async (request, response) => {
    const {data: rawData} = request.params

    const data = await inlineTryPromise(
        async () =>
            await dataSchema.validate(
                decodeAndVerify(rawData, "sha384", process.env.HASH_TOKEN, "base64url"),
            ),
    )

    if (data instanceof Error) {
        return response.status(Status.BadRequest).json(pick(data, "message", "name"))
    }

    const participant = await db.participant.findUnique({
        where: {
            email: data.email,
        },
        include: {
            discord: true,
        },
    })

    if (!participant) {
        return response.status(Status.InternalError).json({
            message: "Couldn't find participant with email",
        })
    } else if (participant.discord) {
        return response.status(Status.Ok).render("alreadyVerified", {
            ...data.discord,
            email: data.email,
            name: participant.name,
        })
    }

    await db.discordUser.create({
        data: {
            uid: data.discord.userId,
            username: data.discord.username,
            discriminator: data.discord.discriminator,
            email: data.email,
        },
    })

    await fetch("http://localhost:8383", {method: "POST", body: data.discord.userId})

    return response.status(Status.NoContent).redirect(
        `/success?${qs.stringify({
            ...data.discord,
            email: data.email,
            name: participant.name,
        })}`,
    )
}

export default confirm

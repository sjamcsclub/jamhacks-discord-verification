import type * as express from "express"
import {decodeAndVerify, fetchWithTimeout} from "@luke-zhang-04/utils/node"
import {Status} from "@luke-zhang-04/utils"
import {dataSchema} from "../schemas"
import db from "../db"
import fetch from "node-fetch"

export const verify: express.RequestHandler<{
    data: string
}> = async (request, response) => {
    const {data: rawData} = request.params

    const data = await dataSchema.validate(
        decodeAndVerify(rawData, "sha384", process.env.HASH_TOKEN, "base64url"),
    )

    const [res, participant] = await Promise.all([
        fetchWithTimeout(data.discord.avatarURL, {method: "GET", timeout: 2500}),
        db.participant.findUnique({
            where: {
                email: data.email,
            },
            include: {
                discord: true,
            },
        }),
    ])

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

    const img = await res.arrayBuffer()

    return response.status(Status.Ok).render("verify", {
        ...data.discord,
        avatarURL: `data:${res.headers.get("content-type")};base64,${Buffer.from(img).toString(
            "base64",
        )}`,
        email: data.email,
        name: participant.name,
        rawData,
    })
}

export default verify
